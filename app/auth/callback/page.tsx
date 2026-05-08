"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useI18n } from "@/components/formly/I18nProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeNextPath } from "@/lib/auth";

type CallbackStatus = "loading" | "error";

function getHashSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useI18n();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("");

  const copy = useMemo(
    () =>
      lang === "mn"
        ? {
            title: "Нэвтрэлтийг баталгаажуулж байна",
            body: "Түр хүлээнэ үү. Нэвтрэлтийн мэдээллийг боловсруулж байна.",
            errorTitle: "Нэвтрэлт амжилтгүй боллоо",
            fallback: "Нэвтрэх хуудас руу буцах",
            missingToken: "Нэвтрэлтийн баталгаажуулах мэдээлэл олдсонгүй. Дахин оролдоно уу.",
          }
        : {
            title: "Completing sign-in",
            body: "Please wait while we finish your sign-in.",
            errorTitle: "Sign-in failed",
            fallback: "Return to login",
            missingToken: "No sign-in token was found. Please try again.",
          },
    [lang],
  );

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const hashParams = getHashSearchParams();
      const nextRaw = searchParams.get("next") ?? hashParams.get("next");
      const nextPath = sanitizeNextPath(nextRaw);
      const code = searchParams.get("code") ?? hashParams.get("code");
      const tokenHash = searchParams.get("token_hash") ?? hashParams.get("token_hash");
      const otpType = searchParams.get("type") ?? hashParams.get("type");
      const errorDescription =
        searchParams.get("error_description") ??
        searchParams.get("error") ??
        hashParams.get("error_description") ??
        hashParams.get("error");

      if (errorDescription) {
        if (!cancelled) {
          setStatus("error");
          setMessage(errorDescription);
        }
        return;
      }

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          router.replace(nextPath);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as EmailOtpType,
          });

          if (error) {
            throw error;
          }
        } else {
          throw new Error(copy.missingToken);
        }

        router.replace(nextPath);
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          const baseMessage = error instanceof Error ? error.message : copy.missingToken;
          const setupHint =
            lang === "mn"
              ? " Supabase redirect URL болон provider callback тохиргоогоо шалгана уу."
              : " Check your Supabase redirect URLs and provider callback configuration.";
          setMessage(`${baseMessage}${setupHint}`);
        }
      }
    }

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [copy.missingToken, lang, router, searchParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{copy.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{copy.errorTitle}</h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{message}</p>
            <Button asChild className="mt-5">
              <Link href="/login">{copy.fallback}</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Completing sign-in</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please wait while we finish your sign-in.
                </p>
              </div>
            </div>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
