"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  Shield,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/formly/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, useI18n } from "@/components/formly/I18nProvider";
import { Logo } from "@/components/formly/Logo";
import { usePlan } from "@/components/formly/PlanProvider";
import { ThemeToggle } from "@/components/formly/ThemeProvider";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { lang, t } = useI18n();
  const { plan } = usePlan();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const nav = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/surveys/new", label: t("nav.new"), icon: PlusCircle },
    { to: "/ai", label: t("nav.ai"), icon: Sparkles },
    { to: "/pricing", label: t("nav.pricing"), icon: Tag },
    { to: "/billing", label: t("nav.billing"), icon: CreditCard },
    { to: "/team", label: t("nav.team"), icon: Users },
    ...(isAdmin ? [{ to: "/admin", label: t("nav.admin"), icon: Shield }] : []),
  ];

  const sidebarCard = {
    title: lang === "mn" ? "Хурдан эхлүүлэх" : "Quick start",
    description:
      lang === "mn"
        ? "Шинэ судалгаа үүсгэх эсвэл AI туслахаар асуултаа хурдан бэлдээрэй."
        : "Create a new survey or let AI help you draft your questions faster.",
    primaryCta: lang === "mn" ? "Судалгаа үүсгэх" : "Create survey",
    secondaryCta: lang === "mn" ? "AI нээх" : "Open AI",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col p-3">
          <div className="space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto rounded-2xl border border-sidebar-border bg-gradient-to-br from-primary/8 via-background to-sidebar-accent/60 p-4">
            <div className="mb-3 inline-flex rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {sidebarCard.title}
            </div>
            <p className="text-sm font-semibold text-foreground">{sidebarCard.description}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild size="sm" className="w-full justify-center rounded-xl">
                <Link href="/surveys/new">{sidebarCard.primaryCta}</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full justify-center rounded-xl"
              >
                <Link href="/ai">{sidebarCard.secondaryCta}</Link>
              </Button>
            </div>
          </div>
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
            <p className="truncate font-medium text-foreground">{user.email}</p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{isAdmin ? t("role.admin") : t("role.user")}</span>
              <Badge
                variant={plan === "free" ? "secondary" : "default"}
                className="h-4 px-1.5 text-[10px]"
              >
                {t(`plan.${plan}` as "plan.free")}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signout")}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
