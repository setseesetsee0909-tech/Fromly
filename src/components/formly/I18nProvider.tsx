import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
    "auth.demoTitle": "Demo нэвтрэлт",
    "auth.demoHint": "Туршилтын хэрэглэгч ашиглан нэвтэрнэ үү",
    "admin.title": "Админ самбар",
    "admin.users": "Хэрэглэгчид",
    "admin.surveys": "Бүх судалгаа",
    "admin.totalUsers": "Нийт хэрэглэгч",
    "admin.totalSurveys": "Нийт судалгаа",
    "admin.seedDemo": "Demo өгөгдөл нэмэх",
    "admin.seeding": "Үүсгэж байна...",
    "admin.makeAdmin": "Админ болгох",
    "admin.removeAdmin": "Админ цуцлах",
    "admin.noAccess": "Хандах эрхгүй",
    "landing.badge": "AI-аар судалгаа автоматаар үүсгэх",
    "landing.heroTitle1": "Ухаалаг судалгааг секундийн дотор",
    "landing.heroTitle2": "бүтээ.",
    "landing.heroDesc": "Formly бол судалгаа үүсгэх, түгээх, хариултыг бодит цагт аналитик болгон харах ухаалаг платформ. AI туслахаар асуултаа автоматаар бүтээгээрэй.",
    "landing.login": "Нэвтрэх",
    "landing.getStarted": "Эхлэх",
    "landing.feature1.title": "AI туслах",
    "landing.feature1.desc": "Зүгээр л санаагаа хэлээрэй — AI бүтэн судалгаа үүсгэнэ.",
    "landing.feature2.title": "Форм бүтээгч",
    "landing.feature2.desc": "Олон сонголт, текст, үнэлгээ — drag & drop-оор зохион байгуул.",
    "landing.feature3.title": "Бодит цагийн аналитик",
    "landing.feature3.desc": "Хариултуудыг graph, chart-аар шууд харах боломж.",
    "landing.sectionTitle": "Хялбар. Хурдан. Ухаалаг.",
    "landing.sectionDesc": "Формыг үүсгэх, түгээх, хариултыг шинжлэх бүх алхмыг нэг дороос хийгээрэй.",
    "landing.bullet1": "AI-аар судалгаа автоматаар үүсгэх",
    "landing.bullet2": "Public link-ээр хэн ч хариулах боломжтой",
    "landing.bullet3": "Bar / Pie / Line chart аналитик",
    "landing.bullet4": "Админы зориулалттай менежмент самбар",
    "landing.footer": "© 2026 Formly. Бүх эрх хуулиар хамгаалагдсан.",
    "plan.free": "Үнэгүй",
    "plan.pro": "Pro",
    "plan.team": "Баг",
    "plan.current": "Одоогийн",
    "plan.upgrade": "Сайжруулах",
    "plan.downgrade": "Free руу буцаах",
    "plan.activated": "Plan идэвхжлээ",
    "pricing.title": "Танд тохирох төлөвлөгөөг сонгоорой",
    "pricing.desc": "Хэдийд ч өөрчилж болно. Mock горим — бодит төлбөр авахгүй.",
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
    "analytics.export": "CSV экспорт",
    "watermark": "Formly-аар бүтээгдсэн",
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
    "auth.signup": "Create new account",
    "auth.signin": "Sign in",
    "auth.signupBtn": "Sign up",
    "auth.noAccount": "No account?",
    "auth.haveAccount": "Already have one?",
    "auth.demoTitle": "Demo accounts",
    "auth.demoHint": "Use a test account to log in",
    "admin.title": "Admin Panel",
    "admin.users": "Users",
    "admin.surveys": "All Surveys",
    "admin.totalUsers": "Total users",
    "admin.totalSurveys": "Total surveys",
    "admin.seedDemo": "Seed demo data",
    "admin.seeding": "Seeding...",
    "admin.makeAdmin": "Make admin",
    "admin.removeAdmin": "Revoke admin",
    "admin.noAccess": "Access denied",
    "landing.badge": "Build surveys automatically with AI",
    "landing.heroTitle1": "Build smart surveys in",
    "landing.heroTitle2": "seconds.",
    "landing.heroDesc": "Formly is a smart platform to create, share, and analyze surveys in real time. Let the AI assistant generate questions for you automatically.",
    "landing.login": "Sign in",
    "landing.getStarted": "Get Started",
    "landing.feature1.title": "AI Assistant",
    "landing.feature1.desc": "Just describe your idea — AI builds the entire survey.",
    "landing.feature2.title": "Form Builder",
    "landing.feature2.desc": "Multiple choice, text, rating — organize via drag & drop.",
    "landing.feature3.title": "Realtime Analytics",
    "landing.feature3.desc": "View responses instantly as graphs and charts.",
    "landing.sectionTitle": "Simple. Fast. Smart.",
    "landing.sectionDesc": "Create, share, and analyze your forms — all in one place.",
    "landing.bullet1": "Generate surveys automatically with AI",
    "landing.bullet2": "Anyone can respond via a public link",
    "landing.bullet3": "Bar / Pie / Line chart analytics",
    "landing.bullet4": "Dedicated management panel for admins",
    "landing.footer": "© 2026 Formly. All rights reserved.",
    "plan.free": "Free",
    "plan.pro": "Pro",
    "plan.team": "Team",
    "plan.current": "Current",
    "plan.upgrade": "Upgrade",
    "plan.downgrade": "Downgrade to Free",
    "plan.activated": "Plan activated",
    "pricing.title": "Choose the plan that fits you",
    "pricing.desc": "Change anytime. Mock mode — no real charges.",
    "billing.title": "Billing & Subscription",
    "billing.currentPlan": "Current plan",
    "billing.usage": "Usage",
    "billing.surveys": "Surveys",
    "billing.responses": "Responses",
    "billing.unlimited": "Unlimited",
    "team.title": "Team",
    "team.desc": "Invite members and collaborate (Team plan).",
    "team.create": "Create workspace",
    "team.invite": "Invite member",
    "team.email": "Email",
    "team.member": "Member",
    "team.removed": "Removed",
    "team.invited": "Invited",
    "team.needTeam": "Team plan is required for this feature",
    "limit.surveysReached": "Free plan: 3-survey limit reached. Upgrade to Pro.",
    "limit.responsesReached": "This survey reached the 100-response Free limit.",
    "limit.aiPro": "AI assistant is a Pro feature",
    "limit.exportPro": "Export is a Pro feature",
    "limit.mapPro": "Map is a Pro feature",
    "analytics.map": "Respondent locations",
    "analytics.export": "Export CSV",
    "watermark": "Made with Formly",
  },
} as const;

type Key = keyof typeof dict["mn"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}

const I18nCtx = createContext<Ctx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mn");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("formly:lang")) as Lang | null;
    if (saved === "mn" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("formly:lang", l);
  };

  const t = (k: Key) => dict[lang][k] ?? k;

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex items-center rounded-lg border bg-card p-0.5 text-xs font-medium ${className ?? ""}`}>
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