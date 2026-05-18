import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Plan } from "@/lib/plans";
import { createQPayInvoice } from "@/lib/qpay";
import { signQPayCheckoutToken } from "@/lib/qpay-checkout-token";

const QPAY_TOKEN_TTL_MS = 30 * 60 * 1000;
const VALID_PAID_PLANS = new Set<Plan>(["pro", "team"]);
const BILLING_STATE_SECRET =
  process.env.BILLING_STATE_SECRET ||
  process.env.QPAY_CLIENT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function isPaidPlan(value: unknown): value is Exclude<Plan, "free"> {
  return value === "pro" || value === "team";
}

export async function POST(req: Request) {
  try {
    if (!BILLING_STATE_SECRET) {
      return NextResponse.json({ error: "Missing billing state secret." }, { status: 500 });
    }

    const authorization = req.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const body = (await req.json()) as { plan?: Plan };
    const plan = body.plan;

    if (!plan || !isPaidPlan(plan) || !VALID_PAID_PLANS.has(plan)) {
      return NextResponse.json({ error: "Unsupported paid plan." }, { status: 400 });
    }

    const invoice = await createQPayInvoice({
      plan,
      userEmail: user.email,
      userId: user.id,
      userName:
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        undefined,
    });

    const verifyToken = signQPayCheckoutToken(
      {
        amount: invoice.amount,
        expiresAt: Date.now() + QPAY_TOKEN_TTL_MS,
        invoiceId: invoice.invoiceId,
        plan,
        userEmail: user.email,
        userId: user.id,
      },
      BILLING_STATE_SECRET,
    );

    return NextResponse.json({
      amount: invoice.amount,
      invoiceId: invoice.invoiceId,
      qrImageDataUrl: invoice.qrImageDataUrl,
      qrText: invoice.qrText,
      urls: invoice.urls,
      verifyToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create QPay invoice.",
      },
      { status: 500 },
    );
  }
}
