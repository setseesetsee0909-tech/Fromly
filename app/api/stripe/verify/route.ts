import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Plan } from "@/lib/plans";
import { getStripeSecretKeyMode } from "@/lib/stripe-checkout";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const IS_DEV = process.env.NODE_ENV !== "production";
const VALID_PLANS = new Set<Plan>(["free", "pro", "team"]);
const STRIPE_MODE = getStripeSecretKeyMode(STRIPE_SECRET_KEY) ?? "live";

function isPlan(value: string): value is Plan {
  return VALID_PLANS.has(value as Plan);
}

async function activatePlan(userId: string, plan: Plan) {
  return supabaseAdmin
    .from("subscriptions")
    .upsert({ user_id: userId, plan, status: "active" }, { onConflict: "user_id" });
}

export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const { sessionId } = body as {
      sessionId?: string;
    };
    const userEmail = user.email;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    if (IS_DEV && sessionId.startsWith("mock:")) {
      const [, plan, userId, encodedEmail] = sessionId.split(":");
      const decodedEmail = encodedEmail ? decodeURIComponent(encodedEmail) : "";

      if (!plan || !userId || !decodedEmail) {
        return NextResponse.json({ error: "Invalid mock checkout session." }, { status: 400 });
      }

      if (!isPlan(plan)) {
        return NextResponse.json({ error: `Unsupported plan: ${plan}` }, { status: 400 });
      }

      if (decodedEmail !== userEmail || userId !== user.id) {
        return NextResponse.json(
          { error: "Payment email does not match signed-in user." },
          { status: 403 },
        );
      }

      const { error } = await activatePlan(userId, plan);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, plan, mode: "mock" });
    }

    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }

    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      },
    );

    const checkoutSession = await response.json();
    if (!response.ok || checkoutSession.error) {
      return NextResponse.json(
        { error: checkoutSession.error?.message || "Unable to retrieve checkout session." },
        { status: 500 },
      );
    }

    const paid = checkoutSession.payment_status === "paid" || checkoutSession.status === "complete";
    if (!paid) {
      return NextResponse.json({ error: "Payment has not been completed." }, { status: 400 });
    }

    if (checkoutSession.customer_details?.email !== userEmail) {
      return NextResponse.json(
        { error: "Payment email does not match signed-in user." },
        { status: 403 },
      );
    }

    const metadata = checkoutSession.metadata ?? {};
    const userId = metadata.userId;
    const plan = metadata.plan;
    const metadataEmail = metadata.userEmail;

    if (!userId || !plan || !isPlan(plan) || metadataEmail !== userEmail || userId !== user.id) {
      return NextResponse.json({ error: "Invalid session metadata." }, { status: 400 });
    }

    const { error } = await activatePlan(userId, plan);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan, mode: STRIPE_MODE });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected verification error.",
      },
      { status: 500 },
    );
  }
}
