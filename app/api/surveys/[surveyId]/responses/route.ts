import { NextResponse } from "next/server";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface GeoPayload {
  country?: unknown;
  region?: unknown;
  city?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface AnswerPayload {
  questionId?: unknown;
  value?: Json;
}

interface SubmitPayload {
  answers?: AnswerPayload[];
  geo?: GeoPayload;
}

function getOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request, context: { params: Promise<{ surveyId: string }> }) {
  try {
    const { surveyId } = await context.params;
    const body = (await request.json()) as SubmitPayload;
    const submittedAnswers = Array.isArray(body.answers) ? body.answers : [];
    const answers = submittedAnswers.filter(
      (answer): answer is { questionId: string; value: Json } =>
        typeof answer.questionId === "string" && answer.questionId.length > 0,
    );

    if (!surveyId) {
      return NextResponse.json({ error: "Missing survey id." }, { status: 400 });
    }

    if (answers.length === 0) {
      return NextResponse.json({ error: "At least one answer is required." }, { status: 400 });
    }

    const questionIds = [...new Set(answers.map((answer) => answer.questionId))];

    const [surveyResult, questionResult] = await Promise.all([
      supabaseAdmin
        .from("surveys")
        .select("id")
        .eq("id", surveyId)
        .eq("is_published", true)
        .maybeSingle(),
      supabaseAdmin.from("questions").select("id").eq("survey_id", surveyId).in("id", questionIds),
    ]);

    if (surveyResult.error) {
      return NextResponse.json({ error: surveyResult.error.message }, { status: 500 });
    }

    if (!surveyResult.data) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    if (questionResult.error) {
      return NextResponse.json({ error: questionResult.error.message }, { status: 500 });
    }

    const validQuestionIds = new Set((questionResult.data ?? []).map((question) => question.id));
    const hasInvalidQuestion = questionIds.some((questionId) => !validQuestionIds.has(questionId));

    if (hasInvalidQuestion) {
      return NextResponse.json({ error: "Invalid survey question." }, { status: 400 });
    }

    const geo = body.geo ?? {};
    const { data: responseRow, error: responseError } = await supabaseAdmin
      .from("responses")
      .insert({
        survey_id: surveyId,
        country: getOptionalString(geo.country),
        region: getOptionalString(geo.region),
        city: getOptionalString(geo.city),
        lat: getOptionalNumber(geo.lat),
        lng: getOptionalNumber(geo.lng),
      })
      .select("id")
      .single();

    if (responseError) {
      return NextResponse.json({ error: responseError.message }, { status: 500 });
    }

    const { error: answersError } = await supabaseAdmin.from("answers").insert(
      answers.map((answer) => ({
        response_id: responseRow.id,
        question_id: answer.questionId,
        value: answer.value,
      })),
    );

    if (answersError) {
      await supabaseAdmin.from("responses").delete().eq("id", responseRow.id);
      return NextResponse.json({ error: answersError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit survey response.",
      },
      { status: 500 },
    );
  }
}
