"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Download,
  FileText,
  Map,
  MessageSquare,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { ManualBillingConfig } from "@/lib/manual-billing";
import { PLAN_PRICE, isUnlimited } from "@/lib/plans";

interface ManualBillingRequestRow {
  account_name: string;
  account_number: string;
  amount_mnt: number;
  bank_name: string;
  created_at: string;
  id: string;
  note: string | null;
  payer_name: string;
  plan: "free" | "pro" | "team";
  review_note: string | null;
  reviewed_at: string | null;
  status: "pending" | "approved" | "rejected";
  transfer_reference: string;
}

interface BillingPageProps {
  manualConfig: ManualBillingConfig;
}

export function BillingPage({ manualConfig }: BillingPageProps) {
  const { session, user } = useAuth();
  const { plan } = usePlan();
  const { t, lang } = useI18n();
  const [surveyCount, setSurveyCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [manualRequests, setManualRequests] = useState<ManualBillingRequestRow[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void (async () => {
      const { data: surveys, count: surveyTotal } = await supabase
        .from("surveys")
        .select("id", { count: "exact" })
        .eq("owner_id", user.id);
      setSurveyCount(surveyTotal ?? 0);

      const ids = (surveys ?? []).map((survey) => survey.id);
      if (ids.length > 0) {
        const { count: responseTotal } = await supabase
          .from("responses")
          .select("*", { count: "exact", head: true })
          .in("survey_id", ids);
        setResponseCount(responseTotal ?? 0);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!session?.access_token) {
      setManualRequests([]);
      return;
    }

    void (async () => {
      const response = await fetch("/api/manual-billing/requests", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { requests?: ManualBillingRequestRow[] };
      setManualRequests(Array.isArray(data.requests) ? data.requests : []);
    })();
  }, [session?.access_token]);

  const { limits } = usePlan();
  const price = PLAN_PRICE[plan];
  const latestManualRequest = manualRequests[0] ?? null;
  const features = [
    {
      label: lang === "mn" ? "AI үүсгэгч" : "AI survey generation",
      on: limits.aiEnabled,
      icon: Sparkles,
    },
    {
      label: lang === "mn" ? "CSV / PDF экспорт" : "CSV and PDF export",
      on: limits.export,
      icon: Download,
    },
    { label: lang === "mn" ? "Газрын зураг" : "Response map", on: limits.map, icon: Map },
    {
      label: lang === "mn" ? "Багийн ажиллагаа" : "Team workspace",
      on: plan === "team",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("billing.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {lang === "mn"
            ? "Захиалга, ашиглалт болон боломжуудыг нэг дороос"
            : "See your subscription, usage, and available features in one place"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("billing.currentPlan")}</p>
                <p className="text-xl font-bold capitalize">
                  {t(`plan.${plan}` as "plan.free")}{" "}
                  <Badge variant="secondary" className="ml-1">
                    {lang === "mn" ? price.mn : price.en}
                  </Badge>
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/pricing">{t("plan.upgrade")}</Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <p className="mb-3 text-sm font-semibold">{lang === "mn" ? "Хэрэглэгч" : "Account"}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={plan === "free" ? "secondary" : "default"} className="capitalize">
              {plan}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {lang === "mn" ? "идэвхтэй" : "Active"}
            </span>
          </div>
        </Card>
      </div>

      {latestManualRequest ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {lang === "mn" ? "Bank transfer huselt" : "Bank transfer request"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "mn"
                  ? "Manual transfer request-iin suuliin tuluv end haragdana."
                  : "The latest manual transfer review status appears here."}
              </p>
            </div>
            <Badge
              variant={
                latestManualRequest.status === "approved"
                  ? "default"
                  : latestManualRequest.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {latestManualRequest.status}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {lang === "mn" ? "Plan" : "Plan"}
              </p>
              <p className="mt-1 font-semibold capitalize">{latestManualRequest.plan}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {lang === "mn" ? "Amount" : "Amount"}
              </p>
              <p className="mt-1 font-semibold">
                {latestManualRequest.amount_mnt.toLocaleString(lang === "mn" ? "mn-MN" : "en-US")}
                ₮
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {lang === "mn" ? "Reference" : "Reference"}
              </p>
              <p className="mt-1 break-all font-mono text-sm">{latestManualRequest.transfer_reference}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {lang === "mn" ? "Ilgeesen ognoo" : "Submitted"}
              </p>
              <p className="mt-1 font-semibold">
                {new Date(latestManualRequest.created_at).toLocaleString(lang === "mn" ? "mn-MN" : "en-US")}
              </p>
            </div>
          </div>

          {(latestManualRequest.status === "pending" || latestManualRequest.status === "rejected") && (
            <div className="mt-4 rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-semibold">
                {lang === "mn" ? "Tulbur hiih medeelel" : "Transfer instructions"}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {lang === "mn" ? "Bank" : "Bank"}
                  </p>
                  <p className="mt-1 font-medium">{manualConfig.bankName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {lang === "mn" ? "Dansny ner" : "Account name"}
                  </p>
                  <p className="mt-1 font-medium">{manualConfig.accountName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {lang === "mn" ? "Dansny dugaar" : "Account number"}
                  </p>
                  <p className="mt-1 font-mono text-sm">{manualConfig.accountNumber}</p>
                </div>
              </div>
              {manualConfig.note ? (
                <p className="mt-3 text-sm text-muted-foreground">{manualConfig.note}</p>
              ) : null}
              {latestManualRequest.review_note ? (
                <p className="mt-3 text-sm text-muted-foreground">{latestManualRequest.review_note}</p>
              ) : null}
            </div>
          )}
        </Card>
      ) : null}

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
            max={
              limits.responsesPerSurvey === Infinity
                ? Infinity
                : limits.responsesPerSurvey * Math.max(1, surveyCount)
            }
            unlimitedLabel={t("billing.unlimited")}
          />
        </div>
      </Card>

      <Card className="p-6">
        <p className="mb-4 font-semibold">
          {lang === "mn" ? "Багцын боломжууд" : "Included features"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.label}
              className={`flex items-center gap-3 rounded-xl border p-3 ${feature.on ? "" : "opacity-60"}`}
            >
              <div
                className={`rounded-lg p-2 ${feature.on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                <feature.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{feature.label}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {feature.on ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {feature.on
                    ? lang === "mn"
                      ? "Нээлттэй"
                      : "Enabled"
                    : lang === "mn"
                      ? "Хаалттай"
                      : "Locked"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function UsageBar({
  icon,
  label,
  value,
  max,
  unlimitedLabel,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  max: number;
  unlimitedLabel: string;
}) {
  const unlimited = isUnlimited(max);
  const percentage = unlimited ? 0 : Math.min(100, (value / Math.max(1, max)) * 100);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold">
          {value}
          {unlimited ? "" : ` / ${max}`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${percentage > 80 ? "bg-destructive" : "bg-primary"}`}
          style={{
            width: unlimited ? "100%" : `${percentage}%`,
            opacity: unlimited ? 0.4 : 1,
          }}
        />
      </div>
      {unlimited && <p className="mt-1 text-xs text-muted-foreground">{unlimitedLabel}</p>}
    </div>
  );
}
