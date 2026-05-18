"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { SurveyShareDialog } from "@/components/formly/SurveyShareDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResponseMap = dynamic(
  () => import("@/components/formly/ResponseMap").then((module) => module.ResponseMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl border bg-muted/30" />,
  },
);

interface Q {
  id: string;
  type: string;
  label: string;
  options: unknown;
  position: number;
}

interface A {
  question_id: string;
  response_id: string;
  value: unknown;
}

interface R {
  id: string;
  submitted_at: string;
  city: string | null;
  country: string | null;
}

function isSectionQuestion(question: Q) {
  return question.type === "section";
}

const CHART_COLORS = ["#2563eb", "#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899"];
const PRIMARY_CHART_COLOR = "#2563eb";

type PieLabelProps = {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  midAngle?: number;
  percent?: number;
};

function renderPieSliceLabel({
  cx = 0,
  cy = 0,
  innerRadius = 0,
  outerRadius = 0,
  midAngle = 0,
  percent = 0,
}: PieLabelProps) {
  if (percent < 0.08) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const angle = (-midAngle * Math.PI) / 180;
  const x = cx + radius * Math.cos(angle);
  const y = cy + radius * Math.sin(angle);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-semibold"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export function AnalyticsPage({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { limits } = usePlan();
  const { t, lang } = useI18n();
  const [survey, setSurvey] = useState<{
    title: string;
    description: string | null;
    is_published: boolean;
  } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<A[]>([]);
  const [responses, setResponses] = useState<R[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [geoPoints, setGeoPoints] = useState<
    { lat: number; lng: number; city: string | null; country: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  const copy =
    lang === "mn"
      ? {
          back: "Буцах",
          noDescription: "Тайлбаргүй",
          published: "Нийтлэгдсэн",
          draft: "Ноорог",
          share: "Илгээх",
          moveToDraft: "Ноорог болгох",
          delete: "Устгах",
          removeConfirm: "Энэ судалгааг устгах уу?",
          removedToast: "Устгалаа",
          publishToast: "Нийтэллээ",
          draftToast: "Ноорог болголоо",
          exportToast: "Excel тайлан татагдлаа",
          exportError: "Excel экспортод алдаа гарлаа",
          notFound: "Судалгаа олдсонгүй",
          totalResponses: "Нийт хариулт",
          totalQuestions: "Асуултын тоо",
          avgAnswers: "Дундаж хариулт",
          mapDesc: "Хариулагчдын газарзүйн тархалт",
          noMapDataTitle: "Газрын зургийн өгөгдөл хараахан алга",
          noMapDataDesc: "Судалгаагаа нийтэлж, хариулт хүлээн аваад дахин шалгана уу.",
          noAnswers: "Хариулт байхгүй",
          avgLabel: "Дундаж",
          responsesSheet: "Responses",
        }
      : {
          back: "Back",
          noDescription: "No description",
          published: "Published",
          draft: "Draft",
          share: "Share",
          moveToDraft: "Move to draft",
          delete: "Delete",
          removeConfirm: "Delete this survey?",
          removedToast: "Survey deleted",
          publishToast: "Survey published",
          draftToast: "Survey moved back to draft",
          exportToast: "Excel export downloaded",
          exportError: "Unable to export the Excel file",
          notFound: "Survey not found",
          totalResponses: "Total responses",
          totalQuestions: "Questions",
          avgAnswers: "Average answers",
          mapDesc: "Where your respondents are located",
          noMapDataTitle: "No map data yet",
          noMapDataDesc: "Publish the survey and collect responses to see location data here.",
          noAnswers: "No responses yet",
          avgLabel: "Average",
          responsesSheet: "Responses",
        };

  const uiCopy =
    lang === "mn"
      ? {
          shareTitle: "Хэрэглэгчдэд явуулах link",
          shareDesc: "Судалгааг бөглөх хүмүүст public form link-ээ илгээнэ.",
          exportTitle: "Excel тайлан",
          exportDesc:
            "Энэ export нь зөвхөн танд зориулагдсан. Хариулагчдад Excel файл бүү явуулаарай.",
          openPublicForm: "Public form нээх",
          exportButton: "Excel татах",
          shareButton: "Form link хуваалцах",
        }
      : {
          shareTitle: "Link for respondents",
          shareDesc: "Send the public form link to people who should fill out the survey.",
          exportTitle: "Excel report",
          exportDesc: "This export is for you only. Do not send the Excel file to respondents.",
          openPublicForm: "Open public form",
          exportButton: "Download Excel",
          shareButton: "Share form link",
        };

  useEffect(() => {
    void (async () => {
      const [surveyResult, questionResult, responseResult] = await Promise.all([
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
        supabase
          .from("responses")
          .select("id, lat, lng, city, country, submitted_at", { count: "exact" })
          .eq("survey_id", surveyId),
      ]);

      const surveyRow = surveyResult.data;
      const questionRows = questionResult.data;
      const responseRows = responseResult.data;
      const count = responseResult.count;

      setSurvey(surveyRow);
      setQuestions(questionRows ?? []);
      setResponseCount(count ?? 0);
      setResponses(
        (responseRows ?? []).map((response) => ({
          id: response.id,
          submitted_at: response.submitted_at,
          city: response.city,
          country: response.country,
        })),
      );
      setGeoPoints(
        (responseRows ?? [])
          .filter(
            (response) => typeof response.lat === "number" && typeof response.lng === "number",
          )
          .map((response) => ({
            lat: response.lat as number,
            lng: response.lng as number,
            city: response.city,
            country: response.country,
          })),
      );

      if (responseRows && responseRows.length > 0) {
        const { data: answerRows } = await supabase
          .from("answers")
          .select("question_id, value, response_id")
          .in(
            "response_id",
            responseRows.map((response) => response.id),
          );
        setAnswers((answerRows as A[]) ?? []);
      } else {
        setAnswers([]);
      }

      setLoading(false);
    })();
  }, [surveyId]);

  useEffect(() => {
    if (searchParams.get("share") === "1") {
      setShareOpen(true);
    }
  }, [searchParams]);

  const togglePublish = async () => {
    if (!survey) return;
    const { error } = await supabase
      .from("surveys")
      .update({ is_published: !survey.is_published })
      .eq("id", surveyId);
    if (error) {
      return toast.error(error.message);
    }
    setSurvey({ ...survey, is_published: !survey.is_published });
    toast.success(survey.is_published ? copy.draftToast : copy.publishToast);
  };

  const remove = async () => {
    if (!confirm(copy.removeConfirm)) {
      return;
    }
    const { error } = await supabase.from("surveys").delete().eq("id", surveyId);
    if (error) {
      return toast.error(error.message);
    }
    toast.success(copy.removedToast);
    router.push("/dashboard");
  };

  const answerableQuestions = questions.filter((question) => !isSectionQuestion(question));
  const publicFormUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const baseUrl = configuredBaseUrl
      ? configuredBaseUrl.replace(/\/$/, "")
      : window.location.origin;
    return `${baseUrl}/s/${surveyId}`;
  }, [surveyId]);

  const exportExcel = async () => {
    if (!limits.export) {
      toast.error(t("limit.exportPro"));
      router.push("/pricing");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows = responses.map((response) => {
        const row: Record<string, unknown> = {
          response_id: response.id,
          submitted_at: response.submitted_at,
          country: response.country,
          city: response.city,
        };
        for (const question of answerableQuestions) {
          const answer = answers.find(
            (entry) => entry.question_id === question.id && entry.response_id === response.id,
          );
          row[question.label] = answer?.value ?? "";
        }
        return row;
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, copy.responsesSheet);
      XLSX.writeFile(workbook, `${survey?.title ?? "survey"}.xlsx`);
      toast.success(copy.exportToast);
    } catch {
      toast.error(copy.exportError);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{copy.notFound}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">{copy.back}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/dashboard">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> {copy.back}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{survey.title}</h1>
          <p className="text-sm text-muted-foreground">
            {survey.description || copy.noDescription}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant={survey.is_published ? "default" : "secondary"}>
              {survey.is_published ? copy.published : copy.draft}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SurveyShareDialog
            surveyId={surveyId}
            surveyTitle={survey.title}
            published={survey.is_published}
            open={shareOpen}
            onOpenChange={setShareOpen}
            onPublishedChange={(published) =>
              setSurvey((current) => (current ? { ...current, is_published: published } : current))
            }
            trigger={
              <Button>
                <Send className="mr-2 h-4 w-4" /> {uiCopy.shareButton}
              </Button>
            }
          />
          <Button onClick={exportExcel} variant="outline">
            {limits.export ? (
              <Download className="mr-2 h-4 w-4" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {uiCopy.exportButton}
          </Button>
          {survey.is_published && (
            <Button onClick={togglePublish} variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              {copy.moveToDraft}
            </Button>
          )}
          <Button onClick={remove} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> {copy.delete}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/20 bg-primary/[0.03] p-5">
          <p className="text-sm font-semibold text-foreground">{uiCopy.shareTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{uiCopy.shareDesc}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setShareOpen(true)}>
              <Send className="mr-2 h-4 w-4" /> {uiCopy.shareButton}
            </Button>
            <Button asChild variant="outline">
              <a href={publicFormUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" /> {uiCopy.openPublicForm}
              </a>
            </Button>
          </div>
        </Card>

        <Card className="border-dashed p-5">
          <p className="text-sm font-semibold text-foreground">{uiCopy.exportTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{uiCopy.exportDesc}</p>
          <div className="mt-4">
            <Button onClick={exportExcel} variant="outline">
              {limits.export ? (
                <Download className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {uiCopy.exportButton}
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{copy.totalResponses}</p>
              <p className="mt-1 text-2xl font-bold">{responseCount}</p>
            </div>
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{copy.totalQuestions}</p>
              <p className="mt-1 text-2xl font-bold">{answerableQuestions.length}</p>
            </div>
            <FileText className="h-5 w-5 text-secondary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{copy.avgAnswers}</p>
              <p className="mt-1 text-2xl font-bold">
                {answerableQuestions.length
                  ? (answers.length / answerableQuestions.length).toFixed(1)
                  : "0"}
              </p>
            </div>
            <FileText className="h-5 w-5 text-accent" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> {t("analytics.map")}
            </p>
            <p className="text-xs text-muted-foreground">{copy.mapDesc}</p>
          </div>
          {!limits.map && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Pro
            </Badge>
          )}
        </div>
        {!limits.map ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 max-w-sm text-sm">{t("limit.mapPro")}</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/pricing">{t("plan.upgrade")}</Link>
            </Button>
          </div>
        ) : geoPoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium">{copy.noMapDataTitle}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">{copy.noMapDataDesc}</p>
          </div>
        ) : (
          <ResponseMap points={geoPoints} />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {answerableQuestions.map((question, questionIndex) => {
          const questionAnswers = answers.filter((answer) => answer.question_id === question.id);

          if (question.type === "multiple_choice") {
            const options = (question.options as string[]) || [];
            const data = options.map((option, index) => {
              const value = questionAnswers.filter((answer) => answer.value === option).length;

              return {
                name: option,
                value,
                percentage: questionAnswers.length
                  ? Math.round((value / questionAnswers.length) * 100)
                  : 0,
                fill: CHART_COLORS[index % CHART_COLORS.length],
              };
            });
            const chartData = data.filter((item) => item.value > 0);

            return (
              <Card key={question.id} className="p-6">
                <p className="mb-4 font-semibold">
                  {questionIndex + 1}. {question.label}
                </p>
                {questionAnswers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.noAnswers}</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Tooltip
                          formatter={(value, name) => {
                            const numericValue = Number(value);
                            const percentage = questionAnswers.length
                              ? Math.round((numericValue / questionAnswers.length) * 100)
                              : 0;

                            return [
                              `${numericValue} · ${percentage}%`,
                              typeof name === "string" ? name : "",
                            ];
                          }}
                          contentStyle={{
                            borderRadius: "12px",
                            borderColor: "rgba(37, 99, 235, 0.14)",
                            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                          }}
                        />
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={3}
                          cornerRadius={10}
                          stroke="#ffffff"
                          strokeWidth={4}
                          labelLine={false}
                          label={renderPieSliceLabel}
                        >
                          <Label
                            content={({ viewBox }) => {
                              const box = viewBox as { cx?: number; cy?: number } | undefined;

                              if (!box?.cx || !box?.cy) {
                                return null;
                              }

                              return (
                                <text
                                  x={box.cx}
                                  y={box.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={box.cx}
                                    y={box.cy - 4}
                                    className="fill-slate-900 text-xl font-bold"
                                  >
                                    {questionAnswers.length}
                                  </tspan>
                                  <tspan
                                    x={box.cx}
                                    y={box.cy + 16}
                                    className="fill-slate-500 text-[11px] font-medium"
                                  >
                                    {lang === "mn" ? "хариулт" : "responses"}
                                  </tspan>
                                </text>
                              );
                            }}
                          />
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`${question.id}-${index}`}
                              fill={entry.fill}
                              className="drop-shadow-[0_10px_18px_rgba(37,99,235,0.12)]"
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {data.map((item) => (
                        <div
                          key={`${question.id}-${item.name}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-sm text-slate-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                            <p className="text-[11px] text-slate-500">{item.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            );
          }

          if (question.type === "rating") {
            const data = [1, 2, 3, 4, 5].map((value) => ({
              name: String(value),
              value: questionAnswers.filter((answer) => Number(answer.value) === value).length,
            }));
            const average = questionAnswers.length
              ? (
                  questionAnswers.reduce((sum, answer) => sum + Number(answer.value || 0), 0) /
                  questionAnswers.length
                ).toFixed(2)
              : "0";
            return (
              <Card key={question.id} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold">
                    {questionIndex + 1}. {question.label}
                  </p>
                  <Badge variant="outline">
                    {copy.avgLabel}: {average}
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={PRIMARY_CHART_COLOR} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            );
          }

          return (
            <Card key={question.id} className="p-6">
              <p className="mb-3 font-semibold">
                {questionIndex + 1}. {question.label}
              </p>
              {questionAnswers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.noAnswers}</p>
              ) : (
                <ul className="space-y-2">
                  {questionAnswers.slice(0, 20).map((answer, index) => (
                    <li
                      key={`${question.id}-${index}`}
                      className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      {String(answer.value)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
