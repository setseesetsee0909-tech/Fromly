"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Loader2, ShieldAlert, ShieldCheck, ShieldOff, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SurveyRow {
  id: string;
  title: string;
  is_published: boolean;
  created_at: string;
  owner_id: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: "admin" | "user";
}

export function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const { t, lang } = useI18n();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const copy =
    lang === "mn"
      ? {
          subtitle: "Хэрэглэгч, эрх, судалгааны хяналт",
          noAccessDesc: "Зөвхөн админ хэрэглэгч энэ хэсэгт хандах боломжтой.",
          back: "Буцах",
          removed: "Устгалаа",
          adminRemoved: "Админ эрх цуцлагдлаа",
          adminGranted: "Админ боллоо",
          sampleSeeded: (userCount: number, surveyCount: number) =>
            `Туршилтын өгөгдөл нэмэгдлээ: ${userCount} хэрэглэгч, ${surveyCount} судалгаа`,
          genericError: "Алдаа",
          confirmDelete: (title: string) => `"${title}" устгах уу?`,
          usersTitle: "Хэрэглэгчид",
          surveysTitle: "Бүх судалгаа",
          name: "Нэр",
          role: "Эрх",
          joined: "Бүртгүүлсэн",
          title: "Гарчиг",
          status: "Төлөв",
          created: "Огноо",
          published: "Нийтэлсэн",
          draft: "Ноорог",
          view: "Үзэх",
        }
      : {
          subtitle: "Manage users, roles, and all surveys",
          noAccessDesc: "Only administrators can access this page.",
          back: "Back to dashboard",
          removed: "Survey removed",
          adminRemoved: "Admin access removed",
          adminGranted: "User promoted to admin",
          sampleSeeded: (userCount: number, surveyCount: number) =>
            `Sample data added: ${userCount} users, ${surveyCount} surveys`,
          genericError: "Something went wrong",
          confirmDelete: (title: string) => `Delete "${title}"?`,
          usersTitle: "Users",
          surveysTitle: "All surveys",
          name: "Name",
          role: "Role",
          joined: "Joined",
          title: "Title",
          status: "Status",
          created: "Created",
          published: "Published",
          draft: "Draft",
          view: "View",
        };

  const locale = lang === "mn" ? "mn-MN" : "en-US";

  const load = async () => {
    const [surveyResult, profileResult, roleResult] = await Promise.all([
      supabase
        .from("surveys")
        .select("id, title, is_published, created_at, owner_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, display_name, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    setSurveys(surveyResult.data ?? []);
    setProfiles(profileResult.data ?? []);
    setRoles((roleResult.data ?? []) as RoleRow[]);
    setBusy(false);
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void load();
  }, [isAdmin]);

  const removeSurvey = async (survey: SurveyRow) => {
    if (!confirm(copy.confirmDelete(survey.title))) {
      return;
    }
    const { error } = await supabase.from("surveys").delete().eq("id", survey.id);
    if (error) {
      return toast.error(error.message);
    }
    toast.success(copy.removed);
    void load();
  };

  const isUserAdmin = (uid: string) =>
    roles.some((role) => role.user_id === uid && role.role === "admin");

  const toggleAdmin = async (uid: string) => {
    if (isUserAdmin(uid)) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "admin");
      if (error) {
        return toast.error(error.message);
      }
      toast.success(copy.adminRemoved);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) {
        return toast.error(error.message);
      }
      toast.success(copy.adminGranted);
    }

    void load();
  };

  const seedSampleData = async () => {
    setSeeding(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("seed-demo", {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (error) {
        throw error;
      }
      toast.success(copy.sampleSeeded(data?.users?.length ?? 0, data?.surveys ?? 0));
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.genericError);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">{t("admin.noAccess")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.noAccessDesc}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">{copy.back}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Button onClick={seedSampleData} disabled={seeding}>
          {seeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {seeding ? t("admin.seeding") : t("admin.seedSample")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("admin.totalUsers")}</p>
          <p className="mt-1 text-3xl font-bold">{profiles.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("admin.totalSurveys")}</p>
          <p className="mt-1 text-3xl font-bold">{surveys.length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{copy.usersTitle}</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.name}</TableHead>
                <TableHead>{copy.role}</TableHead>
                <TableHead>{copy.joined}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.user_id}>
                  <TableCell className="font-medium">{profile.display_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={isUserAdmin(profile.user_id) ? "default" : "secondary"}>
                      {isUserAdmin(profile.user_id) ? t("role.admin") : t("role.user")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={profile.user_id === user?.id}
                      onClick={() => toggleAdmin(profile.user_id)}
                    >
                      {isUserAdmin(profile.user_id) ? (
                        <>
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> {t("admin.removeAdmin")}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {t("admin.makeAdmin")}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{copy.surveysTitle}</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.title}</TableHead>
                <TableHead>{copy.status}</TableHead>
                <TableHead>{copy.created}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((survey) => (
                <TableRow key={survey.id}>
                  <TableCell className="font-medium">{survey.title}</TableCell>
                  <TableCell>
                    <Badge variant={survey.is_published ? "default" : "secondary"}>
                      {survey.is_published ? copy.published : copy.draft}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(survey.created_at).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/surveys/${survey.id}/analytics`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> {copy.view}
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSurvey(survey)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
