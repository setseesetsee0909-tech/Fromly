import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/formly/AuthProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Wand2, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai")({
  head: () => ({ meta: [{ title: "AI туслах — Formly" }] }),
  component: AIAssistant,
});

interface GeneratedQ {
  type: "multiple_choice" | "text" | "rating";
  label: string;
  options?: string[];
}
interface Generated {
  title: string;
  description: string;
  questions: GeneratedQ[];
}

function AIAssistant() {
  const { user } = useAuth();
  const { limits } = usePlan();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Generated | null>(null);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!limits.aiEnabled) {
      toast.error(t("limit.aiPro"));
      navigate({ to: "/pricing" });
      return;
    }
    if (!prompt.trim()) {
      toast.error("Санаагаа бичнэ үү");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-survey", {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.survey);
      toast.success("Үүсгэгдлээ!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  };

  const useIt = async (publish: boolean) => {
    if (!result || !user) return;
    setSaving(true);
    try {
      const { data: survey, error } = await supabase
        .from("surveys")
        .insert({
          owner_id: user.id,
          title: result.title,
          description: result.description,
          is_published: publish,
        })
        .select()
        .single();
      if (error) throw error;
      const rows = result.questions.map((q, i) => ({
        survey_id: survey.id,
        type: q.type,
        label: q.label,
        options: q.options ?? [],
        position: i,
      }));
      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) throw qErr;
      toast.success("Хадгалагдлаа");
      navigate({ to: "/surveys/$id/analytics", params: { id: survey.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа");
    } finally {
      setSaving(false);
    }
  };

  const examples = [
    "Кофе шопын үйлчилгээний чанарын талаар 5 асуултын судалгаа",
    "Ажилтны сэтгэл ханамжийн жилийн судалгаа",
    "Онлайн дэлгүүрийн NPS судалгаа",
    "Сургалтын чанарын үнэлгээ",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI туслах</h1>
        <p className="text-sm text-muted-foreground">AI Assistant — санаагаа бичээд судалгаа автоматаар үүсгэгдэнэ</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
        {!limits.aiEnabled && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> {t("limit.aiPro")}</span>
            <Button asChild size="sm"><Link to="/pricing">{t("plan.upgrade")}</Link></Button>
          </div>
        )}
        <label className="mb-2 block text-sm font-medium">Та ямар судалгаа үүсгэх вэ?</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Жишээ нь: Кофе шопын үйлчилгээний чанарын талаар 5 асуултын судалгаа..."
          rows={6}
        />
        <Button onClick={generate} disabled={busy} className="mt-4 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "Үүсгэж байна..." : "Үүсгэх"}
        </Button>
        </Card>

        <Card className="p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Жишээ санаа
          </p>
          <div className="space-y-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="w-full rounded-lg border bg-muted/30 p-3 text-left text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-accent/10 p-3 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{result.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.description}</p>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            {result.questions.map((q, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">{q.type}</p>
                <p className="mt-1 font-medium">
                  {i + 1}. {q.label}
                </p>
                {q.options && q.options.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {q.options.map((o, j) => (
                      <li key={j}>• {o}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => useIt(false)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ноорог болгох
            </Button>
            <Button onClick={() => useIt(true)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Нийтлэх
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}