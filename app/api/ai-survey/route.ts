import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

  if (!LOVABLE_API_KEY) {
    return NextResponse.json(
      { error: "LOVABLE_API_KEY not configured" },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "create_survey",
        description: "Create a survey with title, description, and questions.",
        parameters: {
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
        },
      },
    },
  ];

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a survey design expert. Generate practical, well-structured surveys in the language of the user's prompt. Aim for 4-7 questions, mix question types when appropriate. For multiple_choice, provide 3-5 options.",
          },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_survey" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return NextResponse.json(
          { error: "Хүсэлт хэт олон, түр хүлээгээрэй." },
          { status: 429, headers: corsHeaders },
        );
      }
      if (resp.status === 402) {
        return NextResponse.json(
          { error: "AI кредит дууссан. Workspace-д кредит нэмнэ үү." },
          { status: 402, headers: corsHeaders },
        );
      }
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return NextResponse.json(
        { error: "AI үүсгэхэд алдаа гарлаа" },
        { status: 500, headers: corsHeaders },
      );
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return NextResponse.json(
        { error: "AI хариу буцаасангүй" },
        { status: 500, headers: corsHeaders },
      );
    }

    const survey = JSON.parse(toolCall.function.arguments);
    return NextResponse.json({ survey }, { headers: corsHeaders });
  } catch (e) {
    console.error("ai-survey error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
