import { normalizeEnvValue } from "@/lib/env";

interface StripeConfigOptions {
  isDev: boolean;
  secretKey?: string;
  priceId?: string;
}

interface StripeModeOptions {
  isDev: boolean;
  secretKey?: string;
  priceIds: Array<string | undefined>;
}

export type StripeCheckoutMode = "mock" | "test" | "live" | "unavailable";

const STRIPE_SECRET_KEY_PATTERN = /^sk_(test|live)_[A-Za-z0-9]{16,}$/;
const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]{8,}$/;

function normalize(value?: string) {
  return normalizeEnvValue(value);
}

export function hasUsableStripeSecretKey(secretKey?: string) {
  return STRIPE_SECRET_KEY_PATTERN.test(normalize(secretKey));
}

export function hasUsableStripePriceId(priceId?: string) {
  return STRIPE_PRICE_ID_PATTERN.test(normalize(priceId));
}

export function getStripeSecretKeyMode(
  secretKey?: string,
): Exclude<StripeCheckoutMode, "mock" | "unavailable"> | null {
  const normalized = normalize(secretKey);

  if (normalized.startsWith("sk_test_") && hasUsableStripeSecretKey(normalized)) {
    return "test";
  }

  if (normalized.startsWith("sk_live_") && hasUsableStripeSecretKey(normalized)) {
    return "live";
  }

  return null;
}

export function getStripeCheckoutMode({
  isDev,
  secretKey,
  priceIds,
}: StripeModeOptions): StripeCheckoutMode {
  const keyMode = getStripeSecretKeyMode(secretKey);
  const hasAllPrices =
    priceIds.length > 0 && priceIds.every((priceId) => hasUsableStripePriceId(priceId));

  if (keyMode && hasAllPrices) {
    return keyMode;
  }

  if (isDev) {
    return "mock";
  }

  return "unavailable";
}

export function shouldUseMockCheckout({ isDev, secretKey, priceId }: StripeConfigOptions) {
  return getStripeCheckoutMode({ isDev, secretKey, priceIds: [priceId] }) === "mock";
}
