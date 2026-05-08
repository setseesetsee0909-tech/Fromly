"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutList,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_PRICE, type Plan } from "@/lib/plans";
import { toast } from "sonner";

type Tier = {
  id: Plan;
  name: string;
  features: string[];
  highlight?: boolean;
};

type CheckoutState = "idle" | "processing";

export function PricingPage() {
  const { plan, setPlan } = usePlan();
  const { session, user } = useAuth();
  const { t, lang } = useI18n();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState("");

  const copy =
    lang === "mn"
      ? {
          popular: "Popular",
          compareTitle: "Ямар үед аль төлөвлөгөө тохирох вэ?",
          compareCards: [
            {
              icon: LayoutList,
              title: "Үнэгүй",
              text: "Жижиг туршилт, анхны survey, хурдан эхлэх хэрэглээнд тохирно.",
            },
            {
              icon: Zap,
              title: "Pro",
              text: "AI, экспорт, дэвшилтэт аналитик хэрэгтэй бие даасан хэрэглэгчдэд тохирно.",
            },
            {
              icon: Users,
              title: "Баг",
              text: "Олон гишүүнтэй хамтын workspace, shared survey ашиглах багт тохирно.",
            },
          ],
          summaryTitle: "Хурдан харьцуулалт",
          summaryRows: [
            { label: "Судалгааны тоо", free: "3 хүртэл", pro: "Хязгааргүй", team: "Хязгааргүй" },
            {
              label: "Хариултын хэмжээ",
              free: "100 / survey",
              pro: "Хязгааргүй",
              team: "Хязгааргүй",
            },
            { label: "AI болон экспорт", free: "Байхгүй", pro: "Байна", team: "Байна" },
            {
              label: "Багийн хамтын ажиллагаа",
              free: "Байхгүй",
              pro: "Хязгаарлагдмал",
              team: "Бүрэн",
            },
          ],
          signInFirst: "Эхлээд нэвтэрнэ үү.",
          checkoutTitle: "Checkout",
          checkoutDescription:
            "Энэ урсгал бодит карт цэнэглэхгүй. Гэхдээ хэрэглэгчид жинхэнэ upgrade шиг мэдрэмж авахуйц байдлаар ажиллана.",
          checkoutBadge: "Туршилтын горим",
          checkoutStep: "Алхам 2/2",
          checkoutHeroTitle: "Төлөвлөгөөгөө баталгаажуулаад шууд идэвхжүүлээрэй",
          checkoutHeroText:
            "Payment UI нь жинхэнэ checkout шиг харагдана. Баталсны дараа verification дэлгэцээр орж plan тань автоматаар шинэчлэгдэнэ.",
          checkoutSummary: "Төлбөрийн мэдээлэл",
          checkoutWorkspace: "Workspace",
          checkoutPlan: "Сонгосон plan",
          checkoutBilling: "Billing email",
          checkoutMethod: "Төлбөрийн арга",
          checkoutCard: "Visa төгсгөл 4242",
          checkoutProtected: "SSL хамгаалалттай төлбөрийн урсгал",
          checkoutNotice: "Бодит мөнгө авахгүй. Баталгаажуулсны дараа plan шууд идэвхжинэ.",
          checkoutCancel: "Болих",
          checkoutConfirm: "Төлбөр батлах",
          checkoutProcessing: "Checkout бэлдэж байна...",
          includedTitle: "Идэвхжих боломжууд",
          redirectHint: "Дараагийн алхамд verification дэлгэц рүү автоматаар шилжинэ.",
          unableToCreate: "Checkout session үүсгэж чадсангүй.",
          dueToday: "Өнөөдөр дүн",
          renewsOn: "Дараагийн сунгалт",
          renewsValue: "30 хоногийн дараа туршилтын хэлбэрээр",
          instantActivation: "Instant activation",
          instantActivationText:
            "Баталгаажуулмагц plan, usage limit, feature access шууд шинэчлэгдэнэ.",
          receiptText: "Receipt-style баталгаажуулалт verification хуудсан дээр харагдана.",
          securePill: "Secure checkout",
          secureLine: "PCI-тэй төстэй туршилтын интерфэйс",
          noChargeLine: "Бодит мөнгө огт суутгахгүй",
          workspaceName: "Formly Workspace",
        }
      : {
          popular: "Popular",
          compareTitle: "Which plan fits your needs best?",
          compareCards: [
            {
              icon: LayoutList,
              title: "Free",
              text: "Best for trying the product, creating your first surveys, and getting started quickly.",
            },
            {
              icon: Zap,
              title: "Pro",
              text: "Best for individuals who need AI, exports, and deeper analytics.",
            },
            {
              icon: Users,
              title: "Team",
              text: "Best for shared workspaces, invited teammates, and collaborative research.",
            },
          ],
          summaryTitle: "Quick comparison",
          summaryRows: [
            { label: "Survey count", free: "Up to 3", pro: "Unlimited", team: "Unlimited" },
            { label: "Responses", free: "100 per survey", pro: "Unlimited", team: "Unlimited" },
            { label: "AI and export", free: "No", pro: "Yes", team: "Yes" },
            { label: "Team collaboration", free: "No", pro: "Limited", team: "Full" },
          ],
          signInFirst: "Please sign in first.",
          checkoutTitle: "Checkout",
          checkoutDescription:
            "This flow does not charge a real card, but it behaves like a realistic upgrade preview for presentations and testing.",
          checkoutBadge: "Mock payment",
          checkoutStep: "Step 2 of 2",
          checkoutHeroTitle: "Confirm your plan and activate access instantly",
          checkoutHeroText:
            "The payment UI is presentation-ready and behaves like a real checkout. After confirmation, the verification screen activates your plan automatically.",
          checkoutSummary: "Payment details",
          checkoutWorkspace: "Workspace",
          checkoutPlan: "Selected plan",
          checkoutBilling: "Billing email",
          checkoutMethod: "Payment method",
          checkoutCard: "Visa ending in 4242",
          checkoutProtected: "Secure checkout",
          checkoutNotice:
            "No real charge is made. Your plan is activated right after confirmation.",
          checkoutCancel: "Cancel",
          checkoutConfirm: "Confirm payment",
          checkoutProcessing: "Preparing checkout...",
          includedTitle: "Included with this upgrade",
          redirectHint: "You will continue to the verification screen next.",
          unableToCreate: "Unable to create checkout session.",
          dueToday: "Due today",
          renewsOn: "Renews",
          renewsValue: "In 30 days as part of the preview flow",
          instantActivation: "Instant activation",
          instantActivationText:
            "As soon as you confirm, your plan, usage limits, and feature access update right away.",
          receiptText: "A receipt-style confirmation appears on the verification screen.",
          securePill: "Secure checkout",
          secureLine: "PCI-style preview interface",
          noChargeLine: "No real funds are captured",
          workspaceName: "Formly Workspace",
        };

  const tiers: Tier[] = [
    {
      id: "free",
      name: t("plan.free"),
      features:
        lang === "mn"
          ? [
              "3 судалгаа хүртэл",
              "Судалгаа тус бүр 100 хариулт",
              "Энгийн аналитик",
              "Public холбоос",
              "Formly watermark",
            ]
          : [
              "Up to 3 surveys",
              "100 responses per survey",
              "Basic analytics",
              "Public survey link",
              "Formly watermark",
            ],
    },
    {
      id: "pro",
      name: t("plan.pro"),
      highlight: true,
      features:
        lang === "mn"
          ? [
              "Хязгааргүй судалгаа",
              "Хязгааргүй хариулт",
              "Дэвшилтэт аналитик + газрын зураг",
              "AI generator + summary",
              "CSV / PDF экспорт",
              "Watermark байхгүй",
            ]
          : [
              "Unlimited surveys",
              "Unlimited responses",
              "Advanced analytics and map view",
              "AI generator and summaries",
              "CSV and PDF export",
              "No watermark",
            ],
    },
    {
      id: "team",
      name: t("plan.team"),
      features:
        lang === "mn"
          ? [
              "Pro доторх бүх боломж",
              "Олон хэрэглэгчийн workspace",
              "Гишүүн урих",
              "Хуваалцсан судалгаа",
            ]
          : ["Everything in Pro", "Multi-user workspace", "Invite teammates", "Shared surveys"],
    },
  ];

  const selectedTier = tiers.find((tier) => tier.id === checkoutPlan) ?? null;

  const closeCheckout = (open: boolean) => {
    if (checkoutState === "processing") {
      return;
    }

    if (!open) {
      setCheckoutPlan(null);
      setCheckoutState("idle");
      setCheckoutError("");
    }
  };

  const choose = async (nextPlan: Plan) => {
    if (!user) {
      toast.error(copy.signInFirst);
      return;
    }

    if (nextPlan === "free") {
      try {
        await setPlan(nextPlan);
        toast.success(t("plan.activated"));
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : copy.unableToCreate;
        toast.error(message);
      }
      return;
    }

    setCheckoutPlan(nextPlan);
    setCheckoutState("idle");
    setCheckoutError("");
  };

  const confirmCheckout = async () => {
    if (!checkoutPlan || !user?.email || !session?.access_token) {
      toast.error(copy.signInFirst);
      return;
    }

    setCheckoutState("processing");
    setCheckoutError("");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900));

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: checkoutPlan,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string; url?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || data.message || copy.unableToCreate);
      }

      window.location.href = data.url;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : copy.unableToCreate;
      setCheckoutError(message);
      setCheckoutState("idle");
      toast.error(message);
    }
  };

  return (
    <>
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
                    <Sparkles className="mr-1 h-3 w-3" /> {copy.popular}
                  </Badge>
                )}
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {lang === "mn" ? PLAN_PRICE[tier.id].mn : PLAN_PRICE[tier.id].en}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={active ? "outline" : tier.highlight ? "default" : "secondary"}
                  disabled={active}
                  onClick={() => void choose(tier.id)}
                >
                  {active
                    ? t("plan.current")
                    : tier.id === "free"
                      ? t("plan.downgrade")
                      : t("plan.upgrade")}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">{copy.compareTitle}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {copy.compareCards.map((item) => (
                <div key={item.title} className="rounded-xl border bg-primary/[0.03] p-4">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">{copy.summaryTitle}</h2>
            <div className="mt-5 space-y-3">
              {copy.summaryRows.map((row) => (
                <div key={row.label} className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-medium">{row.label}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <p className="font-semibold text-foreground">
                        {lang === "mn" ? "Үнэгүй" : "Free"}
                      </p>
                      <p className="mt-1">{row.free}</p>
                    </div>
                    <div className="rounded-lg bg-primary/[0.05] px-3 py-2">
                      <p className="font-semibold text-foreground">Pro</p>
                      <p className="mt-1">{row.pro}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <p className="font-semibold text-foreground">
                        {lang === "mn" ? "Баг" : "Team"}
                      </p>
                      <p className="mt-1">{row.team}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selectedTier)} onOpenChange={closeCheckout}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-primary/10 bg-background p-0 shadow-2xl sm:max-w-[920px]">
          <DialogHeader className="sr-only">
            <DialogTitle>{copy.checkoutTitle}</DialogTitle>
            <DialogDescription>{copy.checkoutDescription}</DialogDescription>
          </DialogHeader>

          {selectedTier ? (
            <div className="grid lg:grid-cols-[1fr_1.02fr]">
              <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-5 text-primary-foreground sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_36%,transparent_72%,rgba(255,255,255,0.06)_100%)]" />
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/12 blur-3xl" />
                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-none hover:bg-white/10">
                      {copy.checkoutBadge}
                    </Badge>
                    <Badge className="border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-none hover:bg-white/10">
                      {copy.checkoutStep}
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{copy.securePill}</span>
                    </div>
                    <h2 className="max-w-sm text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-[1.14] tracking-tight">
                      {copy.checkoutHeroTitle}
                    </h2>
                    <p className="max-w-md text-[14px] leading-6 text-primary-foreground/80 sm:text-[15px]">
                      {copy.checkoutHeroText}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/20 bg-white/12 p-4 shadow-[0_18px_40px_rgba(37,99,235,0.18)] backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-primary-foreground/70">
                          {copy.checkoutSummary}
                        </p>
                        <p className="mt-2 text-[2rem] font-semibold leading-none sm:text-[2.2rem]">
                          {lang === "mn"
                            ? PLAN_PRICE[selectedTier.id].mn
                            : PLAN_PRICE[selectedTier.id].en}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/12 p-2.5 text-white">
                        <CreditCard className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2.5 text-[14px] text-white/90">
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-primary-foreground/72">
                            {copy.checkoutWorkspace}
                          </span>
                        </div>
                        <span className="font-semibold">{copy.workspaceName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-primary-foreground/72">{copy.checkoutPlan}</span>
                        </div>
                        <span className="font-semibold">{selectedTier.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-primary-foreground/72">{copy.checkoutBilling}</span>
                        </div>
                        <span className="max-w-[220px] truncate text-right font-semibold">
                          {user?.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-white/70" />
                          <span className="text-primary-foreground/72">{copy.checkoutMethod}</span>
                        </div>
                        <span className="font-semibold">{copy.checkoutCard}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/62">
                        {copy.instantActivation}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-5 text-primary-foreground/86">
                        {copy.instantActivationText}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/62">
                        {copy.securePill}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-5 text-primary-foreground/86">
                        {copy.secureLine}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/62">
                        {copy.checkoutBadge}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-5 text-primary-foreground/86">
                        {copy.noChargeLine}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col bg-background p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {copy.checkoutTitle}
                        </p>
                        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                          {selectedTier.name}
                        </h3>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                        {copy.checkoutBadge}
                      </Badge>
                    </div>
                    <p className="text-[14px] leading-6 text-muted-foreground">
                      {copy.checkoutDescription}
                    </p>
                  </div>

                  <div className="rounded-3xl border bg-muted/[0.35] p-4">
                    <div className="flex items-end justify-between gap-4 border-b pb-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {copy.dueToday}
                        </p>
                        <p className="mt-1 text-[1.9rem] font-semibold leading-none">
                          ${PLAN_PRICE[selectedTier.id].usd.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right text-[13px] text-muted-foreground">
                        <p>{copy.renewsOn}</p>
                        <p className="mt-1 font-medium text-foreground">{copy.renewsValue}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 text-[14px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{copy.checkoutPlan}</span>
                        <span className="font-semibold">{selectedTier.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{copy.checkoutMethod}</span>
                        <span className="font-semibold">{copy.checkoutCard}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{copy.checkoutBilling}</span>
                        <span className="max-w-[220px] truncate text-right font-semibold">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-3xl border p-4">
                    <div>
                      <p className="text-base font-semibold">{copy.includedTitle}</p>
                      <p className="mt-1 text-[14px] leading-6 text-muted-foreground">
                        {copy.redirectHint}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {selectedTier.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3 rounded-2xl bg-primary/[0.05] px-4 py-3 text-[14px] leading-6"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold">{copy.checkoutProtected}</p>
                        <p className="text-[14px] leading-6 text-muted-foreground">
                          {copy.checkoutNotice}
                        </p>
                        <p className="text-[14px] leading-6 text-muted-foreground">
                          {copy.receiptText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {checkoutError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                      {checkoutError}
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="mt-5 border-t pt-4 sm:justify-between">
                  <Button
                    variant="secondary"
                    onClick={() => closeCheckout(false)}
                    disabled={checkoutState === "processing"}
                  >
                    {copy.checkoutCancel}
                  </Button>
                  <Button
                    className="min-w-[220px]"
                    onClick={() => void confirmCheckout()}
                    disabled={checkoutState === "processing"}
                  >
                    {checkoutState === "processing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {copy.checkoutProcessing}
                      </>
                    ) : (
                      copy.checkoutConfirm
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
