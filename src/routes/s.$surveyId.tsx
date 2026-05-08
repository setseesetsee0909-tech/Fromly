"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
        };

  useEffect(() => {
    void (async () => {
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
      if (!surveyRow || !surveyRow.is_published) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSurvey(surveyRow);
      setQuestions(questionResult.data ?? []);
      setLoading(false);
    })();
  }, [surveyId]);

  const submit = async () => {
    const missing = questions.filter(
      (question) => answers[question.id] === undefined || answers[question.id] === "",
    );
    if (missing.length > 0) {
      toast.error(copy.missingAnswers);
      return;
    }

    setSubmitting(true);
    try {
      const geo = await fetchGeo();
      const { data: response, error } = await supabase
        .from("responses")
        .insert({
          survey_id: surveyId,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          lat: geo.lat,
          lng: geo.lng,
        })
        .select()
        .single();
      if (error) throw error;

      const rows = questions.map((question) => ({
        response_id: response.id,
        question_id: question.id,
        value: answers[question.id] as never,
      }));
      const { error: answerError } = await supabase.from("answers").insert(rows);
      if (answerError) throw answerError;
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
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

  const answered = questions.filter(
    (question) => answers[question.id] !== undefined && answers[question.id] !== "",
  ).length;
  const progress = questions.length ? (answered / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="text-xs text-muted-foreground">
            {answered}/{questions.length}
          </span>
        </div>
        <div className="h-1 w-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{survey.title}</h1>
        {survey.description && <p className="mt-2 text-muted-foreground">{survey.description}</p>}

        <div className="mt-8 space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id} className="p-6">
              <p className="font-semibold">
                {index + 1}. {question.label}
              </p>
              <div className="mt-4">
                {question.type === "text" && (
                  <Textarea
                    value={(answers[question.id] as string) || ""}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                    placeholder={copy.answerPlaceholder}
                    rows={3}
                  />
                )}
                {question.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {((question.options as string[]) || []).map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50 ${
                          answers[question.id] === option ? "border-primary bg-primary/5" : ""
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
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {question.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setAnswers((current) => ({ ...current, [question.id]: value }))
                        }
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border transition ${
                          (answers[question.id] as number) >= value
                            ? "border-accent bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Star className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button onClick={submit} disabled={submitting} size="lg" className="mt-6 w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {copy.submit}
        </Button>
      </main>
    </div>
  );
}
