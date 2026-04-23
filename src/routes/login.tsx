import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/formly/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/formly/AuthProvider";
import { useI18n, LanguageSwitcher } from "@/components/formly/I18nProvider";
import { ThemeToggle } from "@/components/formly/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Нэвтрэх — Formly" },
      { name: "description", content: "Formly данс руу нэвтрэх эсвэл шинэ данс үүсгэх." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Тавтай морилно уу!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Бүртгэл амжилттай! Нэвтэрч байна...");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Logo className="text-primary-foreground" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Судалгаагаа
            <br />
            ухаалгаар үүсгэ.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            AI-ийн тусламжтай асуултаа автоматаар бүтээж, хариултыг шууд аналитик болгон хар.
          </p>
          <div className="mt-8 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" /> {t("auth.demoTitle")}
            </div>
            <p className="mt-1 text-xs text-primary-foreground/70">{t("auth.demoHint")}</p>
            <div className="mt-3 space-y-1 font-mono text-xs">
              <div>demo1@formly.app … demo10@formly.app</div>
              <div className="text-primary-foreground/70">password: demo1234</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-primary-foreground/60">© 2026 Formly</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Тавтай морилно уу" : "Шинэ данс үүсгэх"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your account" : "Create your Formly account"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Нэр / Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Таны нэр"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">И-мэйл / Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Нууц үг / Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Данс байхгүй юу?" : "Данстай юу?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Бүртгүүлэх" : "Нэвтрэх"}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Нүүр хуудас
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}