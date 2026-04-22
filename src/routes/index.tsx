import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/formly/Logo";
import { Button } from "@/components/ui/button";
import { Sparkles, BarChart3, Layers, ArrowRight, CheckCircle2 } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Нэвтрэх / Login</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Эхлэх / Get Started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-аар судалгаа автоматаар үүсгэх
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Ухаалаг судалгааг секундийн дотор
            <span className="block text-primary">бүтээ.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Formly бол судалгаа үүсгэх, түгээх, хариултыг бодит цагт аналитик болгон харах
            ухаалаг платформ. AI туслахаар асуултаа автоматаар бүтээгээрэй.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/login">
                Үнэгүй эхлэх <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Demo үзэх</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "AI Assistant",
                desc: "Зүгээр л санаагаа хэлээрэй — AI бүтэн судалгаа үүсгэнэ.",
                color: "text-accent",
              },
              {
                icon: Layers,
                title: "Form Builder",
                desc: "Олон сонголт, текст, үнэлгээ — drag & drop-оор зохион байгуул.",
                color: "text-primary",
              },
              {
                icon: BarChart3,
                title: "Realtime Analytics",
                desc: "Хариултуудыг graph, chart-аар шууд харах боломж.",
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
                <h2 className="text-3xl font-bold tracking-tight">Хялбар. Хурдан. Ухаалаг.</h2>
                <p className="mt-4 text-muted-foreground">
                  Формыг үүсгэх, түгээх, хариултыг шинжлэх бүх алхмыг нэг дороос хийгээрэй.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "AI-аар судалгаа автоматаар үүсгэх",
                    "Public link-ээр хэн ч хариулах боломжтой",
                    "Bar / Pie / Line chart аналитик",
                    "Админы зориулалттай менежмент самбар",
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
          <p>© 2026 Formly. Бүх эрх хуулиар хамгаалагдсан.</p>
        </div>
      </footer>
    </div>
  );
}