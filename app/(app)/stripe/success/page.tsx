"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n } from "@/components/formly/I18nProvider";
import { usePlan } from "@/components/formly/PlanProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Plan } from "@/lib/plans";

export default function StripeSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { session, user, loading: authLoading } = useAuth();
  const { refresh } = usePlan();
  const { lang } = useI18n();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"mock" | "live" | null>(null);

  const copy =
    lang === "mn"
      ? {
          eyebrow: "Төлбөрийн баталгаажуулалт",
          loadingTitle: "Төлбөрийг шалгаж байна",
          loadingBody: "Түр хүлээнэ үү. Захиалгын мэдээллийг баталгаажуулж байна.",
          successTitle: "Төлбөр амжилттай баталгаажлаа",
          successBody:
            "Таны төлөвлөгөө амжилттай идэвхжлээ. Одоо billing хэсгээс шинэ эрхээ харж болно.",
          errorTitle: "Төлбөрийн баталгаажуулалт амжилтгүй боллоо",
          genericError: "Төлбөрийг баталгаажуулах үед алдаа гарлаа. Дахин оролдоно уу.",
          missingSession:
            "Төлбөрийн session эсвэл хэрэглэгчийн мэдээлэл дутуу байна. Дахин нэвтэрч оролдоно уу.",
          retry: "Дахин шалгах",
          goPricing: "Үнэ рүү буцах",
          goBilling: "Төлбөр хэсэг рүү очих",
          continue: "Billing нээх",
          supportHint: "Хэрэв эрх тань шинэчлэгдээгүй бол pricing руу буцаад дахин оролдоорой.",
          modeMock: "Туршилтын горим",
          modeLive: "Бодит төлбөр",
          detailTitle: "Юу болж байна вэ?",
          detailLoading1: "Таны checkout session-г шалгаж байна",
          detailLoading2: "Амжилттай бол plan-г идэвхжүүлнэ",
          detailLoading3: "Дараа нь billing дээр шинэ эрх харагдана",
          detailSuccess1: "Захиалгын төлөв шинэчлэгдсэн",
          detailSuccess2: "Pro/Team боломжууд идэвхжсэн",
          detailSuccess3: "Usage ба plan мэдээлэл шинэчлэгдсэн",
          detailError1: "Session олдсон эсэхийг шалгана",
          detailError2: "Нэвтэрсэн хэрэглэгчийн имэйл таарч байгаа эсэхийг шалгана",
          detailError3: "Амжилтгүй бол pricing хэсгээс дахин эхлүүлж болно",
        }
      : {
          eyebrow: "Payment verification",
          loadingTitle: "Verifying your payment",
          loadingBody: "Please wait while we confirm your checkout session and activate your plan.",
          successTitle: "Payment verified successfully",
          successBody:
            "Your subscription has been activated. You can now review your updated access in billing.",
          errorTitle: "Payment verification failed",
          genericError: "We could not verify your payment. Please try again.",
          missingSession:
            "Missing payment session or signed-in user. Please sign in and try again.",
          retry: "Verify again",
          goPricing: "Return to pricing",
          goBilling: "View billing",
          continue: "Open billing",
          supportHint:
            "If your access has not changed yet, return to pricing and try the upgrade flow again.",
          modeMock: "Mock mode",
          modeLive: "Live payment",
          detailTitle: "What happens next?",
          detailLoading1: "We confirm your checkout session",
          detailLoading2: "If successful, we activate your plan",
          detailLoading3: "Your billing view updates with the new access",
          detailSuccess1: "Your subscription record has been updated",
          detailSuccess2: "Paid plan features are now enabled",
          detailSuccess3: "Billing and usage reflect the new plan",
          detailError1: "We check whether the checkout session is valid",
          detailError2: "We confirm it matches the signed-in account",
          detailError3: "If verification fails, you can safely retry from pricing",
        };

  const resolveErrorMessage = useCallback(
    (error: string) => {
      if (lang !== "mn") {
        return error || copy.genericError;
      }

      const knownErrors: Record<string, string> = {
        "Missing sessionId or userEmail.":
          "Төлбөрийн session эсвэл хэрэглэгчийн имэйл дутуу байна.",
        "Invalid mock checkout session.": "Туршилтын checkout session буруу байна.",
        "Payment email does not match signed-in user.":
          "Төлбөрийн имэйл нь нэвтэрсэн хэрэглэгчтэй таарахгүй байна.",
        "Missing STRIPE_SECRET_KEY.": "Stripe secret key тохируулагдаагүй байна.",
        "Unable to retrieve checkout session.": "Checkout session-ийн мэдээллийг авч чадсангүй.",
        "Payment has not been completed.": "Төлбөр бүрэн хийгдээгүй байна.",
        "Invalid session metadata.": "Session metadata буруу байна.",
        "Unexpected verification error.": "Баталгаажуулалтын үед санаандгүй алдаа гарлаа.",
      };

      return knownErrors[error] ?? error ?? copy.genericError;
    },
    [copy.genericError, lang],
  );

  useEffect(() => {
    async function verifyPayment() {
      if (authLoading) {
        setStatus("loading");
        setMessage(copy.loadingBody);
        return;
      }

      if (!sessionId || !user?.email || !session?.access_token) {
        setStatus("error");
        setMessage(copy.missingSession);
        return;
      }

      setStatus("loading");
      setMessage(copy.loadingBody);

      try {
        const response = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const raw = await response.text();
        let data: { error?: string; mode?: "mock" | "live"; plan?: Plan } = {};

        if (raw) {
          try {
            data = JSON.parse(raw) as { error?: string; mode?: "mock" | "live"; plan?: Plan };
          } catch {
            throw new Error(copy.genericError);
          }
        }

        if (!response.ok) {
          throw new Error(resolveErrorMessage(data.error || copy.genericError));
        }

        await refresh();
        setMode(data.mode ?? null);
        setStatus("success");
        setMessage(copy.successBody);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error && error.message
            ? resolveErrorMessage(error.message)
            : copy.genericError,
        );
      }
    }

    void verifyPayment();
  }, [
    copy.genericError,
    copy.loadingBody,
    copy.missingSession,
    copy.successBody,
    authLoading,
    refresh,
    resolveErrorMessage,
    session,
    sessionId,
    user,
  ]);

  const detailItems =
    status === "loading"
      ? [copy.detailLoading1, copy.detailLoading2, copy.detailLoading3]
      : status === "success"
        ? [copy.detailSuccess1, copy.detailSuccess2, copy.detailSuccess3]
        : [copy.detailError1, copy.detailError2, copy.detailError3];

  const title =
    status === "loading"
      ? copy.loadingTitle
      : status === "success"
        ? copy.successTitle
        : copy.errorTitle;

  const Icon = status === "loading" ? Loader2 : status === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-r from-primary/10 via-background to-accent/10 p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{copy.eyebrow}</Badge>
                {mode && (
                  <Badge className="capitalize">
                    {mode === "mock" ? copy.modeMock : copy.modeLive}
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-2xl p-3 ${
                    status === "success"
                      ? "bg-emerald-500/12 text-emerald-600"
                      : status === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/12 text-primary"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${status === "loading" ? "animate-spin" : ""}`} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                  <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{message}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/80 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{copy.detailTitle}</p>
                  <p className="text-xs text-muted-foreground">{copy.supportHint}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {detailItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border bg-background p-4"
              >
                <div
                  className={`mt-0.5 rounded-full p-1 ${
                    status === "success"
                      ? "bg-emerald-500/12 text-emerald-600"
                      : status === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/12 text-primary"
                  }`}
                >
                  {status === "success" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {status !== "success" && (
              <Button className="w-full gap-2" onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4" />
                {copy.retry}
              </Button>
            )}

            <Button
              asChild
              className="w-full gap-2"
              variant={status === "success" ? "default" : "outline"}
            >
              <Link href="/billing">
                {status === "success" ? copy.continue : copy.goBilling}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild className="w-full" variant="secondary">
              <Link href="/pricing">{copy.goPricing}</Link>
            </Button>

            {status === "success" && (
              <div className="rounded-2xl border bg-emerald-500/5 p-4 text-sm text-muted-foreground">
                {mode === "mock" ? copy.modeMock : copy.modeLive}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
