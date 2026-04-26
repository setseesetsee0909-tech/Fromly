import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/formly/AuthProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Баг — Formly" }] }),
  component: Team,
});

interface WS { id: string; name: string }
interface Member { id: string; user_id: string; role: string; email?: string }

function Team() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const { t } = useI18n();
  const [ws, setWs] = useState<WS | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("My Team");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    setWs(data ?? null);
    if (data) {
      const { data: m } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", data.id);
      const enriched: Member[] = [];
      for (const row of m ?? []) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", row.user_id)
          .maybeSingle();
        enriched.push({ ...row, email: p?.display_name ?? row.user_id.slice(0, 8) });
      }
      setMembers(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  if (plan !== "team") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">{t("team.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("team.needTeam")}</p>
          <Button asChild className="mt-6">
            <Link to="/pricing">{t("plan.upgrade")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const createWs = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setWs(data);
    toast.success("Workspace");
  };

  const invite = async () => {
    if (!ws || !email.trim()) return;
    setBusy(true);
    // Look up user by display_name (email) in profiles
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", `%${email.trim().split("@")[0]}%`)
      .limit(1)
      .maybeSingle();
    if (!prof) {
      setBusy(false);
      return toast.error("Хэрэглэгч олдсонгүй");
    }
    const { error } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: prof.user_id, role: "member" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEmail("");
    toast.success(t("team.invited"));
    void load();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("workspace_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("team.removed"));
    void load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("team.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("team.desc")}</p>
      </div>

      {!ws ? (
        <Card className="mx-auto max-w-xl p-6 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" />
          <Button onClick={createWs} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("team.create")}</Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="text-xl font-semibold">{ws.name}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-xs text-muted-foreground">{t("team.member")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xl font-bold">{plan}</p>
                  <p className="text-xs text-muted-foreground">Plan</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="mb-3 font-semibold">{t("team.invite")}</p>
              <div className="flex flex-col gap-2">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                <Button onClick={invite} disabled={busy || !email.trim()}>{t("team.invite")}</Button>
              </div>
            </Card>
          </div>

          <Card className="p-6 lg:col-span-2">
            <p className="mb-3 font-semibold">{t("team.member")}</p>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">—</p>
              </div>
            ) : (
              <div className="divide-y">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{m.email}</p>
                      <Badge variant="secondary" className="mt-1">{m.role}</Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}