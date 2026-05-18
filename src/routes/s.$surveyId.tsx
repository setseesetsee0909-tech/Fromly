"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useI18n } from "@/components/formly/I18nProvider";
import { Logo } from "@/components/formly/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchGeo } from "@/lib/geo";
import { toast } from "sonner";

interface Q {
  id: string;
  type: string;
  label: string;
  options: unknown;
  position: number;
}

function isSectionQuestion(question: Q) {
  return question.type === "section";
}

function getSectionDescription(question: Q) {
  if (
    !question.options ||
    typeof question.options !== "object" ||
    Array.isArray(question.options)
  ) {
    return "";
  }

  const description = (question.options as { description?: unknown }).description;
  return typeof description === "string" ? description : "";
}

export function TakeSurveyPage({ surveyId }: { surveyId: string }) {
  const { lang } = useI18n();
  const [survey, setSurvey] = useState<{ title: string; description: string | null } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const copy =
    lang === "mn"
      ? {
          missingAnswers: "Бүх асуултад хариулна уу",
          error: "Алдаа",
          notFoundTitle: "Судалгаа олдсонгүй",
          notFoundDesc: "Энэ холбоос буруу эсвэл судалгаа нийтлэгдээгүй байна.",
          home: "Нүүр",
          thanksTitle: "Баярлалаа!",
          thanksDesc: "Таны хариулт амжилттай илгээгдлээ.",
          backHome: "Нүүр хуудас",
          answerPlaceholder: "Хариултаа бичнэ үү...",
          submit: "Илгээх",
          required: "Заавал",
          introTitle: "Судалгааны заавар",
          introDesc: "Доорх асуултуудад дарааллаар нь хариулна уу.",
        }
      : {
          missingAnswers: "Please answer every question before submitting",
          error: "Something went wrong",
          notFoundTitle: "Survey not found",
          notFoundDesc: "This link is invalid or the survey is not currently published.",
          home: "Home",
          thanksTitle: "Thank you!",
          thanksDesc: "Your response has been submitted successfully.",
          backHome: "Back to home",
          answerPlaceholder: "Write your answer...",
          submit: "Submit",
          required: "Required",
          introTitle: "Survey guide",
          introDesc: "Please answer the questions below in order.",
        };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [surveyResult, questionResult] = await Promise.all([
          supabase
            .from("surveys")
            .select("title, description, is_published")
            .eq("id", surveyId)
            .maybeSingle(),
          supabase
            .from("questions")
            .select("id, type, label, options, position")
            .eq("survey_id", surveyId)
            .order("position"),
        ]);

        const surveyRow = surveyResult.data;
        if (!active) {
          return;
        }

        if (!surveyRow || !surveyRow.is_published) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setSurvey(surveyRow);
        setQuestions(questionResult.data ?? []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load public survey", error);
        if (!active) {
          return;
        }

        setNotFound(true);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [surveyId]);

  const answerableQuestions = useMemo(
    () => questions.filter((question) => !isSectionQuestion(question)),
    [questions],
  );

  const submit = async () => {
    const missing = answerableQuestions.filter(
      (question) => answers[question.id] === undefined || answers[question.id] === "",
    );
    if (missing.length > 0) {
      toast.error(copy.missingAnswers);
      return;
    }

    setSubmitting(true);
    try {
      const geo = await fetchGeo();
      const response = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          geo,
          answers: answerableQuestions.map((question) => ({
            questionId: question.id,
            value: answers[question.id] as never,
          })),
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || copy.error);
      }

      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_35%,#ffffff_100%)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_35%,#ffffff_100%)] p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">{copy.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.notFoundDesc}</p>
          <Button asChild className="mt-4">
            <Link href="/">{copy.home}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_35%,#ffffff_100%)] p-6">
        <Card className="max-w-md p-10 text-center">
          <div className="mx-auto inline-flex rounded-full bg-primary/10 p-4 text-primary">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{copy.thanksTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.thanksDesc}</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/">{copy.backHome}</Link>
          </Button>
          <p className="mt-6 text-[10px] uppercase tracking-wide text-muted-foreground">
            Made with Formly
          </p>
        </Card>
      </div>
    );
  }

  const answered = answerableQuestions.filter(
    (question) => answers[question.id] !== undefined && answers[question.id] !== "",
  ).length;
  const progress = answerableQuestions.length ? (answered / answerableQuestions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_35%,#ffffff_100%)]">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="text-xs font-medium text-muted-foreground">
            {answered}/{answerableQuestions.length}
          </span>
        </div>
        <div className="h-1 w-full bg-primary/12">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <Card className="overflow-hidden border-primary/20 bg-white shadow-sm">
          <div className="h-4 bg-gradient-to-r from-primary via-blue-500 to-sky-400" />
          <div className="space-y-4 p-6 md:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{survey.title}</h1>
            {survey.description && (
              <p className="max-w-2xl text-sm leading-6 text-slate-600">{survey.description}</p>
            )}
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
              <p className="text-sm font-semibold text-primary">{copy.introTitle}</p>
              <p className="mt-1 text-sm text-primary/80">{copy.introDesc}</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 space-y-4">
          {questions.map((question) => {
            if (isSectionQuestion(question)) {
              return (
                <Card
                  key={question.id}
                  className="overflow-hidden border-primary/20 bg-white shadow-sm"
                >
                  <div className="h-3 bg-gradient-to-r from-primary to-sky-400" />
                  <div className="space-y-3 p-5 md:p-6">
                    <h2 className="text-xl font-bold text-slate-900">{question.label}</h2>
                    {getSectionDescription(question) && (
                      <p className="text-sm leading-6 text-slate-600">
                        {getSectionDescription(question)}
                      </p>
                    )}
                  </div>
                </Card>
              );
            }

            const questionNumber =
              answerableQuestions.findIndex((entry) => entry.id === question.id) + 1;

            return (
              <Card key={question.id} className="border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-7 text-slate-900">
                    {questionNumber}. {question.label}
                  </p>
                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                    {copy.required}
                  </span>
                </div>
                <div className="mt-5">
                  {question.type === "text" && (
                    <Textarea
                      value={(answers[question.id] as string) || ""}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                      }
                      placeholder={copy.answerPlaceholder}
                      rows={4}
                      className="rounded-xl border-slate-300 focus-visible:ring-primary"
                    />
                  )}
                  {question.type === "multiple_choice" && (
                    <div className="space-y-3">
                      {((question.options as string[]) || []).map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            answers[question.id] === option
                              ? "border-primary bg-primary/5"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option}
                            onChange={() =>
                              setAnswers((current) => ({ ...current, [question.id]: option }))
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm text-slate-800">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {question.type === "rating" && (
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setAnswers((current) => ({ ...current, [question.id]: value }))
                          }
                          className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                            (answers[question.id] as number) >= value
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Star className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <Button onClick={submit} disabled={submitting} size="lg" className="mt-6 w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {copy.submit}
        </Button>
      </main>
    </div>
  );
}
