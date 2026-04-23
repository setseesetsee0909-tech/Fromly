import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, Eye, Trash2, Sparkles, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Админ — Formly" }] }),
  component: Admin,
});

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

function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const { t } = useI18n();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const [s, p, r] = await Promise.all([
      supabase.from("surveys").select("id, title, is_published, created_at, owner_id").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setSurveys(s.data ?? []);
    setProfiles(p.data ?? []);
    setRoles((r.data ?? []) as RoleRow[]);
    setBusy(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  const removeSurvey = async (s: SurveyRow) => {
    if (!confirm(`"${s.title}" устгах уу?`)) return;
    const { error } = await supabase.from("surveys").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Устгалаа");
    void load();
  };

  const isUserAdmin = (uid: string) => roles.some((r) => r.user_id === uid && r.role === "admin");

  const toggleAdmin = async (uid: string) => {
    if (isUserAdmin(uid)) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Админ эрх цуцаллаа");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Админ боллоо");
    }
    void load();
  };

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("seed-demo", {
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
      });
      if (error) throw error;
      toast.success(`Demo: ${data?.users?.length ?? 0} хэрэглэгч, ${data?.surveys ?? 0} судалгаа`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">{t("admin.noAccess")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Зөвхөн админ хэрэглэгч хандах боломжтой.</p>
        <Button asChild className="mt-4"><Link to="/dashboard">Буцах</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground">Admin Panel</p>
        </div>
        <Button onClick={seedDemo} disabled={seeding}>
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {seeding ? t("admin.seeding") : t("admin.seedDemo")}
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
        <h2 className="mb-4 text-lg font-semibold">{t("admin.users")}</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell className="font-medium">{p.display_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={isUserAdmin(p.user_id) ? "default" : "secondary"}>
                      {isUserAdmin(p.user_id) ? t("role.admin") : t("role.user")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("mn-MN")}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.user_id === user?.id}
                      onClick={() => toggleAdmin(p.user_id)}
                    >
                      {isUserAdmin(p.user_id) ? (
                        <><ShieldOff className="mr-1.5 h-3.5 w-3.5" /> {t("admin.removeAdmin")}</>
                      ) : (
                        <><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {t("admin.makeAdmin")}</>
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
        <h2 className="mb-4 text-lg font-semibold">{t("admin.surveys")}</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гарчиг</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_published ? "default" : "secondary"}>
                      {s.is_published ? "Нийт" : "Ноорог"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("mn-MN")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/surveys/$id/analytics" params={{ id: s.id }}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Үзэх
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSurvey(s)}>
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