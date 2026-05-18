"use client";

/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { safeStorageGet, safeStorageSet } from "@/lib/browser-storage";

export type Lang = "mn" | "en";

const dict = {
  mn: {
    "nav.dashboard": "Хяналтын самбар",
    "nav.new": "Шинэ судалгаа",
    "nav.ai": "AI туслах",
    "nav.admin": "Админ",
    "nav.signout": "Гарах",
    "nav.pricing": "Үнэ",
    "nav.billing": "Төлбөр",
    "nav.team": "Баг",
    "role.admin": "Админ",
    "role.user": "Хэрэглэгч",
    "common.language": "Хэл",
    "common.loading": "Ачаалж байна...",
    "auth.welcome": "Тавтай морилно уу",
    "auth.signup": "Шинэ данс үүсгэх",
    "auth.signin": "Нэвтрэх",
    "auth.signupBtn": "Бүртгүүлэх",
    "auth.noAccount": "Данс байхгүй юу?",
    "auth.haveAccount": "Данстай юу?",
    "auth.quickAccessTitle": "Шуурхай нэвтрэлт",
    "auth.quickAccessHint": "Google эсвэл өөрийн бүртгэлээр нэвтэрнэ үү",
    "auth.googleSignin": "Google-ээр нэвтрэх",
    "auth.or": "эсвэл",
    "admin.title": "Админ самбар",
    "admin.users": "Хэрэглэгчид",
    "admin.surveys": "Бүх судалгаа",
    "admin.totalUsers": "Нийт хэрэглэгч",
    "admin.totalSurveys": "Нийт судалгаа",
    "admin.seedSample": "Туршилтын өгөгдөл нэмэх",
    "admin.seeding": "Үүсгэж байна...",
    "admin.makeAdmin": "Админ болгох",
    "admin.removeAdmin": "Админ цуцлах",
    "admin.noAccess": "Хандах эрхгүй",
    "landing.badge": "AI-аар судалгаа автоматаар үүсгэх",
    "landing.heroTitle1": "Ухаалаг судалгааг секундын дотор",
    "landing.heroTitle2": "бүтээ.",
    "landing.heroDesc":
      "Formly бол судалгаа үүсгэх, түгээх, хариултыг бодит цагт аналитик болгон харах ухаалаг платформ. AI туслахаар асуултаа автоматаар бүтээгээрэй.",
    "landing.login": "Нэвтрэх",
    "landing.getStarted": "Эхлэх",
    "landing.feature1.title": "AI туслах",
    "landing.feature1.desc": "Зүгээр л санаагаа хэлээрэй. AI бүтэн судалгаа үүсгэнэ.",
    "landing.feature2.title": "Форм бүтээгч",
    "landing.feature2.desc": "Олон сонголт, текст, үнэлгээ зэрэг асуултыг хялбар зохион байгуулна.",
    "landing.feature3.title": "Бодит цагийн аналитик",
    "landing.feature3.desc": "Хариултуудыг graph, chart-аар шууд харах боломж.",
    "landing.sectionTitle": "Хялбар. Хурдан. Ухаалаг.",
    "landing.sectionDesc":
      "Формыг үүсгэх, түгээх, хариултыг шинжлэх бүх алхмыг нэг дороос хийгээрэй.",
    "landing.bullet1": "AI-аар судалгаа автоматаар үүсгэх",
    "landing.bullet2": "Public link-ээр хэн ч хариулах боломжтой",
    "landing.bullet3": "Bar / Pie / Line chart аналитик",
    "landing.bullet4": "Админы зориулалттай менежментийн самбар",
    "landing.footer": "© 2026 Formly. Бүх эрх хуулиар хамгаалагдсан.",
    "plan.free": "Үнэгүй",
    "plan.pro": "Pro",
    "plan.team": "Баг",
    "plan.current": "Одоогийн",
    "plan.upgrade": "Сайжруулах",
    "plan.downgrade": "Free руу буцаах",
    "plan.activated": "Plan идэвхжлээ",
    "pricing.title": "Танд тохирох төлөвлөгөөг сонгоорой",
    "pricing.desc": "Хүссэн үедээ plan-aa өөрчилж болно. Paid plan нь төлбөр эсвэл admin approval-ийн дараа идэвхжинэ.",
    "billing.title": "Төлбөр ба захиалга",
    "billing.currentPlan": "Одоогийн plan",
    "billing.usage": "Хэрэглээ",
    "billing.surveys": "Судалгаа",
    "billing.responses": "Хариулт",
    "billing.unlimited": "Хязгааргүй",
    "team.title": "Баг",
    "team.desc": "Гишүүдийг урьж хамтран ажиллаарай (Team plan).",
    "team.create": "Workspace үүсгэх",
    "team.invite": "Гишүүн урих",
    "team.email": "И-мэйл",
    "team.member": "Гишүүн",
    "team.removed": "Хасагдлаа",
    "team.invited": "Уригдлаа",
    "team.needTeam": "Энэ боломжид Team plan шаардлагатай",
    "limit.surveysReached": "Free plan: 3 судалгааны хязгаарт хүрсэн. Pro руу шилжинэ үү.",
    "limit.responsesReached": "Энэ судалгаа 100 хариултын хязгаарт хүрсэн (Free).",
    "limit.aiPro": "AI туслах нь Pro plan-ы боломж",
    "limit.exportPro": "Export нь Pro plan-ы боломж",
    "limit.mapPro": "Газрын зураг нь Pro plan-ы боломж",
    "analytics.map": "Хариулагчдын байршил",
    "analytics.export": "Excel экспорт",
    watermark: "Formly-аар бүтээгдсэн",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.new": "New Survey",
    "nav.ai": "AI Assistant",
    "nav.admin": "Admin",
    "nav.signout": "Sign out",
    "nav.pricing": "Pricing",
    "nav.billing": "Billing",
    "nav.team": "Team",
    "role.admin": "Admin",
    "role.user": "User",
    "common.language": "Language",
    "common.loading": "Loading...",
    "auth.welcome": "Welcome back",
    "auth.signup": "Create an account",
    "auth.signin": "Sign in",
    "auth.signupBtn": "Create account",
    "auth.noAccount": "No account?",
    "auth.haveAccount": "Already have one?",
    "auth.quickAccessTitle": "Quick access",
    "auth.quickAccessHint": "Sign in with Google or your own account",
    "auth.googleSignin": "Continue with Google",
    "auth.or": "or",
    "admin.title": "Admin dashboard",
    "admin.users": "Users",
    "admin.surveys": "All Surveys",
    "admin.totalUsers": "Total users",
    "admin.totalSurveys": "Total surveys",
    "admin.seedSample": "Seed sample data",
    "admin.seeding": "Seeding...",
    "admin.makeAdmin": "Make admin",
    "admin.removeAdmin": "Revoke admin",
    "admin.noAccess": "Access denied",
    "landing.badge": "Create surveys faster with AI",
    "landing.heroTitle1": "Create smarter surveys in",
    "landing.heroTitle2": "seconds.",
    "landing.heroDesc":
      "Formly helps you create, share, and analyze surveys in real time. Let the AI assistant draft your questions automatically.",
    "landing.login": "Sign in",
    "landing.getStarted": "Get started",
    "landing.feature1.title": "AI Assistant",
    "landing.feature1.desc": "Describe your idea and let AI draft the full survey for you.",
    "landing.feature2.title": "Form Builder",
    "landing.feature2.desc": "Build text, rating, and multiple-choice questions with ease.",
    "landing.feature3.title": "Real-time analytics",
    "landing.feature3.desc": "Track responses instantly with clear charts and insights.",
    "landing.sectionTitle": "Simple. Fast. Smart.",
    "landing.sectionDesc":
      "Everything you need to create, share, and analyze surveys in one place.",
    "landing.bullet1": "Generate surveys automatically with AI",
    "landing.bullet2": "Anyone can respond via a public link",
    "landing.bullet3": "Bar, pie, and line chart analytics",
    "landing.bullet4": "A dedicated management panel for admins",
    "landing.footer": "© 2026 Formly. All rights reserved.",
    "plan.free": "Free",
    "plan.pro": "Pro",
    "plan.team": "Team",
    "plan.current": "Current",
    "plan.upgrade": "Upgrade",
    "plan.downgrade": "Downgrade to Free",
    "plan.activated": "Your plan is now active",
    "pricing.title": "Choose the plan that fits your workflow",
    "pricing.desc": "Choose the billing flow that fits you. Paid plans activate after payment or admin approval.",
    "billing.title": "Billing and subscription",
    "billing.currentPlan": "Current plan",
    "billing.usage": "Usage",
    "billing.surveys": "Surveys",
    "billing.responses": "Responses",
    "billing.unlimited": "Unlimited",
    "team.title": "Team",
    "team.desc": "Invite teammates and collaborate in one shared workspace.",
    "team.create": "Create workspace",
    "team.invite": "Invite member",
    "team.email": "Email",
    "team.member": "Member",
    "team.removed": "Removed",
    "team.invited": "Invited",
    "team.needTeam": "This feature is available on the Team plan.",
    "limit.surveysReached":
      "You've reached the Free plan limit of 3 surveys. Upgrade to Pro to create more.",
    "limit.responsesReached": "This survey has reached the Free plan limit of 100 responses.",
    "limit.aiPro": "AI assistant is a Pro feature",
    "limit.exportPro": "Export is a Pro feature",
    "limit.mapPro": "Map is a Pro feature",
    "analytics.map": "Respondent locations",
    "analytics.export": "Export to Excel",
    watermark: "Made with Formly",
  },
} as const;

type Key = keyof (typeof dict)["mn"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}

const I18nCtx = createContext<Ctx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mn");

  useEffect(() => {
    const saved = safeStorageGet("formly:lang") as Lang | null;
    if (saved === "mn" || saved === "en") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    safeStorageSet("formly:lang", l);
  }, []);

  const t = useCallback((k: Key) => dict[lang][k] ?? k, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t,
    }),
    [lang, setLang, t],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={`inline-flex items-center rounded-lg border bg-card p-0.5 text-xs font-medium ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => setLang("mn")}
        className={`rounded-md px-2.5 py-1 transition ${lang === "mn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        MN
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-md px-2.5 py-1 transition ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
    </div>
  );
}
