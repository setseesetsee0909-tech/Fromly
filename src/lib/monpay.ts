import type { Plan } from "@/lib/plans";

const DEFAULT_MONPAY_API_BASE_URL = "https://api.monpay.mn/resource/partner/v1";
const DEFAULT_MONPAY_TOKEN_URL = "https://z-wallet.monpay.mn/v2/oauth/token";

type PaidPlan = Exclude<Plan, "free">;

interface MonPayTokenResponse {
  access_token?: string;
}

interface MonPayCreatePaymentInput {
  customerPhone: string;
  plan: PaidPlan;
}

interface MonPayConfirmPaymentInput {
  amount: number;
  customerPhone: string;
  tanCode: string;
}

interface MonPayApiResponse {
  code: string;
  info: string;
  requestId: string;
  transactionId: string;
}

function normalize(value?: string) {
  return value?.trim() ?? "";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function normalizeMonPayPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length === 8) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith("976")) {
    return digits.slice(3);
  }

  throw new Error("MonPay requires an 8-digit Mongolian mobile number.");
}

function getMonPayApiBaseUrl() {
  return normalize(process.env.MONPAY_API_BASE_URL) || DEFAULT_MONPAY_API_BASE_URL;
}

function getMonPayTokenUrl() {
  return normalize(process.env.MONPAY_TOKEN_URL) || DEFAULT_MONPAY_TOKEN_URL;
}

function getMonPayCredentials() {
  const clientId = normalize(process.env.MONPAY_CLIENT_ID);
  const clientSecret = normalize(process.env.MONPAY_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("Missing MONPAY_CLIENT_ID or MONPAY_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

function getMonPayPlanConfig(plan: PaidPlan) {
  const amountByPlan: Record<PaidPlan, string> = {
    pro: normalize(process.env.MONPAY_PLAN_PRO_AMOUNT),
    team: normalize(process.env.MONPAY_PLAN_TEAM_AMOUNT),
  };

  const amount = Number(amountByPlan[plan]);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Missing MonPay amount for plan: ${plan}.`);
  }

  return {
    amount,
    description: `Formly ${plan.toUpperCase()} subscription`,
    product: normalize(process.env.MONPAY_PRODUCT_NAME) || "Formly subscription",
    productType: normalize(process.env.MONPAY_PRODUCT_TYPE) || "Software",
    smsPrefix: normalize(process.env.MONPAY_SMS_PREFIX) || "Formly payment",
    smsSuffix: normalize(process.env.MONPAY_SMS_SUFFIX) || "Confirm the payment with the TAN code.",
  };
}

async function getMonPayAccessToken() {
  const { clientId, clientSecret } = getMonPayCredentials();
  const tokenUrl = new URL(getMonPayTokenUrl());
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as MonPayTokenResponse & {
    error?: string;
    message?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.message || data.error || "Unable to fetch MonPay access token.");
  }

  return data.access_token;
}

function parseXmlValue(xml: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  return xml.match(pattern)?.[1]?.trim() ?? "";
}

function parseMonPayApiResponse(rawBody: string): MonPayApiResponse {
  if (!rawBody.trim()) {
    throw new Error("MonPay returned an empty response.");
  }

  try {
    const data = JSON.parse(rawBody) as Partial<MonPayApiResponse> & {
      result?: Partial<MonPayApiResponse>;
    };

    if (data.result) {
      return {
        code: String(data.code ?? data.result.code ?? ""),
        info: String(data.info ?? data.result.info ?? ""),
        requestId: String(data.requestId ?? data.result.requestId ?? ""),
        transactionId: String(data.transactionId ?? data.result.transactionId ?? ""),
      };
    }

    return {
      code: String(data.code ?? ""),
      info: String(data.info ?? ""),
      requestId: String(data.requestId ?? ""),
      transactionId: String(data.transactionId ?? ""),
    };
  } catch {
    return {
      code: parseXmlValue(rawBody, "code"),
      info: parseXmlValue(rawBody, "info"),
      requestId: parseXmlValue(rawBody, "requestId"),
      transactionId: parseXmlValue(rawBody, "transactionId"),
    };
  }
}

async function callMonPayPartnerApi(pathname: string, requestXml: string) {
  const token = await getMonPayAccessToken();
  const response = await fetch(`${getMonPayApiBaseUrl()}${pathname}`, {
    method: "POST",
    headers: {
      Accept: "application/json, application/xml;q=0.9, text/xml;q=0.8",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/xml",
    },
    body: requestXml,
    cache: "no-store",
  });

  const rawBody = await response.text();
  const data = parseMonPayApiResponse(rawBody);

  if (!response.ok) {
    throw new Error(data.info || "MonPay request failed.");
  }

  if (data.code !== "0") {
    throw new Error(data.info || "MonPay payment was rejected.");
  }

  return data;
}

export async function createMonPayTanPayment({ customerPhone, plan }: MonPayCreatePaymentInput) {
  const normalizedPhone = normalizeMonPayPhoneNumber(customerPhone);
  const { amount, description, product, productType, smsPrefix, smsSuffix } =
    getMonPayPlanConfig(plan);
  const requestXml = `<request>
  <customer system="ISDN">${escapeXml(normalizedPhone)}</customer>
  <amount>${amount}</amount>
  <description>${escapeXml(description)}</description>
  <smsPrefix>${escapeXml(smsPrefix)}</smsPrefix>
  <smsSuffix>${escapeXml(smsSuffix)}</smsSuffix>
  <product>${escapeXml(product)}</product>
  <productType>${escapeXml(productType)}</productType>
</request>`;
  const result = await callMonPayPartnerApi("/sell", requestXml);

  return {
    amount,
    customerPhone: normalizedPhone,
    info: result.info,
    requestId: result.requestId,
    transactionId: result.transactionId,
  };
}

export async function confirmMonPayTanPayment({
  amount,
  customerPhone,
  tanCode,
}: MonPayConfirmPaymentInput) {
  const normalizedPhone = normalizeMonPayPhoneNumber(customerPhone);
  const normalizedTanCode = normalize(tanCode);

  if (!normalizedTanCode) {
    throw new Error("Missing MonPay TAN code.");
  }

  const requestXml = `<request>
  <customer system="ISDN">${escapeXml(normalizedPhone)}</customer>
  <amount>${amount}</amount>
  <tancode>${escapeXml(normalizedTanCode)}</tancode>
</request>`;
  const result = await callMonPayPartnerApi("/sellconfirm", requestXml);

  return {
    customerPhone: normalizedPhone,
    info: result.info,
    requestId: result.requestId,
    transactionId: result.transactionId,
  };
}
