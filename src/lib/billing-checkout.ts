import { getStripeCheckoutMode } from "@/lib/stripe-checkout";

export type BillingCheckoutMode =
  | "mock"
  | "manual"
  | "monpay"
  | "qpay"
  | "stripe_test"
  | "stripe_live"
  | "unavailable";

interface BillingCheckoutModeOptions {
  isDev: boolean;
  billingProvider?: string;
  manualAccountName?: string;
  manualAccountNumber?: string;
  manualAmounts: Array<number | string | undefined>;
  manualBankName?: string;
  monpayAmounts: Array<number | string | undefined>;
  monpayClientId?: string;
  monpayClientSecret?: string;
  qpayAmounts: Array<number | string | undefined>;
  qpayClientId?: string;
  qpayClientSecret?: string;
  qpayInvoiceCodes: Array<string | undefined>;
  stripePriceIds: Array<string | undefined>;
  stripeSecretKey?: string;
}

function normalize(value?: string) {
  return value?.trim() ?? "";
}

function hasUsableQPayAmount(amount: number | string | undefined) {
  const value = typeof amount === "number" ? amount : Number(normalize(amount));
  return Number.isFinite(value) && value > 0;
}

export function hasUsableMonPayConfig({
  monpayAmounts,
  monpayClientId,
  monpayClientSecret,
}: Pick<BillingCheckoutModeOptions, "monpayAmounts" | "monpayClientId" | "monpayClientSecret">) {
  return (
    normalize(monpayClientId).length > 0 &&
    normalize(monpayClientSecret).length > 0 &&
    monpayAmounts.length > 0 &&
    monpayAmounts.every((amount) => hasUsableQPayAmount(amount))
  );
}

export function hasUsableManualBillingConfig({
  manualAccountName,
  manualAccountNumber,
  manualAmounts,
  manualBankName,
}: Pick<
  BillingCheckoutModeOptions,
  "manualAccountName" | "manualAccountNumber" | "manualAmounts" | "manualBankName"
>) {
  return (
    normalize(manualBankName).length > 0 &&
    normalize(manualAccountName).length > 0 &&
    normalize(manualAccountNumber).length > 0 &&
    manualAmounts.length > 0 &&
    manualAmounts.every((amount) => hasUsableQPayAmount(amount))
  );
}

export function hasUsableQPayConfig({
  qpayClientId,
  qpayClientSecret,
  qpayInvoiceCodes,
  qpayAmounts,
}: Pick<
  BillingCheckoutModeOptions,
  "qpayAmounts" | "qpayClientId" | "qpayClientSecret" | "qpayInvoiceCodes"
>) {
  return (
    normalize(qpayClientId).length > 0 &&
    normalize(qpayClientSecret).length > 0 &&
    qpayInvoiceCodes.length > 0 &&
    qpayInvoiceCodes.every((invoiceCode) => normalize(invoiceCode).length > 0) &&
    qpayAmounts.length > 0 &&
    qpayAmounts.every((amount) => hasUsableQPayAmount(amount))
  );
}

function resolveStripeMode(mode: ReturnType<typeof getStripeCheckoutMode>): BillingCheckoutMode {
  if (mode === "test") {
    return "stripe_test";
  }

  if (mode === "live") {
    return "stripe_live";
  }

  if (mode === "mock") {
    return "mock";
  }

  return "unavailable";
}

export function getBillingCheckoutMode({
  isDev,
  billingProvider,
  manualAccountName,
  manualAccountNumber,
  manualAmounts,
  manualBankName,
  monpayAmounts,
  monpayClientId,
  monpayClientSecret,
  qpayAmounts,
  qpayClientId,
  qpayClientSecret,
  qpayInvoiceCodes,
  stripePriceIds,
  stripeSecretKey,
}: BillingCheckoutModeOptions): BillingCheckoutMode {
  const normalizedProvider = normalize(billingProvider).toLowerCase();
  const hasManualBilling = hasUsableManualBillingConfig({
    manualAccountName,
    manualAccountNumber,
    manualAmounts,
    manualBankName,
  });
  const hasMonPay = hasUsableMonPayConfig({
    monpayAmounts,
    monpayClientId,
    monpayClientSecret,
  });
  const hasQPay = hasUsableQPayConfig({
    qpayClientId,
    qpayClientSecret,
    qpayInvoiceCodes,
    qpayAmounts,
  });
  const stripeMode = resolveStripeMode(
    getStripeCheckoutMode({
      isDev,
      secretKey: stripeSecretKey,
      priceIds: stripePriceIds,
    }),
  );

  if (normalizedProvider === "qpay") {
    if (hasQPay) {
      return "qpay";
    }

    return isDev ? "mock" : "unavailable";
  }

  if (normalizedProvider === "monpay") {
    if (hasMonPay) {
      return "monpay";
    }

    return isDev ? "mock" : "unavailable";
  }

  if (normalizedProvider === "stripe") {
    return stripeMode;
  }

  if (normalizedProvider === "manual") {
    if (hasManualBilling) {
      return "manual";
    }

    return "unavailable";
  }

  if (normalizedProvider === "mock") {
    return "mock";
  }

  if (hasManualBilling) {
    return "manual";
  }

  if (hasQPay) {
    return "qpay";
  }

  if (hasMonPay) {
    return "monpay";
  }

  return stripeMode;
}
