import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/formly/Logo";
import { Loader2, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/s/$surveyId")({
  head: () => ({ meta: [{ title: "Судалгаа — Formly" }] }),
  component: TakeSurvey,
});

interface Q {
  id: string;
  type: string;
  label: string;
  options: unknown;
  position: number;
}

function TakeSurvey() {
  const { surveyId } = Route.useParams();
  const [survey, setSurvey] = useState<{ title: string; description: string | null } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("surveys")
        .select("title, description, is_published")
        .eq("id", surveyId)
        .maybeSingle();
      if (!s || !s.is_published) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSurvey(s);
      const { data: qs } = await supabase
        .from("questions")
        .select("id, type, label, options, position")
        .eq("survey_id", surveyId)
        .order("position");
      setQuestions(qs ?? []);
      setLoading(false);
    })();
  }, [surveyId]);

  const submit = async () => {
    const missing = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === "");
    if (missing.length) {
      toast.error("Бүх асуултад хариулна уу");
      return;
    }
    setSubmitting(true);
    try {
      const { data: resp, error } = await supabase
        .from("responses")
        .insert({ survey_id: surveyId })
        .select()
        .single();
      if (error) throw error;
      const rows = questions.map((q) => ({
        response_id: resp.id,
        question_id: q.id,
        value: answers[q.id] as never,
      }));
      const { error: aErr } = await supabase.from("answers").insert(rows);
      if (aErr) throw aErr;
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа");
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
          <h1 className="text-xl font-bold">Судалгаа олдсонгүй</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Энэ холбоос буруу эсвэл судалгаа нийтэлгдээгүй байна.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Нүүр</Link>
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
          <h1 className="mt-4 text-2xl font-bold">Баярлалаа!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Таны хариулт амжилттай илгээгдлээ.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">Нүүр хуудас</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const answered = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
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
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{survey.title}</h1>
        {survey.description && (
          <p className="mt-2 text-muted-foreground">{survey.description}</p>
        )}

        <div className="mt-8 space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id} className="p-6">
              <p className="font-semibold">
                {i + 1}. {q.label}
              </p>
              <div className="mt-4">
                {q.type === "text" && (
                  <Textarea
                    value={(answers[q.id] as string) || ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Хариултаа бичнэ үү..."
                    rows={3}
                  />
                )}
                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {((q.options as string[]) || []).map((opt) => (
                      <label
                        key={opt}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50 ${
                          answers[q.id] === opt ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className="accent-primary"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border transition ${
                          (answers[q.id] as number) >= n
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
          Илгээх
        </Button>
      </main>
    </div>
  );
}