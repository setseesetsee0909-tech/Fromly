export type Plan = "free" | "pro" | "team";

export const PLAN_LIMITS: Record<Plan, { surveys: number; responsesPerSurvey: number; aiEnabled: boolean; aiSurveyLimit: number; export: boolean; watermark: boolean; team: boolean; map: boolean }> = {
  free: { surveys: Infinity, responsesPerSurvey: 100, aiEnabled: true, aiSurveyLimit: 3, export: false, watermark: true, team: false, map: false },
  pro: { surveys: Infinity, responsesPerSurvey: Infinity, aiEnabled: true, aiSurveyLimit: Infinity, export: true, watermark: false, team: false, map: true },
  team: { surveys: Infinity, responsesPerSurvey: Infinity, aiEnabled: true, aiSurveyLimit: Infinity, export: true, watermark: false, team: true, map: true },
};

export const PLAN_PRICE: Record<Plan, { mn: string; en: string; usd: number }> = {
  free: { mn: "Үнэгүй", en: "Free", usd: 0 },
  pro: { mn: "$10 / сар", en: "$10 / mo", usd: 10 },
  team: { mn: "$20 / сар", en: "$20 / mo", usd: 20 },
};

export function isUnlimited(n: number) {
  return !isFinite(n);
}