"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type QType = "multiple_choice" | "text" | "rating" | "section";

interface QDraft {
  id: string;
  type: QType;
  label: string;
  options: string[];
  description: string;
}

const newId = () => Math.random().toString(36).slice(2);

const emptyQuestion = (): QDraft => ({
  id: newId(),
  type: "text",
  label: "",
  options: [],
  description: "",
});

const emptySection = (): QDraft => ({
  id: newId(),
  type: "section",
  label: "",
  options: [],
  description: "",
});

export function NewSurveyPage() {
  const { user } = useAuth();
  const { plan, limits } = usePlan();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QDraft[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);

  const copy =
    lang === "mn"
      ? {
          title: "Шинэ судалгаа",
          subtitle: "Create Survey",
          overview: "Overview",
          questions: "Questions",
          status: "Status",
          draft: "Draft",
          type: "Type",
          form: "Form",
          surveyTitle: "Гарчиг",
          surveyTitlePlaceholder: "Жишээ нь: Хэрэглэгчийн сэтгэл ханамжийн судалгаа",
          description: "Тайлбар",
          descriptionPlaceholder: "Энэ судалгааны зорилго...",
          question: "Асуулт",
          text: "Текст",
          multipleChoice: "Олон сонголт",
          rating: "Үнэлгээ (1-5)",
          section: "Хэсэг / гарчиг",
          questionPlaceholder: "Асуултаа бичнэ үү...",
          sectionPlaceholder: "Хэсгийн гарчиг...",
          sectionDescription: "Хэсгийн тайлбар",
          sectionDescriptionPlaceholder: "Энэ хэсэгт юуг бөглөхийг тайлбарлана уу...",
          optionPlaceholder: (index: number) => `Сонголт ${index + 1}`,
          addOption: "Сонголт нэмэх",
          addQuestion: "Асуулт нэмэх",
          addSection: "Хэсэг нэмэх",
          saveDraft: "Ноорог хадгалах",
          publish: "Нийтлэх",
          titleRequired: "Гарчиг шаардлагатай",
          questionsRequired: "Бүх асуултын нэрийг бөглөнө үү",
          publishedToast: "Судалгааг нийтэллээ",
          savedToast: "Судалгааг хадгаллаа",
          saveAndShare: "Нийтлээд тараах",
        }
      : {
          title: "New survey",
          subtitle: "Create and configure a new survey",
          overview: "Overview",
          questions: "Questions",
          status: "Status",
          draft: "Draft",
          type: "Type",
          form: "Form",
          surveyTitle: "Title",
          surveyTitlePlaceholder: "For example: Customer satisfaction survey",
          description: "Description",
          descriptionPlaceholder: "What is this survey about?",
          question: "Question",
          text: "Text",
          multipleChoice: "Multiple choice",
          rating: "Rating (1-5)",
          section: "Section break",
          questionPlaceholder: "Write your question...",
          sectionPlaceholder: "Section title...",
          sectionDescription: "Section description",
          sectionDescriptionPlaceholder: "Explain what respondents should answer in this section...",
          optionPlaceholder: (index: number) => `Option ${index + 1}`,
          addOption: "Add option",
          addQuestion: "Add question",
          addSection: "Add section",
          saveDraft: "Save draft",
          publish: "Publish",
          titleRequired: "A survey title is required",
          questionsRequired: "Please fill in every question label",
          publishedToast: "Survey published",
          savedToast: "Survey saved",
          saveAndShare: "Publish and share",
        };

  const addQuestion = () => setQuestions((current) => [...current, emptyQuestion()]);
  const addSection = () => setQuestions((current) => [...current, emptySection()]);
  const removeQ = (id: string) =>
    setQuestions((current) => current.filter((question) => question.id !== id));
  const updateQ = (id: string, patch: Partial<QDraft>) =>
    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!title.trim()) {
      toast.error(copy.titleRequired);
      return;
    }
    if (questions.some((question) => !question.label.trim())) {
      toast.error(copy.questionsRequired);
      return;
    }

    if (plan === "free") {
      const { count } = await supabase
        .from("surveys")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      if ((count ?? 0) >= limits.surveys) {
        toast.error(t("limit.surveysReached"));
        router.push("/pricing");
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

      const rows = questions.map((question, index) => ({
        survey_id: survey.id,
        type: question.type,
        label: question.label.trim(),
        options:
          question.type === "multiple_choice"
            ? question.options.filter((option) => option.trim())
            : question.type === "section"
              ? { description: question.description.trim() }
              : [],
        position: index,
      }));

      const { error: questionError } = await supabase.from("questions").insert(rows);
      if (questionError) throw questionError;

      toast.success(publish ? copy.publishedToast : copy.savedToast);
      router.push(`/surveys/${survey.id}/analytics${publish ? "?share=1" : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Card className="border-dashed bg-muted/30 p-5">
          <p className="text-sm font-medium">{copy.overview}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">{copy.questions}</p>
              <p className="text-lg font-semibold">{questions.length}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">{copy.status}</p>
              <p className="text-sm font-semibold">{copy.draft}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">{copy.type}</p>
              <p className="text-sm font-semibold">{copy.form}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-1.5">
            <Label>{copy.surveyTitle}</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.surveyTitlePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{copy.description}</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.descriptionPlaceholder}
              rows={4}
              className="min-h-[112px]"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <Card
            key={question.id}
            className={question.type === "section" ? "border-primary/30 bg-primary/[0.03] p-5 md:p-6" : "p-5 md:p-6"}
          >
            <div className="flex items-start gap-3">
              <GripVertical className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {copy.question} {index + 1}
                  </span>
                  <div className="flex-1" />
                  <Select
                    value={question.type}
                    onValueChange={(value) =>
                      updateQ(question.id, {
                        type: value as QType,
                        options: value === "multiple_choice" ? ["", ""] : [],
                        description: value === "section" ? question.description : "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{copy.text}</SelectItem>
                      <SelectItem value="multiple_choice">{copy.multipleChoice}</SelectItem>
                      <SelectItem value="rating">{copy.rating}</SelectItem>
                      <SelectItem value="section">{copy.section}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQ(question.id)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={question.label}
                  onChange={(event) => updateQ(question.id, { label: event.target.value })}
                  placeholder={
                    question.type === "section" ? copy.sectionPlaceholder : copy.questionPlaceholder
                  }
                />
                {question.type === "section" && (
                  <div className="space-y-1.5">
                    <Label>{copy.sectionDescription}</Label>
                    <Textarea
                      value={question.description}
                      onChange={(event) => updateQ(question.id, { description: event.target.value })}
                      placeholder={copy.sectionDescriptionPlaceholder}
                      rows={3}
                    />
                  </div>
                )}
                {question.type === "multiple_choice" && (
                  <div className="space-y-2 pl-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={`${question.id}-${optionIndex}`}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground">{optionIndex + 1}.</span>
                        <Input
                          value={option}
                          onChange={(event) => {
                            const next = [...question.options];
                            next[optionIndex] = event.target.value;
                            updateQ(question.id, { options: next });
                          }}
                          placeholder={copy.optionPlaceholder(optionIndex)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateQ(question.id, {
                              options: question.options.filter((_, idx) => idx !== optionIndex),
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQ(question.id, { options: [...question.options, ""] })}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> {copy.addOption}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" /> {copy.addQuestion}
        </Button>
        <Button variant="outline" className="w-full" onClick={addSection}>
          <Plus className="mr-2 h-4 w-4" /> {copy.addSection}
        </Button>
      </div>

      <div className="flex justify-end gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <Button variant="outline" onClick={() => save(false)} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {copy.saveDraft}
        </Button>
        <Button onClick={() => save(true)} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lang === "mn" ? copy.saveAndShare : copy.publish}
        </Button>
      </div>
    </div>
  );
}
