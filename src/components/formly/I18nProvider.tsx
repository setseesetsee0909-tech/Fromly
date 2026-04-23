import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "mn" | "en";

const dict = {
  mn: {
    "nav.dashboard": "Хяналтын самбар",
    "nav.new": "Шинэ судалгаа",
    "nav.ai": "AI туслах",
    "nav.admin": "Админ",
    "nav.signout": "Гарах",
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
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.new": "New Survey",
    "nav.ai": "AI Assistant",
    "nav.admin": "Admin",
    "nav.signout": "Sign out",
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