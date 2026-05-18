"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  LayoutList,
  Loader2,
  Lock,
  Mail,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ManualBillingConfig } from "@/lib/manual-billing";
import { PLAN_PRICE, type Plan } from "@/lib/plans";
import type { BillingCheckoutMode } from "@/lib/billing-checkout";
import { toast } from "sonner";

type Tier = {
  id: Plan;
  name: string;
  features: string[];
  highlight?: boolean;
};

type CheckoutState = "idle" | "processing";

type QPayInvoiceLink = {
  description?: string;
  link?: string;
  name?: string;
};

type QPayInvoice = {
  amount: number;
  invoiceId: string;
  qrImageDataUrl: string;
  qrText: string;
  urls: QPayInvoiceLink[];
  verifyToken: string;
};

type MonPaySession = {
  amount: number;
  customerPhone: string;
  requestId: string;
  transactionId: string;
  verifyToken: string;
};

type PricingPageProps = {
  checkoutMode: BillingCheckoutMode;
  manualConfig: ManualBillingConfig;
};

export function PricingPage({ checkoutMode, manualConfig }: PricingPageProps) {
  const router = useRouter();
  const { plan, refresh, setPlan } = usePlan();
  const { session, user } = useAuth();
  const { t, lang } = useI18n();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [monpayConfirmState, setMonPayConfirmState] = useState<CheckoutState>("idle");
  const [monpayPhoneNumber, setMonPayPhoneNumber] = useState("");
  const [monpaySession, setMonPaySession] = useState<MonPaySession | null>(null);
  const [monpayTanCode, setMonPayTanCode] = useState("");
  const [qpayInvoice, setQPayInvoice] = useState<QPayInvoice | null>(null);
  const [qpayVerifyState, setQPayVerifyState] = useState<CheckoutState>("idle");
  const [manualPayerName, setManualPayerName] = useState("");
  const [manualTransferReference, setManualTransferReference] = useState("");
  const [manualNote, setManualNote] = useState("");
  const qpayVerificationInFlight = useRef(false);

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
          checkoutTitle: "Төлбөр",
          checkoutDescription:
            "Энэ урсгал бодит карт цэнэглэхгүй. Гэхдээ хэрэглэгчид жинхэнэ upgrade шиг мэдрэмж авахуйц байдлаар ажиллана.",
          checkoutBadge: "Туршилтын горим",
          checkoutStep: "Алхам 2/2",
          checkoutHeroTitle: "Төлөвлөгөөгөө баталгаажуулаад шууд идэвхжүүлээрэй",
          checkoutHeroText:
            "Төлбөрийн хэсэг нь жинхэнэ төлбөрийн хуудас шиг харагдана. Баталгаажуулсны дараа шалгалтын дэлгэцээр орж төлөвлөгөө автоматаар шинэчлэгдэнэ.",
          checkoutSummary: "Төлбөрийн мэдээлэл",
          checkoutWorkspace: "Ажлын орчин",
          checkoutPlan: "Сонгосон төлөвлөгөө",
          checkoutBilling: "Төлбөрийн имэйл",
          checkoutMethod: "Төлбөрийн арга",
          checkoutCard: "Visa төгсгөл 4242",
          checkoutProtected: "SSL хамгаалалттай төлбөрийн урсгал",
          checkoutNotice: "Бодит мөнгө авахгүй. Баталгаажуулсны дараа төлөвлөгөө шууд идэвхжинэ.",
          checkoutCancel: "Болих",
          checkoutConfirm: "Төлбөр батлах",
          checkoutProcessing: "Төлбөрийн хэсгийг бэлдэж байна...",
          includedTitle: "Идэвхжих боломжууд",
          redirectHint: "Дараагийн алхамд шалгалтын дэлгэц рүү автоматаар шилжинэ.",
          unableToCreate: "Төлбөрийн сесс үүсгэж чадсангүй.",
          dueToday: "Өнөөдрийн дүн",
          renewsOn: "Дараагийн сунгалт",
          renewsValue: "30 хоногийн дараа туршилтын хэлбэрээр",
          instantActivation: "Шууд идэвхжил",
          instantActivationText:
            "Баталгаажуулмагц төлөвлөгөө, ашиглалтын хязгаар, боломжууд шууд шинэчлэгдэнэ.",
          receiptText: "Баримт хэлбэрийн баталгаажуулалт шалгалтын хуудсан дээр харагдана.",
          securePill: "Аюулгүй төлбөр",
          secureLine: "PCI-тэй төстэй туршилтын интерфэйс",
          noChargeLine: "Бодит мөнгө огт суутгахгүй",
          workspaceName: "Formly ажлын орчин",
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

  const isStripeHostedCheckout = checkoutMode === "stripe_test" || checkoutMode === "stripe_live";
  const isManualCheckout = checkoutMode === "manual";
  const isMonPayCheckout = checkoutMode === "monpay";
  const isQPayCheckout = checkoutMode === "qpay";
  const checkoutUnavailableMessage =
    lang === "mn"
      ? "Төлбөрийн үйлчилгээний тохиргоо дутуу байна. Manual bank transfer, QPay, MonPay эсвэл Stripe-ийн env утгуудаа шалгана уу."
      : "Billing checkout is not configured yet. Please check your manual billing, QPay, MonPay, or Stripe environment values.";
  const checkoutBadgeLabel =
    checkoutMode === "stripe_live"
      ? lang === "mn"
        ? "Stripe live"
        : "Stripe Live"
      : checkoutMode === "stripe_test"
        ? lang === "mn"
          ? "Stripe test"
          : "Stripe Test"
        : checkoutMode === "manual"
          ? lang === "mn"
            ? "Банкны шилжүүлэг"
            : "Bank Transfer"
          : checkoutMode === "monpay"
            ? "MonPay TAN"
            : checkoutMode === "qpay"
              ? "QPay QR"
              : checkoutMode === "unavailable"
                ? "Billing Setup"
                : copy.checkoutBadge;
  const checkoutDescriptionText = isStripeHostedCheckout
    ? lang === "mn"
      ? "Баталгаажуулсны дараа Stripe Checkout руу шилжиж, Visa эсвэл Stripe дэмждэг картаар төлбөрөө хийнэ."
      : "After you confirm, we redirect you to Stripe Checkout where you can pay with Visa or another Stripe-supported card."
    : isManualCheckout
      ? lang === "mn"
        ? "Банкны данс руу шилжүүлэг хийгээд гүйлгээний мэдээллээ илгээнэ. Админ төлбөрийг шалгасны дараа төлөвлөгөөг идэвхжүүлнэ."
        : "Send a bank transfer, then submit the transfer reference here. An admin reviews the payment and activates the plan."
      : isMonPayCheckout
        ? lang === "mn"
          ? "Баталгаажуулсны дараа MonPay-аас SMS-ээр TAN код ирнэ. Эхлээд утасны дугаараа оруулаад, дараа нь ирсэн кодоор төлбөрөө баталгаажуулна."
          : "After you confirm, MonPay sends a TAN code by SMS. Enter your phone number first, then confirm the payment with the TAN code."
        : isQPayCheckout
          ? lang === "mn"
            ? "Баталгаажуулсны дараа QPay нэхэмжлэл үүснэ. QR код эсвэл банкны аппын холбоосоор төлбөрөө хийж болно."
            : "After you confirm, we create a QPay invoice so you can pay with a QR code or a supported banking app."
          : checkoutMode === "unavailable"
            ? checkoutUnavailableMessage
            : copy.checkoutDescription;
  const checkoutHeroText = isStripeHostedCheckout
    ? lang === "mn"
      ? "Formly захиалгаа Stripe-аар аюулгүй баталгаажуулна. Картын мэдээллээ Stripe-ийн хамгаалалттай хуудсан дээр оруулна."
      : "Complete your Formly subscription securely with Stripe. Card details are entered on Stripe's hosted checkout page."
    : isManualCheckout
      ? lang === "mn"
        ? "Formly төлөвлөгөөгөө банкны шилжүүлгээр төлж, гүйлгээний мэдээллээ илгээнэ. Админ баталгаажуулсны дараа эрх шинэчлэгдэнэ."
        : "Pay for your Formly plan with a bank transfer and submit the transfer details. Access updates after admin approval."
      : isMonPayCheckout
        ? lang === "mn"
          ? "Formly захиалгаа MonPay-аар SMS TAN код ашиглан баталгаажуулж төлбөрөө хийж болно."
          : "Complete your Formly subscription with MonPay using an SMS TAN code when QPay is not available."
        : isQPayCheckout
          ? lang === "mn"
            ? "Formly захиалгаа QPay-аар төлж, Монголын банкны апп эсвэл QR-аар ахиулна."
            : "Pay for your Formly subscription with QPay using a QR code or a supported Mongolian banking app."
          : checkoutMode === "unavailable"
            ? checkoutUnavailableMessage
            : copy.checkoutHeroText;
  const checkoutCardLabel = isStripeHostedCheckout
    ? checkoutMode === "stripe_test"
      ? "Visa 4242 4242 4242 4242"
      : "Visa / Mastercard / Card"
    : isManualCheckout
      ? lang === "mn"
        ? "Банкны шилжүүлэг"
        : "Bank transfer"
      : isMonPayCheckout
        ? "MonPay SMS TAN"
        : isQPayCheckout
          ? lang === "mn"
            ? "QPay QR / Банкны апп"
            : "QPay QR / Bank app"
          : copy.checkoutCard;
  const checkoutNoticeText =
    checkoutMode === "stripe_live"
      ? lang === "mn"
        ? "Энэ бол жинхэнэ Stripe захиалгын төлбөр. Амжилттай болсны дараа төлөвлөгөө автоматаар идэвхжинэ."
        : "This is a real Stripe subscription payment. Your plan activates automatically after successful checkout."
      : checkoutMode === "stripe_test"
        ? lang === "mn"
          ? "Stripe test горимд Visa 4242 4242 4242 4242 картаар шалгаж болно. Бодит мөнгө суутгахгүй."
          : "This uses Stripe test mode. You can verify the flow with the Visa test card 4242 4242 4242 4242."
        : isManualCheckout
          ? lang === "mn"
            ? "Төлбөр хийсний дараа админ гараар шалгаж баталгаажуулна. Хүсэлт хүлээгдэж байх хугацаанд төлөв нь төлбөрийн хэсэгт харагдана."
            : "After you send the transfer, an admin reviews it manually. The pending status remains visible on the billing page."
          : isMonPayCheckout
            ? lang === "mn"
              ? "MonPay бүртгэлтэй хэрэглэгчийн утас руу TAN код мессежээр очно. Тэр кодыг энд оруулж төлбөрөө баталгаажуулна."
              : "A TAN code is sent to the customer's phone by SMS. Enter that code here to confirm the payment."
            : isQPayCheckout
              ? lang === "mn"
                ? "QR кодоо уншуулах эсвэл банкны апп нээгээд төлбөрөө хийсний дараа энэ дэлгэц дээр автоматаар шалгана."
                : "Scan the QR code or open a banking app to pay, then we verify the payment here automatically."
              : checkoutMode === "unavailable"
                ? checkoutUnavailableMessage
                : copy.checkoutNotice;
  const secureLineText = isStripeHostedCheckout
    ? lang === "mn"
      ? "Stripe-ийн хамгаалалттай төлбөрийн хуудас"
      : "Stripe-hosted PCI-compliant checkout"
    : isManualCheckout
      ? lang === "mn"
        ? "Админаар шалгагдах банкны шилжүүлэг"
        : "Manual bank transfer with admin review"
      : isMonPayCheckout
        ? lang === "mn"
          ? "SMS TAN баталгаажуулалттай MonPay API"
          : "MonPay partner API with SMS-based TAN confirmation"
        : isQPayCheckout
          ? lang === "mn"
            ? "Банкны апп холбоостой QPay QR нэхэмжлэл"
            : "QPay QR invoice with bank app deep links"
          : checkoutMode === "unavailable"
            ? "Billing provider credentials are required"
            : copy.secureLine;
  const modeLineText =
    checkoutMode === "stripe_live"
      ? lang === "mn"
        ? "Шууд картын төлбөр"
        : "Live card payment"
      : checkoutMode === "stripe_test"
        ? lang === "mn"
          ? "Ашиглалтад орохоос өмнө Stripe test картаар шалгана"
          : "Use Stripe test cards before going live"
        : isManualCheckout
          ? lang === "mn"
            ? "Банкны шилжүүлгээр төлөөд баталгаажуулалт хүлээнэ"
            : "Pay by bank transfer and wait for approval"
          : isMonPayCheckout
            ? lang === "mn"
              ? "Утасны дугаараар MonPay төлбөр хийж TAN кodoор баталгаажуулна"
              : "MonPay phone-number payment with TAN code confirmation"
            : isQPayCheckout
              ? "Монгол банкны апп болон QPay QR төлбөр"
              : checkoutMode === "unavailable"
                ? lang === "mn"
                  ? "Төлбөр хүлээж авахаас өмнө provider-ийн тохиргоо шаардлагатай"
                  : "Provider setup needed before accepting payments"
                : copy.noChargeLine;
  const redirectHintText = isStripeHostedCheckout
    ? lang === "mn"
      ? "Баталгаажуулсны дараа Stripe руу шилжиж картын мэдээллээ оруулна."
      : "After you confirm, you'll continue to Stripe to enter your card details."
    : isManualCheckout
      ? lang === "mn"
        ? "Доорх банкны мэдээллээр шилжүүлэг хийгээд, дараа нь төлөгчийн нэр, гүйлгээний утга, тайлбараа илгээн хүсэлт үүсгэнэ."
        : "Use the bank details below to pay, then submit the payer name, transfer reference, and note for review."
      : isMonPayCheckout
        ? lang === "mn"
          ? "Эхлээд утасны дугаараа оруулж TAN код авна, дараа нь мессежээр ирсэн кодоо оруулж төлөвлөгөөгөө идэвхжүүлнэ."
          : "First enter the phone number to receive a TAN code, then enter the SMS code to activate the plan."
        : isQPayCheckout
          ? lang === "mn"
            ? "Баталгаажуулсны дараа QR код болон аппын холбоосууд харагдана. Төлбөрийг хийсний дараа систем автоматаар шалгана."
            : "After you confirm, you'll see the QR code and app links. We then verify the payment automatically."
          : checkoutMode === "unavailable"
            ? checkoutUnavailableMessage
            : copy.redirectHint;
  const renewsValueText = isStripeHostedCheckout
    ? lang === "mn"
      ? "Сарын захиалга, цуцлах хүртэл автоматаар сунгагдана"
      : "Monthly subscription until canceled"
    : isManualCheckout
      ? lang === "mn"
        ? "Админ баталгаажуулсны дараа төлөвлөгөө идэвхжинэ"
        : "Activates after the transfer is approved"
      : isMonPayCheckout
        ? lang === "mn"
          ? "MonPay-аар баталгаажуулсны дараа шууд идэвхжинэ"
          : "Activates right after the MonPay TAN confirmation"
        : isQPayCheckout
          ? lang === "mn"
            ? "QPay-аар төлсний дараа захиалга идэвхжинэ"
            : "Subscription activated after QPay payment"
          : copy.renewsValue;
  const checkoutActionLabel = isStripeHostedCheckout
    ? lang === "mn"
      ? "Stripe руу үргэлжлүүлэх"
      : "Continue to Stripe"
    : isManualCheckout
      ? lang === "mn"
        ? "Хүсэлт илгээх"
        : "Submit request"
      : isMonPayCheckout
        ? lang === "mn"
          ? "TAN код авах"
          : "Send TAN code"
        : isQPayCheckout
          ? lang === "mn"
            ? "QPay нэхэмжлэл үүсгэх"
            : "Create QPay invoice"
          : copy.checkoutConfirm;

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
  const manualAmount =
    selectedTier?.id === "pro" || selectedTier?.id === "team"
      ? manualConfig.planAmounts[selectedTier.id]
      : null;

  const closeCheckout = (open: boolean) => {
    if (checkoutState === "processing" || monpayConfirmState === "processing") {
      return;
    }

    if (!open) {
      setCheckoutPlan(null);
      setCheckoutState("idle");
      setCheckoutError("");
      setMonPayConfirmState("idle");
      setMonPayPhoneNumber("");
      setMonPaySession(null);
      setMonPayTanCode("");
      setManualPayerName("");
      setManualTransferReference("");
      setManualNote("");
      setQPayInvoice(null);
      setQPayVerifyState("idle");
    }
  };

  const choose = async (nextPlan: Plan) => {
    if (!user) {
      toast.message(
        lang === "mn" ? "Ehleed nevtreed urgeljluulne uu." : "Sign in to continue to checkout.",
      );
      router.push("/login");
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

    if (checkoutMode === "unavailable") {
      toast.error(checkoutUnavailableMessage);
      return;
    }

    setCheckoutPlan(nextPlan);
    setCheckoutState("idle");
    setCheckoutError("");
    setMonPayConfirmState("idle");
    setMonPayPhoneNumber("");
    setMonPaySession(null);
    setMonPayTanCode("");
    setManualPayerName(
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : (user.email ?? ""),
    );
    setManualTransferReference("");
    setManualNote("");
    setQPayInvoice(null);
    setQPayVerifyState("idle");
  };

  const confirmMonPayTanCode = async () => {
    if (!monpaySession || !monpayTanCode.trim() || !session?.access_token) {
      toast.error(
        lang === "mn"
          ? "Messageer irsen TAN code-oo oruulna uu."
          : "Please enter the TAN code sent by SMS.",
      );
      return;
    }

    setMonPayConfirmState("processing");
    setCheckoutError("");

    try {
      const response = await fetch("/api/monpay/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tanCode: monpayTanCode,
          verifyToken: monpaySession.verifyToken,
        }),
      });

      const data = (await response.json()) as { error?: string; success?: boolean };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to confirm MonPay payment.");
      }

      await refresh();
      toast.success(
        lang === "mn" ? "Төлөвлөгөө амжилттай идэвхжлээ." : "Plan activated successfully.",
      );
      window.location.href = "/billing";
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : lang === "mn"
            ? "MonPay tulbur batalgaazhuulahad aldaa garlaa."
            : "Unable to confirm the MonPay payment.";

      setCheckoutError(message);
      toast.error(message);
    } finally {
      setMonPayConfirmState("idle");
    }
  };

  const verifyQPayPayment = useCallback(
    async (showPendingToast: boolean) => {
      if (!qpayInvoice || !session?.access_token) {
        return false;
      }

      if (qpayVerificationInFlight.current) {
        return false;
      }

      qpayVerificationInFlight.current = true;
      setQPayVerifyState("processing");

      try {
        const response = await fetch("/api/qpay/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            verifyToken: qpayInvoice.verifyToken,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          paymentStatus?: string;
          success?: boolean;
        };

        if (!response.ok) {
          throw new Error(data.error || "Unable to verify QPay payment.");
        }

        if (!data.success) {
          const pendingMessage =
            lang === "mn"
              ? "Төлбөр баталгаажаагүй байна. Төлбөрөө хийгээд дахин шалгана уу."
              : "Payment is still pending. Complete the QPay payment and try again.";

          setCheckoutError(pendingMessage);
          setQPayVerifyState("idle");

          if (showPendingToast) {
            toast.message(pendingMessage);
          }

          return false;
        }

        await refresh();
        setCheckoutError("");
        setQPayVerifyState("idle");
        toast.success(
          lang === "mn" ? "Төлөвлөгөө амжилттай идэвхжлээ." : "Plan activated successfully.",
        );
        window.location.href = "/billing";
        return true;
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : lang === "mn"
              ? "QPay tulbur shalgahad aldaa garlaa."
              : "Unable to verify the QPay payment.";

        setCheckoutError(message);
        setQPayVerifyState("idle");

        if (showPendingToast) {
          toast.error(message);
        }

        return false;
      } finally {
        qpayVerificationInFlight.current = false;
      }
    },
    [lang, qpayInvoice, refresh, session?.access_token],
  );

  useEffect(() => {
    if (!qpayInvoice || !session?.access_token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void verifyQPayPayment(false);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [qpayInvoice, session?.access_token, verifyQPayPayment]);

  const confirmCheckout = async () => {
    if (!checkoutPlan || !user?.email || !session?.access_token) {
      toast.error(copy.signInFirst);
      return;
    }

    if (isManualCheckout) {
      if (!manualPayerName.trim()) {
        toast.error(lang === "mn" ? "Төлөгчийн нэрээ оруулна уу." : "Please enter the payer name.");
        return;
      }

      if (!manualTransferReference.trim()) {
        toast.error(
          lang === "mn"
            ? "Гүйлгээний утга эсвэл transaction ID-гаа оруулна уу."
            : "Please enter the transfer reference or transaction ID.",
        );
        return;
      }
    }

    if (isMonPayCheckout && !monpayPhoneNumber.trim()) {
      toast.error(
        lang === "mn"
          ? "MonPay утасны дугаараа оруулна уу."
          : "Please enter the MonPay phone number.",
      );
      return;
    }

    setCheckoutState("processing");
    setCheckoutError("");

    try {
      const response = await fetch(
        isManualCheckout
          ? "/api/manual-billing/create-request"
          : isMonPayCheckout
            ? "/api/monpay/create-payment"
            : isQPayCheckout
              ? "/api/qpay/create-invoice"
              : "/api/stripe/create-checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            note: manualNote,
            payerName: manualPayerName,
            phoneNumber: monpayPhoneNumber,
            plan: checkoutPlan,
            transferReference: manualTransferReference,
          }),
        },
      );

      const data = (await response.json()) as {
        amount?: number;
        error?: string;
        invoiceId?: string;
        message?: string;
        qrImageDataUrl?: string;
        qrText?: string;
        requestId?: string;
        request?: { id?: string };
        transactionId?: string;
        url?: string;
        urls?: QPayInvoiceLink[];
        verifyToken?: string;
      };

      if (isManualCheckout) {
        if (!response.ok || !data.request?.id) {
          throw new Error(data.error || data.message || copy.unableToCreate);
        }

        setCheckoutState("idle");
        setCheckoutError("");
        toast.success(
          lang === "mn"
            ? "Банкны шилжүүлгийн хүсэлт илгээгдлээ. Админ шалгасны дараа төлөвлөгөө идэвхжинэ."
            : "Your bank transfer request has been submitted. The plan activates after admin review.",
        );
        window.location.href = "/billing";
        return;
      }

      if (isMonPayCheckout) {
        if (!response.ok || !data.verifyToken || !data.requestId || !data.transactionId) {
          throw new Error(data.error || data.message || copy.unableToCreate);
        }

        setMonPaySession({
          amount: data.amount ?? PLAN_PRICE[checkoutPlan].usd,
          customerPhone: monpayPhoneNumber,
          requestId: data.requestId,
          transactionId: data.transactionId,
          verifyToken: data.verifyToken,
        });
        setCheckoutState("idle");
        setCheckoutError(
          lang === "mn"
            ? "TAN code messageer ilgeegdlee. Odoo kodoo oruulaad tulburuu batalgaajuulna uu."
            : "The TAN code has been sent by SMS. Enter it below to confirm the payment.",
        );
        return;
      }

      if (isQPayCheckout) {
        if (!response.ok || !data.invoiceId || !data.verifyToken) {
          throw new Error(data.error || data.message || copy.unableToCreate);
        }

        setQPayInvoice({
          amount: data.amount ?? PLAN_PRICE[checkoutPlan].usd,
          invoiceId: data.invoiceId,
          qrImageDataUrl: data.qrImageDataUrl ?? "",
          qrText: data.qrText ?? "",
          urls: Array.isArray(data.urls) ? data.urls : [],
          verifyToken: data.verifyToken,
        });
        setCheckoutState("idle");
        setCheckoutError(
          lang === "mn"
            ? "QR кодоо ашиглаад төлбөрөө хийнэ үү. Төлбөр орж ирмэгц автоматаар шалгана."
            : "Complete the payment with the QR code or bank app. We will verify it automatically.",
        );
        return;
      }

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
        <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const active = plan === tier.id;
            const needsBillingSetup = tier.id !== "free" && checkoutMode === "unavailable";
            const needsSignIn = tier.id !== "free" && !user;
            const actionHint = needsBillingSetup
              ? checkoutUnavailableMessage
              : needsSignIn
                ? lang === "mn"
                  ? "Upgrade hiihiin tuld ehleed nevterne uu."
                  : "Sign in first to start the upgrade flow."
                : null;
            return (
              <Card
                key={tier.id}
                className={`relative flex h-full flex-col overflow-hidden rounded-[28px] p-5 sm:p-6 ${
                  tier.highlight ? "border-primary shadow-lg" : ""
                }`}
              >
                {tier.highlight && (
                  <Badge className="absolute right-4 top-4 z-10 sm:-top-3 sm:right-6">
                    <Sparkles className="mr-1 h-3 w-3" /> {copy.popular}
                  </Badge>
                )}
                <h3 className="pr-20 text-xl font-semibold sm:pr-0">{tier.name}</h3>
                <p className="mt-3 text-[2.15rem] font-bold leading-none sm:text-[2.6rem]">
                  {lang === "mn" ? PLAN_PRICE[tier.id].mn : PLAN_PRICE[tier.id].en}
                </p>
                <ul className="mt-5 flex-1 space-y-3.5">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6 sm:text-base"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 min-h-12 w-full text-base"
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
                {actionHint ? (
                  <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
                    {actionHint}
                  </p>
                ) : null}
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
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[920px] overflow-y-auto border border-primary/10 bg-background p-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{copy.checkoutTitle}</DialogTitle>
            <DialogDescription>{checkoutDescriptionText}</DialogDescription>
          </DialogHeader>

          {selectedTier ? (
            <div className="grid lg:grid-cols-[1fr_1.02fr]">
              <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-5 text-primary-foreground sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_36%,transparent_72%,rgba(255,255,255,0.06)_100%)]" />
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/12 blur-3xl" />
                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-none hover:bg-white/10">
                      {checkoutBadgeLabel}
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
                      {checkoutHeroText}
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
                        <span className="font-semibold">{checkoutCardLabel}</span>
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
                        {secureLineText}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/62">
                        {checkoutBadgeLabel}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-5 text-primary-foreground/86">
                        {modeLineText}
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
                        {checkoutBadgeLabel}
                      </Badge>
                    </div>
                    <p className="text-[14px] leading-6 text-muted-foreground">
                      {checkoutDescriptionText}
                    </p>
                  </div>

                  <div className="rounded-3xl border bg-muted/[0.35] p-4">
                    <div className="flex items-end justify-between gap-4 border-b pb-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {copy.dueToday}
                        </p>
                        <p className="mt-1 text-[1.9rem] font-semibold leading-none">
                          {isManualCheckout && manualAmount
                            ? `${manualAmount.toLocaleString(lang === "mn" ? "mn-MN" : "en-US")}₮`
                            : `$${PLAN_PRICE[selectedTier.id].usd.toFixed(2)}`}
                        </p>
                      </div>
                      <div className="text-right text-[13px] text-muted-foreground">
                        <p>{copy.renewsOn}</p>
                        <p className="mt-1 font-medium text-foreground">{renewsValueText}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 text-[14px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{copy.checkoutPlan}</span>
                        <span className="font-semibold">{selectedTier.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{copy.checkoutMethod}</span>
                        <span className="font-semibold">{checkoutCardLabel}</span>
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
                        {redirectHintText}
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
                          {checkoutNoticeText}
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

                  {isManualCheckout ? (
                    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold">
                            {lang === "mn"
                              ? "Банкны шилжүүлгийн мэдээлэл"
                              : "Bank transfer details"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lang === "mn"
                              ? "Төлбөрөө хийгээд доорх мэдээллийг илгээнэ үү."
                              : "Complete the transfer, then submit the details below."}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border bg-background p-3">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {lang === "mn" ? "Банк" : "Bank"}
                          </p>
                          <p className="mt-1 font-semibold">{manualConfig.bankName}</p>
                        </div>
                        <div className="rounded-2xl border bg-background p-3">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {lang === "mn" ? "Дүн" : "Amount"}
                          </p>
                          <p className="mt-1 font-semibold">
                            {manualAmount
                              ? `${manualAmount.toLocaleString(lang === "mn" ? "mn-MN" : "en-US")}₮`
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-background p-3">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {lang === "mn" ? "Дансны нэр" : "Account name"}
                          </p>
                          <p className="mt-1 font-semibold">{manualConfig.accountName}</p>
                        </div>
                        <div className="rounded-2xl border bg-background p-3">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {lang === "mn" ? "Дансны дугаар" : "Account number"}
                          </p>
                          <p className="mt-1 font-mono text-sm">{manualConfig.accountNumber}</p>
                        </div>
                      </div>

                      {manualConfig.note ? (
                        <div className="rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
                          {manualConfig.note}
                        </div>
                      ) : null}

                      <div className="grid gap-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {lang === "mn" ? "Төлөгчийн нэр" : "Payer name"}
                          </p>
                          <Input
                            onChange={(event) => setManualPayerName(event.target.value)}
                            placeholder={
                              lang === "mn"
                                ? "Шилжүүлэг хийсэн хүний нэр"
                                : "Name used for the transfer"
                            }
                            value={manualPayerName}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {lang === "mn" ? "Гүйлгээний утга" : "Transfer reference"}
                          </p>
                          <Input
                            onChange={(event) => setManualTransferReference(event.target.value)}
                            placeholder={
                              lang === "mn"
                                ? "Transaction ID, утга, эсвэл сүүлийн 4 орон"
                                : "Transaction ID, payment note, or last 4 digits"
                            }
                            value={manualTransferReference}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {lang === "mn" ? "Нэмэлт тайлбар" : "Additional note"}
                          </p>
                          <Textarea
                            onChange={(event) => setManualNote(event.target.value)}
                            placeholder={
                              lang === "mn"
                                ? "Төлбөр хийсэн хугацаа, дэлгэцийн зургийн холбоос, эсвэл нэмэлт тайлбар"
                                : "Transfer time, screenshot link, or any helpful note"
                            }
                            rows={4}
                            value={manualNote}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isMonPayCheckout ? (
                    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold">
                            {lang === "mn"
                              ? "MonPay TAN batalgaajuulalt"
                              : "MonPay TAN confirmation"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lang === "mn"
                              ? "MonPay burtgeltei utasnii dugaar ruu SMS-eer code irne."
                              : "The TAN code is delivered by SMS to the customer's MonPay phone number."}
                          </p>
                        </div>
                      </div>

                      {!monpaySession ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              {lang === "mn" ? "Utasnii dugaar" : "Phone number"}
                            </p>
                            <Input
                              inputMode="tel"
                              onChange={(event) => setMonPayPhoneNumber(event.target.value)}
                              placeholder={
                                lang === "mn"
                                  ? "99112233 esvel 97699112233"
                                  : "99112233 or 97699112233"
                              }
                              value={monpayPhoneNumber}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lang === "mn"
                              ? "MonPay TAN flow ni ug dugaar ruu batalgaajuulah code ilgeene."
                              : "The MonPay TAN flow sends a confirmation code to the supplied phone number."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                {lang === "mn" ? "Utas" : "Phone"}
                              </p>
                              <p className="mt-1 font-mono text-sm">
                                {monpaySession.customerPhone}
                              </p>
                            </div>
                            <div className="rounded-2xl border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                TAN
                              </p>
                              <Input
                                inputMode="numeric"
                                onChange={(event) => setMonPayTanCode(event.target.value)}
                                placeholder={lang === "mn" ? "SMS-eer irsen code" : "SMS TAN code"}
                                value={monpayTanCode}
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                Request ID
                              </p>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                {monpaySession.requestId}
                              </p>
                            </div>
                            <div className="rounded-2xl border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                Transaction ID
                              </p>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                {monpaySession.transactionId}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {isQPayCheckout && qpayInvoice ? (
                    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                          <QrCode className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold">
                            {lang === "mn" ? "QPay төлбөрийн нэхэмжлэл" : "QPay payment invoice"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lang === "mn"
                              ? "QR code scan хийх эсвэл банкны апп руу шууд үсэрч төлбөрөө хийнэ."
                              : "Scan the QR code or jump directly into a supported banking app."}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                        <div className="rounded-3xl border bg-white p-4">
                          {qpayInvoice.qrImageDataUrl ? (
                            <img
                              alt="QPay QR code"
                              className="mx-auto aspect-square w-full max-w-[180px] rounded-2xl object-contain"
                              src={qpayInvoice.qrImageDataUrl}
                            />
                          ) : (
                            <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted">
                              <QrCode className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-2xl border bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              {lang === "mn" ? "Нэхэмжлэл" : "Invoice"}
                            </p>
                            <p className="mt-1 font-mono text-sm">{qpayInvoice.invoiceId}</p>
                          </div>

                          {qpayInvoice.urls.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {qpayInvoice.urls.slice(0, 6).map((item) => (
                                <Button
                                  key={`${item.name ?? "bank"}-${item.link ?? "link"}`}
                                  asChild
                                  className="justify-between"
                                  variant="outline"
                                >
                                  <a href={item.link || "#"}>
                                    <span className="flex items-center gap-2 truncate">
                                      <Smartphone className="h-4 w-4" />
                                      {item.name || item.description || "Open app"}
                                    </span>
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              ))}
                            </div>
                          ) : null}

                          {qpayInvoice.qrText ? (
                            <div className="rounded-2xl border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                QR Text
                              </p>
                              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                {qpayInvoice.qrText}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="mt-5 flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={() => closeCheckout(false)}
                    disabled={checkoutState === "processing" || monpayConfirmState === "processing"}
                  >
                    {copy.checkoutCancel}
                  </Button>
                  <Button
                    className="w-full sm:min-w-[220px]"
                    onClick={() =>
                      monpaySession
                        ? void confirmMonPayTanCode()
                        : qpayInvoice
                          ? void verifyQPayPayment(true)
                          : void confirmCheckout()
                    }
                    disabled={
                      checkoutState === "processing" ||
                      monpayConfirmState === "processing" ||
                      qpayVerifyState === "processing"
                    }
                  >
                    {checkoutState === "processing" ||
                    monpayConfirmState === "processing" ||
                    qpayVerifyState === "processing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {monpaySession
                          ? lang === "mn"
                            ? "MonPay batalgaajuulj baina..."
                            : "Confirming MonPay payment..."
                          : qpayInvoice
                            ? lang === "mn"
                              ? "Төлбөр шалгаж байна..."
                              : "Checking payment..."
                            : copy.checkoutProcessing}
                      </>
                    ) : monpaySession ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {lang === "mn" ? "TAN code batalah" : "Confirm TAN code"}
                      </>
                    ) : qpayInvoice ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {lang === "mn" ? "Төлбөр шалгах" : "Check payment"}
                      </>
                    ) : (
                      checkoutActionLabel
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
