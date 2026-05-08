"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WS {
  id: string;
  name: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  email?: string;
}

export function TeamPage() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const { t, lang } = useI18n();
  const [ws, setWs] = useState<WS | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("My Team");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const copy =
    lang === "mn"
      ? {
          badge: "Team workspace",
          workspaceCreated: "Workspace үүслээ",
          userNotFound: "Хэрэглэгч олдсонгүй",
          membersTitle: "Гишүүд",
          inviteTitle: "Гишүүн урих",
          workspaceLabel: "Workspace",
          planLabel: "Төлөвлөгөө",
          emptyMembers: "Одоогоор гишүүн нэмэгдээгүй байна.",
          invitePlaceholder: "user@example.com",
          heroTitle: "Багаа нэг workspace дээр төвлөрүүлээрэй",
          heroDesc:
            "Гишүүдээ урьж судалгаа, хариулт, ажлын урсгалаа нэг дороос хамт удирдах орчноо эхлүүлнэ үү.",
          tipsTitle: "Эхлүүлэхэд бэлэн",
          tips: [
            "Судалгаагаа багийн түвшинд хуваалцаж хамт засварлана",
            "Шинэ гишүүдийг урьж оролцоог хурдан өргөжүүлнэ",
            "Нэг нэршилтэй workspace ашиглаад зохион байгуулалтаа цэгцэлнэ",
          ],
          statMembers: "Гишүүн",
          statSurveys: "Судалгаа",
          statShared: "Хамтын орчин",
          statValueMembers: "Олон",
          statValueSurveys: "Хуваалцсан",
          statValueShared: "Нэг цэгээс",
          formTitle: "Workspace үүсгэх",
          formDesc: "Эхний багийн workspace-аа нэрлээд хамтын орчноо эхлүүлээрэй.",
          inputHint: "Жишээ: Product Research Team",
          stepsTitle: "Дараагийн алхмууд",
          steps: [
            "Workspace нэрээ оруулна",
            "Гишүүдээ invite хийнэ",
            "Судалгаагаа хамт удирдаж эхэлнэ",
          ],
        }
      : {
          badge: "Team workspace",
          workspaceCreated: "Workspace created",
          userNotFound: "No matching user found",
          membersTitle: "Members",
          inviteTitle: "Invite a teammate",
          workspaceLabel: "Workspace",
          planLabel: "Plan",
          emptyMembers: "No team members have been added yet.",
          invitePlaceholder: "user@example.com",
          heroTitle: "Bring your team into one workspace",
          heroDesc:
            "Invite teammates and manage surveys, responses, and collaboration from one shared space.",
          tipsTitle: "Ready to launch",
          tips: [
            "Share surveys across the team and manage work together",
            "Invite new members quickly as your project grows",
            "Keep everything organized inside one named workspace",
          ],
          statMembers: "Members",
          statSurveys: "Surveys",
          statShared: "Shared space",
          statValueMembers: "Multiple",
          statValueSurveys: "Shared",
          statValueShared: "Centralized",
          formTitle: "Create a workspace",
          formDesc: "Name your first team workspace and start collaborating in one place.",
          inputHint: "Example: Product Research Team",
          stepsTitle: "What happens next",
          steps: [
            "Name your workspace",
            "Invite your teammates",
            "Start managing surveys together",
          ],
        };

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    const { data } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    setWs(data ?? null);

    if (data) {
      const { data: memberRows } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", data.id);

      const profileIds = [...new Set((memberRows ?? []).map((row) => row.user_id))];
      const { data: profileRows } =
        profileIds.length === 0
          ? { data: [] as { user_id: string; display_name: string | null }[] }
          : await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", profileIds);

      const profileByUserId = new Map(
        (profileRows ?? []).map((profile) => [profile.user_id, profile.display_name]),
      );

      const enriched: Member[] = (memberRows ?? []).map((row) => ({
        ...row,
        email: profileByUserId.get(row.user_id) ?? row.user_id.slice(0, 8),
      }));
      setMembers(enriched);
    } else {
      setMembers([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (plan !== "team") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">{t("team.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("team.needTeam")}</p>
          <Button asChild className="mt-6">
            <Link href="/pricing">{t("plan.upgrade")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const createWs = async () => {
    if (!user || !name.trim()) {
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();
    setBusy(false);

    if (error) {
      return toast.error(error.message);
    }

    setWs(data);
    toast.success(copy.workspaceCreated);
  };

  const invite = async () => {
    if (!ws || !email.trim()) {
      return;
    }
    setBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", `%${email.trim().split("@")[0]}%`)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      setBusy(false);
      return toast.error(copy.userNotFound);
    }

    const { error } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: profile.user_id, role: "member" });
    setBusy(false);

    if (error) {
      return toast.error(error.message);
    }

    setEmail("");
    toast.success(t("team.invited"));
    void load();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("workspace_members").delete().eq("id", id);
    if (error) {
      return toast.error(error.message);
    }
    toast.success(t("team.removed"));
    void load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("team.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("team.desc")}</p>
      </div>

      {!ws ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <Card className="overflow-hidden border border-primary/15 bg-white shadow-lg">
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {copy.badge}
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {copy.heroTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {copy.heroDesc}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
                  <div className="flex items-center gap-2 text-primary/80">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs uppercase tracking-[0.18em]">{copy.statMembers}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {copy.statValueMembers}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
                  <div className="flex items-center gap-2 text-primary/80">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-xs uppercase tracking-[0.18em]">{copy.statSurveys}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {copy.statValueSurveys}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/[0.08] p-4">
                  <div className="flex items-center gap-2 text-primary/80">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs uppercase tracking-[0.18em]">{copy.statShared}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {copy.statValueShared}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-primary/10 bg-primary/[0.03] p-5">
                <p className="text-sm font-semibold text-foreground">{copy.tipsTitle}</p>
                <div className="mt-4 grid gap-3">
                  {copy.tips.map((tip) => (
                    <div
                      key={tip}
                      className="flex items-start gap-3 rounded-xl border border-primary/10 bg-white px-4 py-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-foreground/85">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 md:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{copy.formTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.formDesc}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={copy.inputHint}
                />
                <Button className="w-full" onClick={createWs} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("team.create")}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold">{copy.stepsTitle}</p>
              <div className="mt-4 space-y-3">
                {copy.steps.map((step, index) => (
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">{copy.workspaceLabel}</p>
              <p className="text-xl font-semibold">{ws.name}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-xs text-muted-foreground">{t("team.member")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xl font-bold">{plan}</p>
                  <p className="text-xs text-muted-foreground">{copy.planLabel}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="mb-3 font-semibold">{copy.inviteTitle}</p>
              <div className="flex flex-col gap-2">
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.invitePlaceholder}
                />
                <Button onClick={invite} disabled={busy || !email.trim()}>
                  {t("team.invite")}
                </Button>
              </div>
            </Card>
          </div>

          <Card className="p-6 lg:col-span-2">
            <p className="mb-3 font-semibold">{copy.membersTitle}</p>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">{copy.emptyMembers}</p>
              </div>
            ) : (
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{member.email}</p>
                      <Badge variant="secondary" className="mt-1">
                        {member.role}
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeMember(member.id)}>
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
