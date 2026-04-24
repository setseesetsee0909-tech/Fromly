import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ArrowLeft, Copy, Loader2, MessageSquare, FileText, Send, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { ResponseMap } from "@/components/formly/ResponseMap";
import { MapPin, Download, Lock } from "lucide-react";

export const Route = createFileRoute("/_app/surveys/$id/analytics")({
  head: () => ({ meta: [{ title: "Аналитик — Formly" }] }),
  component: Analytics,
});

interface Q {
  id: string;
  type: string;
  label: string;
  options: unknown;
  position: number;
}
interface A {
  question_id: string;
  value: unknown;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ec4899"];

function Analytics() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { plan, limits } = usePlan();
  const { t } = useI18n();
  const [survey, setSurvey] = useState<{ title: string; description: string | null; is_published: boolean } | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<A[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [geoPoints, setGeoPoints] = useState<{ lat: number; lng: number; city: string | null; country: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("surveys")
        .select("title, description, is_published")
        .eq("id", id)
        .maybeSingle();
      setSurvey(s);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, type, label, options, position")
        .eq("survey_id", id)
        .order("position");
      setQuestions(qs ?? []);

      const { data: rs, count } = await supabase
        .from("responses")
        .select("id, lat, lng, city, country", { count: "exact" })
        .eq("survey_id", id);
      setResponseCount(count ?? 0);
      setGeoPoints(
        (rs ?? [])
          .filter((r): r is { id: string; lat: number; lng: number; city: string | null; country: string | null } =>
            typeof r.lat === "number" && typeof r.lng === "number")
          .map((r) => ({ lat: r.lat, lng: r.lng, city: r.city, country: r.country })),
      );

      if (rs && rs.length) {
        const { data: ans } = await supabase
          .from("answers")
          .select("question_id, value")
          .in("response_id", rs.map((r) => r.id));
        setAnswers(ans ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  const copyLink = () => {
    const url = `${window.location.origin}/s/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Холбоос хуулагдлаа");
  };

  const togglePublish = async () => {
    if (!survey) return;
    const { error } = await supabase
      .from("surveys")
      .update({ is_published: !survey.is_published })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setSurvey({ ...survey, is_published: !survey.is_published });
    toast.success(survey.is_published ? "Ноорог болголоо" : "Нийтэллээ");
  };

  const remove = async () => {
    if (!confirm("Энэ судалгааг устгах уу?")) return;
    const { error } = await supabase.from("surveys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Устгалаа");
    navigate({ to: "/dashboard" });
  };

  const exportCsv = () => {
    if (!limits.export) {
      toast.error(t("limit.exportPro"));
      navigate({ to: "/pricing" });
      return;
    }
    const header = ["question", "answer"];
    const rows = answers.map((a) => {
      const q = questions.find((x) => x.id === a.question_id);
      return [JSON.stringify(q?.label ?? ""), JSON.stringify(String(a.value))];
    });
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey?.title ?? "survey"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="text-center py-20">
        <p className="text-muted-foreground">Судалгаа олдсонгүй</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Буцах</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Буцах
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{survey.title}</h1>
          <p className="text-sm text-muted-foreground">{survey.description || "Тайлбаргүй"}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant={survey.is_published ? "default" : "secondary"}>
              {survey.is_published ? "Нийтлэгдсэн" : "Ноорог"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {survey.is_published && (
            <Button onClick={copyLink} variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Холбоос
            </Button>
          )}
          <Button onClick={exportCsv} variant="outline">
            {limits.export ? <Download className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {t("analytics.export")}
          </Button>
          <Button onClick={togglePublish} variant="outline">
            {survey.is_published ? <Archive className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
            {survey.is_published ? "Ноорог болгох" : "Нийтлэх"}
          </Button>
          <Button onClick={remove} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Устгах
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> {t("analytics.map")}
          </p>
          {!limits.map && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Pro
            </Badge>
          )}
        </div>
        {!limits.map ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm">{t("limit.mapPro")}</p>
            <Button asChild className="mt-3" size="sm">
              <a href="/pricing">{t("plan.upgrade")}</a>
            </Button>
          </div>
        ) : geoPoints.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">—</p>
        ) : (
          <ResponseMap points={geoPoints} />
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Нийт хариулт</p>
              <p className="mt-1 text-2xl font-bold">{responseCount}</p>
            </div>
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Асуултын тоо</p>
              <p className="mt-1 text-2xl font-bold">{questions.length}</p>
            </div>
            <FileText className="h-5 w-5 text-secondary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Дундаж хариулт</p>
              <p className="mt-1 text-2xl font-bold">
                {questions.length ? (answers.length / questions.length).toFixed(1) : "0"}
              </p>
            </div>
            <FileText className="h-5 w-5 text-accent" />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => {
          const qAns = answers.filter((a) => a.question_id === q.id);
          if (q.type === "multiple_choice") {
            const opts = (q.options as string[]) || [];
            const data = opts.map((opt) => ({
              name: opt,
              value: qAns.filter((a) => a.value === opt).length,
            }));
            return (
              <Card key={q.id} className="p-6">
                <p className="mb-4 font-semibold">
                  {qi + 1}. {q.label}
                </p>
                {qAns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Хариулт байхгүй</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                        {data.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            );
          }
          if (q.type === "rating") {
            const data = [1, 2, 3, 4, 5].map((n) => ({
              name: String(n),
              value: qAns.filter((a) => Number(a.value) === n).length,
            }));
            const avg = qAns.length
              ? (qAns.reduce((s, a) => s + Number(a.value || 0), 0) / qAns.length).toFixed(2)
              : "0";
            return (
              <Card key={q.id} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold">
                    {qi + 1}. {q.label}
                  </p>
                  <Badge variant="outline">Дундаж: {avg}</Badge>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            );
          }
          return (
            <Card key={q.id} className="p-6">
              <p className="mb-3 font-semibold">
                {qi + 1}. {q.label}
              </p>
              {qAns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Хариулт байхгүй</p>
              ) : (
                <ul className="space-y-2">
                  {qAns.slice(0, 20).map((a, i) => (
                    <li key={i} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      {String(a.value)}
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