import type { Plan } from "@/lib/plans";

type PaidPlan = Exclude<Plan, "free">;

export interface ManualBillingConfig {
  accountName: string;
  accountNumber: string;
  bankName: string;
  note: string;
  planAmounts: Record<PaidPlan, number>;
}

function normalize(value?: string) {
  return value?.trim() ?? "";
}

function readAmount(value?: string) {
  const amount = Number(normalize(value));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function getManualBillingConfig(): ManualBillingConfig {
  return {
    accountName: normalize(process.env.MANUAL_BILLING_ACCOUNT_NAME),
    accountNumber: normalize(process.env.MANUAL_BILLING_ACCOUNT_NUMBER),
    bankName: normalize(process.env.MANUAL_BILLING_BANK_NAME),
    note: normalize(process.env.MANUAL_BILLING_NOTE),
    planAmounts: {
      pro: readAmount(process.env.MANUAL_BILLING_PLAN_PRO_AMOUNT ?? process.env.QPAY_PLAN_PRO_AMOUNT),
      team: readAmount(
        process.env.MANUAL_BILLING_PLAN_TEAM_AMOUNT ?? process.env.QPAY_PLAN_TEAM_AMOUNT,
      ),
    },
  };
}

export function hasUsableManualBillingConfig(config: ManualBillingConfig) {
  return (
    config.bankName.length > 0 &&
    config.accountName.length > 0 &&
    config.accountNumber.length > 0 &&
    config.planAmounts.pro > 0 &&
    config.planAmounts.team > 0
  );
}

export function getManualBillingPlanAmount(plan: PaidPlan, config = getManualBillingConfig()) {
  return config.planAmounts[plan];
}
