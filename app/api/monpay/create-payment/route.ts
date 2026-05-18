import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createMonPayTanPayment } from "@/lib/monpay";
import { signMonPayCheckoutToken } from "@/lib/monpay-checkout-token";
import type { Plan } from "@/lib/plans";

const MONPAY_TOKEN_TTL_MS = 10 * 60 * 1000;
const VALID_PAID_PLANS = new Set<Plan>(["pro", "team"]);
const BILLING_STATE_SECRET =
  process.env.BILLING_STATE_SECRET ||
  process.env.MONPAY_CLIENT_SECRET ||
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

    const body = (await req.json()) as { phoneNumber?: string; plan?: Plan };
    const plan = body.plan;
    const phoneNumber = body.phoneNumber?.trim() ?? "";

    if (!plan || !isPaidPlan(plan) || !VALID_PAID_PLANS.has(plan)) {
      return NextResponse.json({ error: "Unsupported paid plan." }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: "Missing MonPay phone number." }, { status: 400 });
    }

    const payment = await createMonPayTanPayment({
      customerPhone: phoneNumber,
      plan,
    });

    const verifyToken = signMonPayCheckoutToken(
      {
        amount: payment.amount,
        customerPhone: payment.customerPhone,
        expiresAt: Date.now() + MONPAY_TOKEN_TTL_MS,
        plan,
        requestId: payment.requestId,
        transactionId: payment.transactionId,
        userEmail: user.email,
        userId: user.id,
      },
      BILLING_STATE_SECRET,
    );

    return NextResponse.json({
      amount: payment.amount,
      customerPhone: payment.customerPhone,
      requestId: payment.requestId,
      transactionId: payment.transactionId,
      verifyToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create MonPay payment.",
      },
      { status: 500 },
    );
  }
}
