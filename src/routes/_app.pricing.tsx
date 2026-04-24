import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { usePlan } from "@/components/formly/PlanProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { PLAN_PRICE, type Plan } from "@/lib/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pricing")({
  head: () => ({ meta: [{ title: "Үнэ — Formly" }] }),
  component: Pricing,
});

function Pricing() {
  const { plan, setPlan } = usePlan();
  const { t, lang } = useI18n();

  const tiers: { id: Plan; name: string; features: string[]; highlight?: boolean }[] = [
    {
      id: "free",
      name: t("plan.free"),
      features:
        lang === "mn"
          ? ["3 судалгаа хүртэл", "Судалгаа тус бүр 100 хариулт", "Энгийн аналитик", "Public холбоос", "Formly watermark"]
          : ["Up to 3 surveys", "100 responses per survey", "Basic analytics", "Public sharing link", "Formly watermark"],
    },
    {
      id: "pro",
      name: t("plan.pro"),
      highlight: true,
      features:
        lang === "mn"
          ? ["Хязгааргүй судалгаа", "Хязгааргүй хариулт", "Дэвшилтэт аналитик + газрын зураг", "AI generator + summary", "CSV / PDF экспорт", "Watermark байхгүй"]
          : ["Unlimited surveys", "Unlimited responses", "Advanced analytics + map", "AI generator + summary", "CSV / PDF export", "No watermark"],
    },
    {
      id: "team",
      name: t("plan.team"),
      features:
        lang === "mn"
          ? ["Pro доторх бүх боломж", "Олон хэрэглэгчийн workspace", "Гишүүн урих", "Хуваалцсан судалгаа"]
          : ["Everything in Pro", "Multi-user workspace", "Invite members", "Shared surveys"],
    },
  ];

  const choose = async (p: Plan) => {
    await setPlan(p);
    toast.success(t("plan.activated"));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("pricing.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pricing.desc")}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const active = plan === tier.id;
          return (
            <Card
              key={tier.id}
              className={`relative flex flex-col p-6 ${tier.highlight ? "border-primary shadow-lg" : ""}`}
            >
              {tier.highlight && (
                <Badge className="absolute -top-3 right-6">
                  <Sparkles className="mr-1 h-3 w-3" /> Popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-2 text-3xl font-bold">{lang === "mn" ? PLAN_PRICE[tier.id].mn : PLAN_PRICE[tier.id].en}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6"
                variant={active ? "outline" : tier.highlight ? "default" : "secondary"}
                disabled={active}
                onClick={() => choose(tier.id)}
              >
                {active ? t("plan.current") : tier.id === "free" ? t("plan.downgrade") : t("plan.upgrade")}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}