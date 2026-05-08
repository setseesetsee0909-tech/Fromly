"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { SurveyShareDialog } from "@/components/formly/SurveyShareDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const copy =
    lang === "mn"
      ? {
          title: "Хяналтын самбар",
          subtitle: "Dashboard",
          aiCreate: "AI үүсгэх",
          newSurvey: "Шинэ судалгаа",
          totalSurveys: "Нийт судалгаа",
          totalResponses: "Нийт хариулт",
          publishedRate: "Нийтлэгдсэн",
          recentTitle: "Сүүлийн судалгаанууд",
          recentSubtitle: "Recent Surveys",
          emptyTitle: "Судалгаа байхгүй байна",
          emptyDesc: "Эхний судалгаагаа үүсгээд эхлэнэ үү",
          create: "Үүсгэх",
          noDescription: "Тайлбаргүй",
          published: "Нийтлэгдсэн",
          draft: "Ноорог",
          share: "Илгээх",
          unpublish: "Ноорог",
          view: "Үзэх",
          remove: "Устгах",
          removeConfirm: (title: string) => `"${title}" судалгааг устгах уу?`,
          removedToast: "Устгалаа",
          publishToast: "Нийтэллээ",
          draftToast: "Ноорог болголоо",
        }
      : {
          title: "Dashboard",
          subtitle: "Overview",
          aiCreate: "Create with AI",
          newSurvey: "New survey",
          totalSurveys: "Total surveys",
          totalResponses: "Total responses",
          publishedRate: "Published",
          recentTitle: "Recent surveys",
          recentSubtitle: "Your latest survey activity",
          emptyTitle: "No surveys yet",
          emptyDesc: "Create your first survey to start collecting responses.",
          create: "Create survey",
          noDescription: "No description",
          published: "Published",
          draft: "Draft",
          share: "Share",
          unpublish: "Move to draft",
          view: "View",
          remove: "Delete",
          removeConfirm: (title: string) => `Delete "${title}"?`,
          removedToast: "Survey deleted",
          publishToast: "Survey published",
          draftToast: "Survey moved back to draft",
        };

  useEffect(() => {
    void (async () => {
      if (!user) {
        return;
      }

      setLoading(true);

      const { data: surveyRows } = await supabase
        .from("surveys")
        .select("id, title, description, is_published, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setSurveys(surveyRows ?? []);

      const ids = (surveyRows ?? []).map((survey) => survey.id);
      if (ids.length > 0) {
        const { count } = await supabase
          .from("responses")
          .select("*", { count: "exact", head: true })
          .in("survey_id", ids);
        setResponseCount(count ?? 0);
      } else {
        setResponseCount(0);
      }

      setLoading(false);
    })();
  }, [refreshTick, user]);

  const refresh = () => setRefreshTick((current) => current + 1);

  const togglePublish = async (survey: SurveyRow) => {
    const { error } = await supabase
      .from("surveys")
      .update({ is_published: !survey.is_published })
      .eq("id", survey.id);
    if (error) {
      return toast.error(error.message);
    }
    toast.success(survey.is_published ? copy.draftToast : copy.publishToast);
    refresh();
  };

  const remove = async (survey: SurveyRow) => {
    if (!confirm(copy.removeConfirm(survey.title))) {
      return;
    }
    const { error } = await supabase.from("surveys").delete().eq("id", survey.id);
    if (error) {
      return toast.error(error.message);
    }
    toast.success(copy.removedToast);
    refresh();
  };

  const published = surveys.filter((survey) => survey.is_published).length;
  const completion = surveys.length ? Math.round((published / surveys.length) * 100) : 0;
  const stats = [
    {
      label: copy.totalSurveys,
      value: surveys.length,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: copy.totalResponses,
      value: responseCount,
      icon: MessageSquare,
      color: "text-secondary",
    },
    {
      label: copy.publishedRate,
      value: `${completion}%`,
      icon: BarChart3,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/ai">
              <Sparkles className="mr-2 h-4 w-4" /> {copy.aiCreate}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/surveys/new">
              <PlusCircle className="mr-2 h-4 w-4" /> {copy.newSurvey}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`rounded-xl bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{copy.recentTitle}</h2>
            <p className="text-sm text-muted-foreground">{copy.recentSubtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{copy.emptyTitle}</p>
            <p className="text-xs text-muted-foreground">{copy.emptyDesc}</p>
            <Button asChild className="mt-4">
              <Link href="/surveys/new">
                <PlusCircle className="mr-2 h-4 w-4" /> {copy.create}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{survey.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {survey.description || copy.noDescription}
                  </p>
                </div>
                <Badge variant={survey.is_published ? "default" : "secondary"}>
                  {survey.is_published ? copy.published : copy.draft}
                </Badge>
                <div className="flex flex-wrap gap-1.5">
                  <SurveyShareDialog
                    surveyId={survey.id}
                    surveyTitle={survey.title}
                    published={survey.is_published}
                    onPublishedChange={refresh}
                    trigger={
                      <Button size="sm" variant="ghost" title={copy.share}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  {survey.is_published && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePublish(survey)}
                      title={copy.unpublish}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/surveys/${survey.id}/analytics`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> {copy.view}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(survey)}
                    title={copy.remove}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
