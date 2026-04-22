import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/formly/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, MessageSquare, PlusCircle, Sparkles, Eye, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Хяналтын самбар — Formly" }] }),
  component: Dashboard,
});

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

function Dashboard() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase
        .from("surveys")
        .select("id, title, description, is_published, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      setSurveys(s ?? []);

      const ids = (s ?? []).map((x) => x.id);
      if (ids.length) {
        const { count } = await supabase
          .from("responses")
          .select("*", { count: "exact", head: true })
          .in("survey_id", ids);
        setResponseCount(count ?? 0);
      }
      setLoading(false);
    })();
  }, [user]);

  const published = surveys.filter((s) => s.is_published).length;
  const completion = surveys.length ? Math.round((published / surveys.length) * 100) : 0;

  const stats = [
    { label: "Нийт судалгаа", en: "Total Surveys", value: surveys.length, icon: FileText, color: "text-primary" },
    { label: "Нийт хариулт", en: "Responses", value: responseCount, icon: MessageSquare, color: "text-secondary" },
    { label: "Нийтлэгдсэн", en: "Published", value: `${completion}%`, icon: BarChart3, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Хяналтын самбар</h1>
          <p className="text-sm text-muted-foreground">Dashboard — Таны судалгааны тойм</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/ai">
              <Sparkles className="mr-2 h-4 w-4" /> AI үүсгэх
            </Link>
          </Button>
          <Button asChild>
            <Link to="/surveys/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Шинэ судалгаа
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.en}</p>
              </div>
              <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Сүүлийн судалгаанууд</h2>
            <p className="text-sm text-muted-foreground">Recent Surveys</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Судалгаа байхгүй байна</p>
            <p className="text-xs text-muted-foreground">Эхний судалгаагаа үүсгэж эхэлнэ үү</p>
            <Button asChild className="mt-4">
              <Link to="/surveys/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Үүсгэх
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {surveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {s.description || "Тайлбаргүй"}
                  </p>
                </div>
                <Badge variant={s.is_published ? "default" : "secondary"}>
                  {s.is_published ? "Нийтлэгдсэн" : "Ноорог"}
                </Badge>
                <Button asChild size="sm" variant="outline">
                  <Link to="/surveys/$id/analytics" params={{ id: s.id }}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Үзэх
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}