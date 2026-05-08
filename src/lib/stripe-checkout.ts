interface StripeConfigOptions {
  isDev: boolean;
  secretKey?: string;
  priceId?: string;
}

const STRIPE_SECRET_KEY_PATTERN = /^sk_(test|live)_[A-Za-z0-9]{16,}$/;
const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]{8,}$/;

function normalize(value?: string) {
  return value?.trim() ?? "";
}

export function hasUsableStripeSecretKey(secretKey?: string) {
  return STRIPE_SECRET_KEY_PATTERN.test(normalize(secretKey));
}

export function hasUsableStripePriceId(priceId?: string) {
  return STRIPE_PRICE_ID_PATTERN.test(normalize(priceId));
}

export function shouldUseMockCheckout({ isDev, secretKey, priceId }: StripeConfigOptions) {
  if (!isDev) {
    return false;
  }

  return !hasUsableStripeSecretKey(secretKey) || !hasUsableStripePriceId(priceId);
}
