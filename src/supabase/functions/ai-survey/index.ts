import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const surveySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["multiple_choice", "text", "rating"] },
          label: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["type", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "description", "questions"],
  additionalProperties: false,
} as const;

type Provider = "openai" | "gemini" | "lovable";
type QuestionType = "multiple_choice" | "text" | "rating";

type GeneratedSurvey = {
  title: string;
  description: string;
  questions: Array<{
    type: QuestionType;
    label: string;
    options?: string[];
  }>;
};

function isPlaceholderAiKey(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized === "your-real-key-here" ||
    normalized === "your-ai-service-api-key" ||
    normalized === "your-gemini-api-key" ||
    normalized === "your-api-key" ||
    normalized === "sk-..." ||
    normalized.startsWith("your-")
  );
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readFirstEnv(candidates: Array<string | undefined>) {
  for (const value of candidates) {
    const normalized = normalizeEnvValue(value);
    if (normalized && !isPlaceholderAiKey(normalized)) {
      return normalized;
    }
  }

  return "";
}

function readConfiguredProvider(): Provider | "" {
  const value = normalizeEnvValue(Deno.env.get("AI_PROVIDER")).toLowerCase();
  if (value === "google") {
    return "gemini";
  }

  if (value === "openai" || value === "gemini" || value === "lovable") {
    return value as Provider;
  }

  return "";
}

function readOpenAiKey() {
  return readFirstEnv([Deno.env.get("OPENAI_API_KEY")]);
}

function readAiGatewayKey() {
  return readFirstEnv([
    Deno.env.get("LOVABLE_API_KEY"),
    Deno.env.get("AI_GATEWAY_API_KEY"),
    Deno.env.get("AI_SURVEY_API_KEY"),
  ]);
}

function readGeminiKey() {
  return readFirstEnv([Deno.env.get("GEMINI_API_KEY"), Deno.env.get("GOOGLE_API_KEY")]);
}

function resolveProvider() {
  const preferred = readConfiguredProvider();
  const openAiKey = readOpenAiKey();
  const geminiApiKey = readGeminiKey();
  const lovableApiKey = readAiGatewayKey();

  if (preferred === "openai") {
    return openAiKey ? { provider: "openai" as const, apiKey: openAiKey } : null;
  }

  if (preferred === "gemini") {
    return geminiApiKey ? { provider: "gemini" as const, apiKey: geminiApiKey } : null;
  }

  if (preferred === "lovable") {
    return lovableApiKey ? { provider: "lovable" as const, apiKey: lovableApiKey } : null;
  }

  if (openAiKey) {
    return { provider: "openai" as const, apiKey: openAiKey };
  }

  if (geminiApiKey) {
    return { provider: "gemini" as const, apiKey: geminiApiKey };
  }

  if (lovableApiKey) {
    return { provider: "lovable" as const, apiKey: lovableApiKey };
  }

  return null;
}

function createOpenAiTools() {
  return [
    {
      type: "function",
      function: {
        name: "create_survey",
        description: "Create a survey with title, description, and questions.",
        parameters: surveySchema,
      },
    },
  ];
}

function sanitizeGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeGeminiSchema);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "additionalProperties")
        .map(([key, nestedValue]) => [key, sanitizeGeminiSchema(nestedValue)]),
    );
  }

  return value;
}

function createGeminiTools() {
  return [
    {
      functionDeclarations: [
        {
          name: "create_survey",
          description: "Create a survey with title, description, and questions.",
          parameters: sanitizeGeminiSchema(surveySchema),
        },
      ],
    },
  ];
}

function buildSystemPrompt() {
  return "You are a survey design expert. Generate practical, well-structured surveys in the language of the user's prompt. Aim for 4-7 questions, mix question types when appropriate. For multiple_choice, provide 3-5 options.";
}

function buildMessages(prompt: string) {
  return [
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    { role: "user", content: prompt },
  ];
}

function normalizeSurvey(payload: unknown): GeneratedSurvey {
  const raw = payload as Partial<GeneratedSurvey> | null | undefined;
  const questions = Array.isArray(raw?.questions) ? raw.questions : [];

  return {
    title: typeof raw?.title === "string" ? raw.title : "",
    description: typeof raw?.description === "string" ? raw.description : "",
    questions: questions
      .map((question) => ({
        type:
          question?.type === "multiple_choice" ||
          question?.type === "text" ||
          question?.type === "rating"
            ? question.type
            : "text",
        label: typeof question?.label === "string" ? question.label : "",
        options:
          question?.type === "multiple_choice" && Array.isArray(question.options)
            ? question.options.filter((option): option is string => typeof option === "string")
            : undefined,
      }))
      .filter((question) => question.label.trim().length > 0),
  };
}

async function parseJsonResponse(resp: Response) {
  const text = await resp.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return text;
  }
}

function extractProviderErrorMessage(details: unknown) {
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object") {
    const maybeError = (details as { error?: { message?: unknown } }).error;
    if (maybeError && typeof maybeError === "object" && typeof maybeError.message === "string") {
      return maybeError.message;
    }

    const maybeMessage = (details as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  return "";
}

async function callOpenAI(prompt: string, apiKey: string) {
  const model = normalizeEnvValue(Deno.env.get("OPENAI_MODEL")) || "gpt-4o-mini";
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(prompt),
      tools: createOpenAiTools(),
      tool_choice: { type: "function", function: { name: "create_survey" } },
    }),
  });

  if (!resp.ok) {
    const details = await parseJsonResponse(resp);
    const providerMessage = extractProviderErrorMessage(details);
    console.error("OpenAI error", resp.status, details);

    if (resp.status === 401 || resp.status === 403) {
      return {
        error: providerMessage
          ? `OpenAI access aldaa: ${providerMessage}`
          : "OpenAI key huchingui esvel zovshoorolgui baina. `OPENAI_API_KEY`-ee shalgaad function-ee dahin ajilluulna uu.",
        status: resp.status,
      };
    }

    if (resp.status === 429) {
      const lowered = providerMessage.toLowerCase();
      if (
        lowered.includes("quota") ||
        lowered.includes("billing") ||
        lowered.includes("insufficient")
      ) {
        return {
          error:
            "OpenAI credit/billing asuudal baina. Billing-ee idevkhjuulj esvel credit nemeed dahin oroldono uu.",
          status: 429,
        };
      }

      return {
        error: providerMessage
          ? `OpenAI 429 aldaa: ${providerMessage}`
          : "OpenAI huseltiin hyazgaart hursen baina. Tur huleegeerei.",
        status: 429,
      };
    }

    return {
      error: providerMessage
        ? `OpenAI-oor survey uusgehed aldaa garlaa: ${providerMessage}`
        : "OpenAI-oor survey uusgehed aldaa garlaa.",
      status: 500,
    };
  }

  const data = (await resp.json()) as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{
          function?: {
            arguments?: string;
          };
        }>;
      };
    }>;
  };

  const toolArgs = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!toolArgs) {
    return {
      error: "OpenAI hariu butsaasanui.",
      status: 500,
    };
  }

  return { survey: normalizeSurvey(JSON.parse(toolArgs)) };
}

async function callGemini(prompt: string, apiKey: string) {
  const model = normalizeEnvValue(Deno.env.get("GEMINI_MODEL")) || "gemini-2.5-flash";
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: createGeminiTools(),
        toolConfig: {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: ["create_survey"],
          },
        },
      }),
    },
  );

  if (!resp.ok) {
    const details = await parseJsonResponse(resp);
    const providerMessage = extractProviderErrorMessage(details);
    console.error("Gemini error", resp.status, details);

    if (resp.status === 401 || resp.status === 403) {
      return {
        error: providerMessage
          ? `Gemini access aldaa: ${providerMessage}`
          : "Gemini key huchingui esvel zovshoorolgui baina. `GEMINI_API_KEY`-ee shalgaad function-ee dahin ajilluulna uu.",
        status: resp.status,
      };
    }

    if (resp.status === 429) {
      return {
        error: providerMessage
          ? `Gemini 429 aldaa: ${providerMessage}`
          : "Gemini free tier huseltiin hyazgaart hursen baina. Tur huleegeed dahin oroldono uu.",
        status: 429,
      };
    }

    if (resp.status === 400) {
      return {
        error: providerMessage
          ? `Gemini tohirgoo aldaa: ${providerMessage}`
          : "Gemini huselt buruu baina. `GEMINI_MODEL` ba API key-ee shalgaad dahin oroldono uu.",
        status: 400,
      };
    }

    return {
      error: providerMessage
        ? `Gemini-oor survey uusgehed aldaa garlaa: ${providerMessage}`
        : "Gemini-oor survey uusgehed aldaa garlaa.",
      status: 500,
    };
  }

  const data = (await resp.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          functionCall?: {
            args?: unknown;
          };
        }>;
      };
    }>;
  };

  const functionCall = data.candidates?.[0]?.content?.parts?.find(
    (part) => part.functionCall,
  )?.functionCall;
  if (!functionCall?.args) {
    return {
      error: "Gemini hariu butsaasanui.",
      status: 500,
    };
  }

  return { survey: normalizeSurvey(functionCall.args) };
}

async function callLovableGateway(prompt: string, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: buildMessages(prompt),
      tools: createOpenAiTools(),
      tool_choice: { type: "function", function: { name: "create_survey" } },
    }),
  });

  if (!resp.ok) {
    const details = await parseJsonResponse(resp);
    console.error("AI gateway error", resp.status, details);

    if (resp.status === 401 || resp.status === 403) {
      return {
        error:
          "AI gateway key huchingui esvel zovshoorolgui baina. `LOVABLE_API_KEY`-ee shalgaad function-ee dahin ajilluulna uu.",
        status: resp.status,
      };
    }

    if (resp.status === 429) {
      return {
        error: "Huselt het olon baina. Tur huleegeerei.",
        status: 429,
      };
    }

    if (resp.status === 402) {
      return {
        error: "AI credit duussan baina. Gateway account-aa shalgana uu.",
        status: 402,
      };
    }

    return {
      error: "AI gateway-aar survey uusgehed aldaa garlaa.",
      status: 500,
    };
  }

  const data = (await resp.json()) as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{
          function?: {
            arguments?: string;
          };
        }>;
      };
    }>;
  };

  const toolArgs = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!toolArgs) {
    return {
      error: "AI hariu butsaasanui.",
      status: 500,
    };
  }

  return { survey: normalizeSurvey(JSON.parse(toolArgs)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providerConfig = resolveProvider();
    if (!providerConfig) {
      return new Response(
        JSON.stringify({
          error:
            "AI provider tohiruulagdaagui baina. `OPENAI_API_KEY`, `GEMINI_API_KEY`, esvel `LOVABLE_API_KEY` secret hiigeed function-ee dahin ajilluulna uu.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result =
      providerConfig.provider === "openai"
        ? await callOpenAI(prompt, providerConfig.apiKey)
        : providerConfig.provider === "gemini"
          ? await callGemini(prompt, providerConfig.apiKey)
          : await callLovableGateway(prompt, providerConfig.apiKey);

    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ survey: result.survey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-survey error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
