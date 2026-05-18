import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { confirmMonPayTanPayment } from "@/lib/monpay";
import { verifyMonPayCheckoutToken } from "@/lib/monpay-checkout-token";

const BILLING_STATE_SECRET =
  process.env.BILLING_STATE_SECRET ||
  process.env.MONPAY_CLIENT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

async function activatePlan(userId: string, plan: "pro" | "team") {
  return supabaseAdmin
    .from("subscriptions")
    .upsert({ user_id: userId, plan, status: "active" }, { onConflict: "user_id" });
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

    const body = (await req.json()) as { tanCode?: string; verifyToken?: string };
    const checkout = body.verifyToken
      ? verifyMonPayCheckoutToken(body.verifyToken, BILLING_STATE_SECRET)
      : null;
    const tanCode = body.tanCode?.trim() ?? "";

    if (!checkout) {
      return NextResponse.json(
        { error: "Invalid or expired MonPay checkout token." },
        { status: 400 },
      );
    }

    if (checkout.userId !== user.id || checkout.userEmail !== user.email) {
      return NextResponse.json(
        { error: "MonPay payment does not belong to the signed-in user." },
        { status: 403 },
      );
    }

    if (!tanCode) {
      return NextResponse.json({ error: "Missing MonPay TAN code." }, { status: 400 });
    }

    const payment = await confirmMonPayTanPayment({
      amount: checkout.amount,
      customerPhone: checkout.customerPhone,
      tanCode,
    });
    const { error } = await activatePlan(checkout.userId, checkout.plan);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customerPhone: payment.customerPhone,
      plan: checkout.plan,
      requestId: payment.requestId,
      success: true,
      transactionId: payment.transactionId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected MonPay confirmation error.",
      },
      { status: 500 },
    );
  }
}
