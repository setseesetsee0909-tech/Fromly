import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/formly/Logo";
import { Button } from "@/components/ui/button";
import { Sparkles, BarChart3, Layers, ArrowRight, CheckCircle2 } from "lucide-react";
import { useI18n, LanguageSwitcher } from "@/components/formly/I18nProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Formly — Ухаалаг судалгааны платформ" },
      {
        name: "description",
        content: "Formly — AI тусламжтайгаар судалгаа үүсгэж, хариултыг шууд аналитик болгон харах боломжтой орчин үеийн платформ.",
      },
      { property: "og:title", content: "Formly — Smart Survey Platform" },
      { property: "og:description", content: "Create, share & analyze surveys powered by AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <LanguageSwitcher className="mr-2" />
          <Button asChild variant="ghost">
            <Link to="/login">{t("landing.login")}</Link>
          </Button>
          <Button asChild>
            <Link to="/login">{t("landing.getStarted")}</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t("landing.badge")}
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            {t("landing.heroTitle1")}
            <span className="block text-primary">{t("landing.heroTitle2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("landing.heroDesc")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/login">
                {t("landing.getStarted")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: t("landing.feature1.title"),
                desc: t("landing.feature1.desc"),
                color: "text-accent",
              },
              {
                icon: Layers,
                title: t("landing.feature2.title"),
                desc: t("landing.feature2.desc"),
                color: "text-primary",
              },
              {
                icon: BarChart3,
                title: t("landing.feature3.title"),
                desc: t("landing.feature3.desc"),
                color: "text-secondary",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <div className={`mb-4 inline-flex rounded-xl bg-muted p-3 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-card">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("landing.sectionTitle")}</h2>
                <p className="mt-4 text-muted-foreground">
                  {t("landing.sectionDesc")}
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    t("landing.bullet1"),
                    t("landing.bullet2"),
                    t("landing.bullet3"),
                    t("landing.bullet4"),
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border bg-background p-8 shadow-sm">
                <div className="space-y-3">
                  <div className="h-3 w-2/3 rounded-full bg-primary/20" />
                  <div className="h-3 w-1/2 rounded-full bg-muted" />
                  <div className="mt-6 space-y-2">
                    <div className="h-10 rounded-lg border bg-card" />
                    <div className="h-10 rounded-lg border bg-card" />
                    <div className="h-10 rounded-lg border bg-card" />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="h-9 w-24 rounded-lg bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <Logo className="h-6" />
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}