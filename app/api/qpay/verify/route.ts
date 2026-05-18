import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkQPayInvoicePayment } from "@/lib/qpay";
import { verifyQPayCheckoutToken } from "@/lib/qpay-checkout-token";

const BILLING_STATE_SECRET =
  process.env.BILLING_STATE_SECRET ||
  process.env.QPAY_CLIENT_SECRET ||
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

    const body = (await req.json()) as { verifyToken?: string };
    const checkout = body.verifyToken
      ? verifyQPayCheckoutToken(body.verifyToken, BILLING_STATE_SECRET)
      : null;

    if (!checkout) {
      return NextResponse.json(
        { error: "Invalid or expired QPay checkout token." },
        { status: 400 },
      );
    }

    if (checkout.userId !== user.id || checkout.userEmail !== user.email) {
      return NextResponse.json(
        { error: "QPay invoice does not belong to the signed-in user." },
        { status: 403 },
      );
    }

    const result = await checkQPayInvoicePayment(checkout.invoiceId);
    const paymentStatus = result.payment?.payment_status ?? "NEW";
    const isPaid =
      paymentStatus === "PAID" &&
      Number.isFinite(result.paidAmount) &&
      result.paidAmount >= checkout.amount;

    if (!isPaid) {
      return NextResponse.json({
        amount: checkout.amount,
        invoiceId: checkout.invoiceId,
        paidAmount: result.paidAmount,
        paymentStatus,
        success: false,
      });
    }

    const { error } = await activatePlan(checkout.userId, checkout.plan);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      amount: checkout.amount,
      invoiceId: checkout.invoiceId,
      paidAmount: result.paidAmount,
      paymentId: result.payment?.payment_id ?? null,
      paymentStatus,
      plan: checkout.plan,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected QPay verification error.",
      },
      { status: 500 },
    );
  }
}
