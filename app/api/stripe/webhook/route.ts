import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Plan } from "@/lib/plans";

export const runtime = "nodejs";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM;
const WEBHOOK_TOLERANCE_SECONDS = 300;
const PLAN_BY_PRICE_ID: Record<string, Plan> = Object.fromEntries(
  [
    [STRIPE_PRICE_PRO, "pro"],
    [STRIPE_PRICE_TEAM, "team"],
  ].filter((entry): entry is [string, Plan] => Boolean(entry[0])),
);

type StripeEvent = {
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type SubscriptionUpdate = {
  currentPeriodEnd: string | null;
  plan: Plan;
  status: string;
  userId: string;
};

function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro" || value === "team";
}

function getPlanFromPriceId(priceId: unknown): Plan | null {
  if (typeof priceId !== "string") {
    return null;
  }

  return PLAN_BY_PRICE_ID[priceId] ?? null;
}

function hasValidWebhookSignature(payload: string, signatureHeader: string, secret: string) {
  const pairs = signatureHeader.split(",").map((part) => part.split("="));
  const timestamp = pairs.find(([key]) => key === "t")?.[1];
  const signatures = pairs.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return signatures.some((signature) => {
    try {
      return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  });
}

function getCheckoutSessionUpdate(object: Record<string, unknown>): SubscriptionUpdate | null {
  const metadata =
    object.metadata && typeof object.metadata === "object"
      ? (object.metadata as Record<string, unknown>)
      : {};

  const userId = metadata.userId;
  const plan = metadata.plan;

  if (typeof userId !== "string" || !isPlan(plan) || plan === "free") {
    return null;
  }

  return {
    userId,
    plan,
    status: "active",
    currentPeriodEnd: null,
  };
}

function getSubscriptionObjectUpdate(object: Record<string, unknown>): SubscriptionUpdate | null {
  const metadata =
    object.metadata && typeof object.metadata === "object"
      ? (object.metadata as Record<string, unknown>)
      : {};
  const userId = metadata.userId;
  const metadataPlan = metadata.plan;
  const items =
    object.items && typeof object.items === "object"
      ? (object.items as { data?: Array<{ price?: { id?: unknown } }> })
      : undefined;
  const priceId = items?.data?.[0]?.price?.id;
  const status = typeof object.status === "string" ? object.status : "unknown";
  const currentPeriodEndUnix =
    typeof object.current_period_end === "number" ? object.current_period_end : null;
  const mappedPlan = isPlan(metadataPlan) ? metadataPlan : getPlanFromPriceId(priceId);
  const hasPaidAccess = status === "active" || status === "trialing" || status === "past_due";

  if (typeof userId !== "string") {
    return null;
  }

  return {
    userId,
    plan: hasPaidAccess ? (mappedPlan ?? "free") : "free",
    status,
    currentPeriodEnd: currentPeriodEndUnix
      ? new Date(currentPeriodEndUnix * 1000).toISOString()
      : null,
  };
}

async function upsertSubscription(update: SubscriptionUpdate) {
  return supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: update.userId,
      plan: update.plan,
      status: update.status,
      current_period_end: update.currentPeriodEnd,
    },
    { onConflict: "user_id" },
  );
}

export async function POST(req: Request) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await req.text();
    if (!hasValidWebhookSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as StripeEvent;
    const object = event.data?.object;

    if (!object) {
      return NextResponse.json({ received: true, ignored: true });
    }

    let update: SubscriptionUpdate | null = null;

    if (event.type === "checkout.session.completed") {
      update = getCheckoutSessionUpdate(object);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      update = getSubscriptionObjectUpdate(object);
    }

    if (!update) {
      return NextResponse.json({ received: true, ignored: true, type: event.type });
    }

    const { error } = await upsertSubscription(update);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      received: true,
      plan: update.plan,
      status: update.status,
      userId: update.userId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected Stripe webhook error.",
      },
      { status: 500 },
    );
  }
}
