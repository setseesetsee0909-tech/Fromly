import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/formly/AuthProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/surveys/new")({
  head: () => ({ meta: [{ title: "Шинэ судалгаа — Formly" }] }),
  component: NewSurvey,
});

type QType = "multiple_choice" | "text" | "rating";

interface QDraft {
  id: string;
  type: QType;
  label: string;
  options: string[];
}

const newId = () => Math.random().toString(36).slice(2);

function NewSurvey() {
  const { user } = useAuth();
  const { plan, limits } = usePlan();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QDraft[]>([
    { id: newId(), type: "text", label: "", options: [] },
  ]);
  const [busy, setBusy] = useState(false);

  const addQ = () =>
    setQuestions((q) => [...q, { id: newId(), type: "text", label: "", options: [] }]);
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQ = (id: string, patch: Partial<QDraft>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Гарчиг шаардлагатай");
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      toast.error("Бүх асуултын нэр бөглөнө үү");
      return;
    }
    // Free plan: 3 survey limit
    if (plan === "free") {
      const { count } = await supabase
        .from("surveys")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      if ((count ?? 0) >= limits.surveys) {
        toast.error(t("limit.surveysReached"));
        navigate({ to: "/pricing" });
        return;
      }
    }
    setBusy(true);
    try {
      const { data: survey, error } = await supabase
        .from("surveys")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          is_published: publish,
        })
        .select()
        .single();
      if (error) throw error;

      const rows = questions.map((q, i) => ({
        survey_id: survey.id,
        type: q.type,
        label: q.label.trim(),
        options: q.type === "multiple_choice" ? q.options.filter((o) => o.trim()) : [],
        position: i,
      }));
      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) throw qErr;

      toast.success(publish ? "Нийтлэгдлээ" : "Хадгалагдлаа");
      navigate({ to: "/surveys/$id/analytics", params: { id: survey.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Шинэ судалгаа</h1>
        <p className="text-sm text-muted-foreground">Create Survey</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Гарчиг / Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Жишээ нь: Хэрэглэгчийн сэтгэл ханамжийн судалгаа"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Тайлбар / Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Энэ судалгааны зорилго..."
            rows={3}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-start gap-3">
              <GripVertical className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Асуулт {idx + 1}
                  </span>
                  <div className="flex-1" />
                  <Select
                    value={q.type}
                    onValueChange={(v) =>
                      updateQ(q.id, { type: v as QType, options: v === "multiple_choice" ? ["", ""] : [] })
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Текст / Text</SelectItem>
                      <SelectItem value="multiple_choice">Олон сонголт</SelectItem>
                      <SelectItem value="rating">Үнэлгээ (1-5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQ(q.id)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={q.label}
                  onChange={(e) => updateQ(q.id, { label: e.target.value })}
                  placeholder="Асуултаа бичнэ үү..."
                />
                {q.type === "multiple_choice" && (
                  <div className="space-y-2 pl-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{oi + 1}.</span>
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...q.options];
                            next[oi] = e.target.value;
                            updateQ(q.id, { options: next });
                          }}
                          placeholder={`Сонголт ${oi + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateQ(q.id, { options: q.options.filter((_, i) => i !== oi) })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQ(q.id, { options: [...q.options, ""] })}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Сонголт нэмэх
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={addQ}>
          <Plus className="mr-2 h-4 w-4" /> Асуулт нэмэх
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ноорог хадгалах
        </Button>
        <Button onClick={() => save(true)} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Нийтлэх
        </Button>
      </div>
    </div>
  );
}