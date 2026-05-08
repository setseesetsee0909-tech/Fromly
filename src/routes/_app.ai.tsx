"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  GripVertical,
  LayoutList,
  Loader2,
  Lock,
  MessageSquareText,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
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

type QType = "multiple_choice" | "text" | "rating";

interface RawGeneratedQ {
  type: QType;
  label: string;
  options?: string[];
}

interface RawGenerated {
  title: string;
  description: string;
  questions: RawGeneratedQ[];
}

interface GeneratedQ {
  id: string;
  type: QType;
  label: string;
  options: string[];
}

interface Generated {
  title: string;
  description: string;
  questions: GeneratedQ[];
}

const newId = () => Math.random().toString(36).slice(2);

const normalizeGeneratedSurvey = (survey: RawGenerated): Generated => ({
  title: survey.title ?? "",
  description: survey.description ?? "",
  questions: (survey.questions ?? []).map((question) => ({
    id: newId(),
    type: question.type,
    label: question.label ?? "",
    options: question.type === "multiple_choice" ? (question.options ?? ["", ""]) : [],
  })),
});

export function AIAssistantPage() {
  const { user } = useAuth();
  const { limits, plan } = usePlan();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Generated | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);

  const addQuestion = () =>
    setResult((current) =>
      current
        ? {
            ...current,
            questions: [
              ...current.questions,
              { id: newId(), type: "text", label: "", options: [] },
            ],
          }
        : current,
    );

  const removeQuestion = (id: string) =>
    setResult((current) =>
      current
        ? {
            ...current,
            questions: current.questions.filter((question) => question.id !== id),
          }
        : current,
    );

  const updateQuestion = (id: string, patch: Partial<GeneratedQ>) =>
    setResult((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === id ? { ...question, ...patch } : question,
            ),
          }
        : current,
    );

  const reorderQuestions = (sourceId: string, targetId: string) =>
    setResult((current) => {
      if (!current || sourceId === targetId) {
        return current;
      }

      const sourceIndex = current.questions.findIndex((question) => question.id === sourceId);
      const targetIndex = current.questions.findIndex((question) => question.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const nextQuestions = [...current.questions];
      const [movedQuestion] = nextQuestions.splice(sourceIndex, 1);
      nextQuestions.splice(targetIndex, 0, movedQuestion);

      return { ...current, questions: nextQuestions };
    });

  const handleDragStart = (questionId: string) => {
    setDraggingQuestionId(questionId);
    setDragOverQuestionId(questionId);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingQuestionId) {
      return;
    }

    reorderQuestions(draggingQuestionId, targetId);
    setDraggingQuestionId(null);
    setDragOverQuestionId(null);
  };

  const resetDragState = () => {
    setDraggingQuestionId(null);
    setDragOverQuestionId(null);
  };

  const generate = async () => {
    if (!user) return;

    // Check AI usage limits
    if (plan === "free") {
      const { count, error } = await supabase
        .from("surveys")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if (error) {
        toast.error(lang === "mn" ? "Алдаа гарлаа" : "Error occurred");
        return;
      }

      if ((count || 0) >= limits.aiSurveyLimit) {
        toast.error(t("limit.aiPro"));
        router.push("/pricing");
        return;
      }
    } else if (!limits.aiEnabled) {
      toast.error(t("limit.aiPro"));
      router.push("/pricing");
      return;
    }

    if (!prompt.trim()) {
      toast.error(
        lang === "mn" ? "Санаагаа бичнэ үү" : "Please describe the survey you want to create",
      );
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/ai-survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (lang === "mn" ? "AI үүсгэхэд алдаа гарлаа" : "Failed to generate AI survey"));
      }

      setResult(normalizeGeneratedSurvey(data.survey as RawGenerated));
      toast.success(lang === "mn" ? "Үүсгэгдлээ!" : "Survey draft generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : lang === "mn" ? "Алдаа" : "Error");
    } finally {
      setBusy(false);
    }
  };

  const saveGeneratedSurvey = async (publish: boolean) => {
    if (!result || !user) {
      return;
    }

    if (!result.title.trim()) {
      toast.error(lang === "mn" ? "Survey гарчиг шаардлагатай" : "A survey title is required");
      return;
    }

    if (result.questions.length === 0) {
      toast.error(lang === "mn" ? "Дор хаяж нэг асуулт нэмнэ үү" : "Add at least one question");
      return;
    }

    if (result.questions.some((question) => !question.label.trim())) {
      toast.error(
        lang === "mn" ? "Бүх асуултын текстийг бөглөнө үү" : "Please enter text for every question",
      );
      return;
    }

    setSaving(true);
    try {
      const { data: survey, error } = await supabase
        .from("surveys")
        .insert({
          owner_id: user.id,
          title: result.title.trim(),
          description: result.description.trim() || null,
          is_published: publish,
        })
        .select()
        .single();
      if (error) {
        throw error;
      }

      const rows = result.questions.map((question, index) => ({
        survey_id: survey.id,
        type: question.type,
        label: question.label.trim(),
        options:
          question.type === "multiple_choice"
            ? question.options.filter((option) => option.trim())
            : [],
        position: index,
      }));
      const { error: questionError } = await supabase.from("questions").insert(rows);
      if (questionError) {
        throw questionError;
      }

      toast.success(lang === "mn" ? "Хадгалагдлаа" : "Survey saved");
      router.push(`/surveys/${survey.id}/analytics${publish ? "?share=1" : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : lang === "mn" ? "Алдаа" : "Error");
    } finally {
      setSaving(false);
    }
  };

  const examples =
    lang === "mn"
      ? [
          "Кофе шопын үйлчилгээний чанарын талаар 5 асуултын судалгаа",
          "Ажилтны сэтгэл ханамжийн жилийн судалгаа",
          "Онлайн дэлгүүрийн NPS судалгаа",
          "Сургалтын чанарын үнэлгээ",
        ]
      : [
          "A 5-question survey about coffee shop service quality",
          "Annual employee satisfaction survey",
          "Online store NPS survey",
          "Training quality evaluation",
        ];

  const copy =
    lang === "mn"
      ? {
          title: "AI туслах",
          subtitle: "AI Assistant",
          promptLabel: "Та ямар судалгаа үүсгэх вэ?",
          promptHint:
            "Зорилго, сэдэв, асуултын тоо, аудиторио бичихэд AI таньд бүтэцтэй survey бэлдэнэ.",
          promptPlaceholder:
            "Жишээ нь: Кофе шопын үйлчилгээний чанарын талаар 5 асуултын судалгаа...",
          previewTitle: "Үүсэх бүтэц",
          previewItems: [
            { icon: FileText, label: "Гарчиг", value: "Судалгааны нэр ба товч тайлбар" },
            { icon: LayoutList, label: "Асуултууд", value: "Text, rating, choice төрлүүд" },
            { icon: Rocket, label: "Бэлэн хувилбар", value: "Ноорог эсвэл шууд нийтлэх боломж" },
          ],
          examplesTitle: "Жишээ санаа",
          flowTitle: "AI хэрхэн ажиллах вэ",
          flowSteps: [
            "Санаагаа энгийнээр тайлбарлаж бичнэ",
            "AI судалгааны бүтэц, асуултуудыг санал болгоно",
            "Та review хийгээд засварлаад хадгална",
          ],
          outputTitle: "Үр дүнд нь юу авах вэ?",
          outputDesc:
            "Судалгааны title, description, асуултын логик дараалал, сонголтуудтай draft автоматаар гарна.",
          outputBullets: [
            "Хэрэглэгчийн санал асуулга",
            "Дотоод багийн үнэлгээ",
            "NPS ба satisfaction survey",
          ],
          helperTitle: "Хурдан эхлэх зөвлөмж",
          helperTips: [
            "Сэдвээ аль болох тодорхой бичээрэй",
            "Хэдэн асуулт хүсэж байгаагаа оруулаарай",
            "Аудитори болон зорилгоо дурдвал илүү сайн",
          ],
          generateIdle: "Үүсгэх",
          generateBusy: "Үүсгэж байна...",
          draft: "Ноорог болгох",
          publish: "Нийтлэх",
          editorTitle: "AI үүсгэсэн survey-г засах",
          editorHint:
            "Save хийхээсээ өмнө асуулт, сонголт, гарчгаа хүссэнээрээ өөрчилж болно. Grip-ээс чирээд дарааллыг солино.",
          addQuestion: "Асуулт нэмэх",
          addOption: "Сонголт нэмэх",
        }
      : {
          title: "AI Assistant",
          subtitle: "AI Assistant",
          promptLabel: "What kind of survey would you like to create?",
          promptHint:
            "Describe the topic, audience, and number of questions and AI will prepare a structured survey for you.",
          promptPlaceholder:
            "For example: a 5-question survey about coffee shop service quality...",
          previewTitle: "What AI will generate",
          previewItems: [
            { icon: FileText, label: "Title", value: "A survey name with a short description" },
            {
              icon: LayoutList,
              label: "Questions",
              value: "Text, rating, and choice question types",
            },
            {
              icon: Rocket,
              label: "Ready draft",
              value: "Save it as a draft or publish it right away",
            },
          ],
          examplesTitle: "Example ideas",
          flowTitle: "How AI works",
          flowSteps: [
            "Describe your idea in plain language",
            "AI suggests the survey structure and questions",
            "Review, edit, and save it",
          ],
          outputTitle: "What you'll get",
          outputDesc:
            "A survey draft with title, description, ordered questions, and options generated automatically.",
          outputBullets: [
            "Customer feedback surveys",
            "Internal team evaluations",
            "NPS and satisfaction research",
          ],
          helperTitle: "Tips for better results",
          helperTips: [
            "Be specific about the topic",
            "Mention how many questions you want",
            "Include audience and survey goal when possible",
          ],
          generateIdle: "Generate",
          generateBusy: "Generating...",
          draft: "Save draft",
          publish: "Publish",
          editorTitle: "Review and edit the AI-generated survey",
          editorHint:
            "Adjust the title, description, questions, and options before saving. Drag the grip handle to reorder questions.",
          addQuestion: "Add question",
          addOption: "Add option",
        };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-6 xl:col-span-3">
          {plan === "free" && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> 
                {lang === "mn" 
                  ? `Үнэгүй хэрэглэгчдэд AI ашиглан 3 судалгаа үүсгэх боломжтой` 
                  : "Free users can create up to 3 surveys with AI"
                }
              </span>
            </div>
          )}
          {!limits.aiEnabled && plan !== "free" && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> {t("limit.aiPro")}
              </span>
              <Button asChild size="sm">
                <Link href="/pricing">{t("plan.upgrade")}</Link>
              </Button>
            </div>
          )}

          <label className="mb-2 block text-sm font-medium">{copy.promptLabel}</label>
          <p className="mb-4 text-sm text-muted-foreground">{copy.promptHint}</p>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={copy.promptPlaceholder}
            rows={6}
            className="min-h-[170px]"
          />
          <Button onClick={generate} disabled={busy} className="mt-4 gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? copy.generateBusy : copy.generateIdle}
          </Button>

          <div className="mt-6 border-t pt-6">
            <p className="mb-3 text-sm font-semibold">{copy.previewTitle}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {copy.previewItems.map((item) => (
                <div key={item.label} className="rounded-xl border bg-primary/[0.03] p-4">
                  <item.icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> {copy.examplesTitle}
            </p>
            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="w-full rounded-lg border bg-muted/30 p-3 text-left text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-primary" /> {copy.flowTitle}
            </p>
            <div className="space-y-3">
              {copy.flowSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm text-foreground/85">{step}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {!result && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{copy.outputTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.outputDesc}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {copy.outputBullets.map((item) => (
                <div key={item} className="rounded-xl border bg-white p-4">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold">{copy.helperTitle}</p>
            <div className="mt-4 space-y-3">
              {copy.helperTips.map((tip) => (
                <div
                  key={tip}
                  className="rounded-xl border bg-primary/[0.03] px-4 py-3 text-sm text-foreground/85"
                >
                  {tip}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {result && (
        <Card className="space-y-6 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{copy.editorTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.editorHint}</p>
            </div>
          </div>

          <Card className="p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={result.title}
                  onChange={(event) =>
                    setResult((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                  placeholder="Enter survey title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={result.description}
                  onChange={(event) =>
                    setResult((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                  placeholder="Enter survey description"
                  rows={4}
                  className="min-h-[112px]"
                />
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {result.questions.map((question, index) => (
              <Card
                key={question.id}
                className={`p-5 transition md:p-6 ${
                  draggingQuestionId === question.id ? "opacity-60" : ""
                } ${dragOverQuestionId === question.id ? "border-primary bg-primary/5" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggingQuestionId && draggingQuestionId !== question.id) {
                    setDragOverQuestionId(question.id);
                  }
                }}
                onDrop={() => handleDrop(question.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      handleDragStart(question.id);
                    }}
                    onDragEnd={resetDragState}
                    className="mt-1 shrink-0 cursor-grab rounded-md p-1 text-muted-foreground transition hover:bg-muted active:cursor-grabbing"
                    title={lang === "mn" ? "Чирж дараалал солих" : "Drag to reorder questions"}
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "mn" ? `Асуулт ${index + 1}` : `Question ${index + 1}`}
                      </span>
                      <div className="flex-1" />
                      <Select
                        value={question.type}
                        onValueChange={(value) =>
                          updateQuestion(question.id, {
                            type: value as QType,
                            options:
                              value === "multiple_choice"
                                ? question.options.length > 0
                                  ? question.options
                                  : ["", ""]
                                : [],
                          })
                        }
                      >
                        <SelectTrigger className="w-full sm:w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="multiple_choice">
                            {lang === "mn" ? "Олон сонголт" : "Multiple choice"}
                          </SelectItem>
                          <SelectItem value="rating">
                            {lang === "mn" ? "Үнэлгээ (1-5)" : "Rating (1-5)"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                        disabled={result.questions.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={question.label}
                      onChange={(event) =>
                        updateQuestion(question.id, { label: event.target.value })
                      }
                      placeholder={
                        lang === "mn" ? "Асуултаа бичнэ үү..." : "Enter your question..."
                      }
                    />
                    {question.type === "multiple_choice" && (
                      <div className="space-y-2 pl-2">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={`${question.id}-${optionIndex}`}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {optionIndex + 1}.
                            </span>
                            <Input
                              value={option}
                              onChange={(event) => {
                                const next = [...question.options];
                                next[optionIndex] = event.target.value;
                                updateQuestion(question.id, { options: next });
                              }}
                              placeholder={
                                lang === "mn"
                                  ? `Сонголт ${optionIndex + 1}`
                                  : `Option ${optionIndex + 1}`
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateQuestion(question.id, {
                                  options: question.options.filter(
                                    (_, currentIndex) => currentIndex !== optionIndex,
                                  ),
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
                          onClick={() =>
                            updateQuestion(question.id, {
                              options: [...question.options, ""],
                            })
                          }
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
          </div>

          <div className="flex justify-end gap-2 rounded-xl border bg-card p-4 shadow-sm">
            <Button variant="outline" onClick={() => saveGeneratedSurvey(false)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {copy.draft}
            </Button>
            <Button onClick={() => saveGeneratedSurvey(true)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {copy.publish}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
