import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/formly/AuthProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS, PLAN_PRICE, isUnlimited } from "@/lib/plans";
import { CreditCard, FileText, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Төлбөр — Formly" }] }),
  component: Billing,
});

function Billing() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const { t, lang } = useI18n();
  const [surveyCount, setSurveyCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: s, count: sc } = await supabase
        .from("surveys")
        .select("id", { count: "exact" })
        .eq("owner_id", user.id);
      setSurveyCount(sc ?? 0);
      const ids = (s ?? []).map((x) => x.id);
      if (ids.length) {
        const { count: rc } = await supabase
          .from("responses")
          .select("*", { count: "exact", head: true })
          .in("survey_id", ids);
        setResponseCount(rc ?? 0);
      }
    })();
  }, [user]);

  const limits = PLAN_LIMITS[plan];
  const price = PLAN_PRICE[plan];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("billing.title")}</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.currentPlan")}</p>
              <p className="text-xl font-bold capitalize">
                {t(`plan.${plan}` as "plan.free")}{" "}
                <Badge variant="secondary" className="ml-1">{lang === "mn" ? price.mn : price.en}</Badge>
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/pricing">{t("plan.upgrade")}</Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="mb-4 font-semibold">{t("billing.usage")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <UsageBar
            icon={<FileText className="h-4 w-4" />}
            label={t("billing.surveys")}
            value={surveyCount}
            max={limits.surveys}
            unlimitedLabel={t("billing.unlimited")}
          />
          <UsageBar
            icon={<MessageSquare className="h-4 w-4" />}
            label={t("billing.responses")}
            value={responseCount}
            max={limits.responsesPerSurvey === Infinity ? Infinity : limits.responsesPerSurvey * Math.max(1, surveyCount)}
            unlimitedLabel={t("billing.unlimited")}
          />
        </div>
      </Card>
    </div>
  );
}

function UsageBar({ icon, label, value, max, unlimitedLabel }: { icon: React.ReactNode; label: string; value: number; max: number; unlimitedLabel: string }) {
  const unlimited = isUnlimited(max);
  const pct = unlimited ? 0 : Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
        <span className="font-semibold">{value}{unlimited ? "" : ` / ${max}`}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${pct > 80 ? "bg-destructive" : "bg-primary"}`} style={{ width: unlimited ? "100%" : `${pct}%`, opacity: unlimited ? 0.4 : 1 }} />
      </div>
      {unlimited && <p className="mt-1 text-xs text-muted-foreground">{unlimitedLabel}</p>}
    </div>
  );
}