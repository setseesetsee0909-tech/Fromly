"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { LanguageSwitcher, useI18n } from "@/components/formly/I18nProvider";
import { Logo } from "@/components/formly/Logo";
import { ThemeToggle } from "@/components/formly/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";
import { toast } from "sonner";

export function LoginPage() {
  const { user, loading, signOut } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formHint, setFormHint] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const copy =
    lang === "mn"
      ? {
          heroTitle: "Судалгаагаа ухаалгаар бүтээгээрэй.",
          heroDesc:
            "AI-ийн тусламжтай асуултаа хурдан боловсруулж, хариултыг нэг дороос бодит цагт шинжилнэ.",
          footer: "© 2026 Formly",
          signinTitle: "Тавтай морилно уу",
          signupTitle: "Шинэ данс үүсгэх",
          signinDesc: "Дансаараа нэвтэрч судалгаануудаа үргэлжлүүлээрэй.",
          signupDesc: "Formly дээр шинэ бүртгэл үүсгээд эхлээрэй.",
          nameLabel: "Нэр",
          namePlaceholder: "Таны нэр",
          emailLabel: "И-мэйл",
          passwordLabel: "Нууц үг",
          signinButton: "Нэвтрэх",
          signupButton: "Бүртгүүлэх",
          welcomeToast: "Тавтай морилно уу!",
          signupToast: "Бүртгэл амжилттай үүслээ!",
          errorToast: "Алдаа гарлаа",
          invalidLoginHint:
            "Хэрэв энэ хаягаар Google-оор бүртгүүлсэн бол `Google-ээр нэвтрэх` товчийг ашиглаарай, эсвэл нууц үгээ reset хийнэ үү.",
          emailNotConfirmedHint: "И-мэйлээ баталгаажуулах мэйлээ шалгаад дахин оролдоно уу.",
          emailProviderHint: "Supabase дээр Email provider идэвхтэй эсэхийг шалгана уу.",
          activeSessionTitle: "Та аль хэдийн нэвтэрсэн байна",
          activeSessionDesc:
            "Хадгалагдсан session сэргээгдсэн тул систем автоматаар таньсан байна.",
          continueButton: "Самбар руу үргэлжлүүлэх",
          switchAccountButton: "Өөр акаунтаар нэвтрэх",
          backHome: "← Нүүр хуудас",
        }
      : {
          heroTitle: "Create surveys with confidence.",
          heroDesc:
            "Draft questions faster with AI, share surveys in minutes, and review responses from one clear workspace.",
          footer: "© 2026 Formly",
          signinTitle: "Welcome back",
          signupTitle: "Create your account",
          signinDesc: "Sign in to continue building and managing your surveys.",
          signupDesc: "Create your Formly account and launch your first survey.",
          nameLabel: "Name",
          namePlaceholder: "Your name",
          emailLabel: "Email",
          passwordLabel: "Password",
          signinButton: "Sign in",
          signupButton: "Create account",
          welcomeToast: "Welcome back!",
          signupToast: "Your account has been created successfully!",
          errorToast: "Something went wrong",
          invalidLoginHint:
            "If this address was registered with Google, use `Continue with Google` instead, or reset the password.",
          emailNotConfirmedHint: "Check the confirmation email for this account, then try again.",
          emailProviderHint: "Check whether the Supabase Email provider is enabled.",
          activeSessionTitle: "You are already signed in",
          activeSessionDesc: "A saved session was restored automatically for this browser.",
          continueButton: "Continue to dashboard",
          switchAccountButton: "Sign in with another account",
          backHome: "← Back to home",
        };

  const signupPendingConfirmationMessage =
    lang === "mn"
      ? "Бүртгэл үүслээ. Нэвтрэхийн өмнө и-мэйл хаягаа баталгаажуулж, ирсэн мэйл доторх холбоос дээр дарсны дараа дахин оролдоно уу."
      : "Your account was created. Please confirm your email from the message we sent before signing in.";

  const invalidLoginHint =
    lang === "mn"
      ? "Хэрэв энэ аккаунтыг сая үүсгэсэн бол и-мэйл баталгаажуулах мэйлээ эхлээд шалгана уу. Google-ээр бүртгүүлсэн бол `Google-ээр нэвтрэх` товчийг ашиглаарай, эсвэл нууц үгээ сэргээнэ үү."
      : "If this account was just created, check the confirmation email first. If it uses Google, use `Continue with Google` instead, or reset the password.";

  const emailNotConfirmedHint =
    lang === "mn"
      ? "И-мэйл хаягаа баталгаажуулах мэйлээ шалгаад, холбоос дээр дарсны дараа дахин нэвтэрнэ үү."
      : "Check the confirmation email for this account, then try signing in again.";

  const getFriendlyAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : copy.errorToast;
    const normalized = message.toLowerCase();

    if (normalized.includes("invalid login credentials")) {
      return { message, hint: invalidLoginHint };
    }

    if (normalized.includes("email not confirmed")) {
      return { message, hint: emailNotConfirmedHint };
    }

    if (normalized.includes("email provider is disabled")) {
      return { message, hint: copy.emailProviderHint };
    }

    return { message, hint: null };
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setFormError(null);
    setFormHint(null);
    setFormSuccess(null);

    try {
      const authCallbackUrl = getAuthCallbackUrl("/dashboard");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const friendly = getFriendlyAuthError(error);
      setFormError(friendly.message);
      setFormHint(friendly.hint);
      toast.error(friendly.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setFormHint(null);
    setFormSuccess(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        toast.success(copy.welcomeToast);
        router.push("/dashboard");
      } else {
        const authCallbackUrl = getAuthCallbackUrl("/dashboard");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl,
            data: { display_name: name || email.split("@")[0] },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          toast.success(copy.signupToast);
          router.push("/dashboard");
          return;
        }

        setMode("signin");
        setPassword("");
        setName("");
        setFormSuccess(signupPendingConfirmationMessage);
        toast.success(signupPendingConfirmationMessage);
      }
    } catch (error) {
      const friendly = getFriendlyAuthError(error);
      setFormError(friendly.message);
      setFormHint(friendly.hint);
      setFormSuccess(null);
      toast.error(friendly.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    setBusy(true);
    try {
      await signOut();
      setFormError(null);
      setFormHint(null);
      setFormSuccess(null);
      setEmail("");
      setPassword("");
      setName("");
      setMode("signin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center justify-between">
          <Logo className="text-primary-foreground" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight">{copy.heroTitle}</h2>
          <p className="mt-4 text-primary-foreground/80">{copy.heroDesc}</p>
          <div className="mt-8 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-4 text-sm">
            <div className="font-semibold">{t("auth.quickAccessTitle")}</div>
            <p className="mt-1 text-xs text-primary-foreground/70">{t("auth.quickAccessHint")}</p>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60">{copy.footer}</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : user ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{copy.activeSessionTitle}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{copy.activeSessionDesc}</p>
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  {user.email}
                </p>
              </div>

              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                {copy.continueButton}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSwitchAccount}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {copy.switchAccountButton}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "signin" ? copy.signinTitle : copy.signupTitle}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin" ? copy.signinDesc : copy.signupDesc}
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={handleGoogleSignIn}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.googleSignin")}
              </Button>

              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{copy.nameLabel}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        if (formSuccess) {
                          setFormSuccess(null);
                        }
                      }}
                      placeholder={copy.namePlaceholder}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">{copy.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (formError || formSuccess) {
                        setFormError(null);
                        setFormHint(null);
                        setFormSuccess(null);
                      }
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">{copy.passwordLabel}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (formError || formSuccess) {
                        setFormError(null);
                        setFormHint(null);
                        setFormSuccess(null);
                      }
                    }}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? copy.signinButton : copy.signupButton}
                </Button>

                {formError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <p>{formError}</p>
                    {formHint && <p className="mt-1 text-xs text-destructive/80">{formHint}</p>}
                  </div>
                )}

                {formSuccess && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <p>{formSuccess}</p>
                  </div>
                )}
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setFormError(null);
                    setFormHint(null);
                    setFormSuccess(null);
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "signin" ? t("auth.signupBtn") : t("auth.signin")}
                </button>
              </p>
            </>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              {copy.backHome}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
