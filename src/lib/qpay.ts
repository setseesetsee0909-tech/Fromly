import type { Plan } from "@/lib/plans";

const DEFAULT_QPAY_BASE_URL = "https://merchant-sandbox.qpay.mn";

type PaidPlan = Exclude<Plan, "free">;

export interface QPayInvoiceLink {
  description?: string;
  link?: string;
  name?: string;
}

interface QPayAuthResponse {
  access_token?: string;
}

interface QPayCreateInvoiceResponse {
  invoice_id?: string;
  qr_image?: string;
  qr_text?: string;
  urls?: QPayInvoiceLink[];
}

interface QPayPaymentRow {
  payment_amount?: number | string;
  payment_currency?: string;
  payment_date?: string;
  payment_id?: string;
  payment_status?: string;
}

interface QPayPaymentCheckResponse {
  count?: number;
  paid_amount?: number | string;
  rows?: QPayPaymentRow[];
}

interface CreateQPayInvoiceInput {
  plan: PaidPlan;
  userEmail: string;
  userId: string;
  userName?: string;
}

function normalize(value?: string) {
  return value?.trim() ?? "";
}

function getQPayBaseUrl() {
  return normalize(process.env.QPAY_BASE_URL) || DEFAULT_QPAY_BASE_URL;
}

function getQPayCredentials() {
  const clientId = normalize(process.env.QPAY_CLIENT_ID);
  const clientSecret = normalize(process.env.QPAY_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("Missing QPAY_CLIENT_ID or QPAY_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

function getQPayPlanConfig(plan: PaidPlan) {
  const amountByPlan: Record<PaidPlan, string> = {
    pro: normalize(process.env.QPAY_PLAN_PRO_AMOUNT),
    team: normalize(process.env.QPAY_PLAN_TEAM_AMOUNT),
  };
  const invoiceCodeByPlan: Record<PaidPlan, string> = {
    pro: normalize(process.env.QPAY_INVOICE_CODE_PRO),
    team: normalize(process.env.QPAY_INVOICE_CODE_TEAM),
  };

  const amount = Number(amountByPlan[plan]);
  const invoiceCode = invoiceCodeByPlan[plan];

  if (!invoiceCode) {
    throw new Error(`Missing QPay invoice code for plan: ${plan}.`);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Missing QPay amount for plan: ${plan}.`);
  }

  return { amount, invoiceCode };
}

async function getQPayAccessToken() {
  const { clientId, clientSecret } = getQPayCredentials();
  const response = await fetch(`${getQPayBaseUrl()}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as QPayAuthResponse & {
    message?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.message || "Unable to fetch QPay access token.");
  }

  return data.access_token;
}

function toDataUrl(base64Image?: string) {
  const normalized = normalize(base64Image);

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("data:")) {
    return normalized;
  }

  return `data:image/png;base64,${normalized}`;
}

export async function createQPayInvoice({
  plan,
  userEmail,
  userId,
  userName,
}: CreateQPayInvoiceInput) {
  const token = await getQPayAccessToken();
  const { amount, invoiceCode } = getQPayPlanConfig(plan);
  const senderInvoiceNo = `${plan}-${userId}-${Date.now()}`.slice(0, 45);
  const description = `Formly ${plan.toUpperCase()} subscription`;
  const response = await fetch(`${getQPayBaseUrl()}/v2/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      invoice_code: invoiceCode,
      invoice_description: description,
      invoice_receiver_code: userId,
      invoice_receiver_data: {
        email: userEmail,
        name: userName || userEmail,
      },
      sender_invoice_no: senderInvoiceNo,
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as QPayCreateInvoiceResponse & {
    message?: string;
  };

  if (!response.ok || !data.invoice_id) {
    throw new Error(data.message || "Unable to create QPay invoice.");
  }

  return {
    amount,
    invoiceId: data.invoice_id,
    qrImageDataUrl: toDataUrl(data.qr_image),
    qrText: data.qr_text ?? "",
    urls: Array.isArray(data.urls) ? data.urls : [],
  };
}

export async function checkQPayInvoicePayment(invoiceId: string) {
  const token = await getQPayAccessToken();
  const response = await fetch(`${getQPayBaseUrl()}/v2/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_id: invoiceId,
      object_type: "INVOICE",
      offset: {
        page_limit: 100,
        page_number: 1,
      },
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as QPayPaymentCheckResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify QPay payment.");
  }

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const paidRow = rows.find((row) => row.payment_status === "PAID") ?? rows[0] ?? null;
  const paidAmount = Number(data.paid_amount ?? paidRow?.payment_amount ?? 0);

  return {
    paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
    payment: paidRow,
    rows,
  };
}
