import { NextResponse } from "next/server";
import { shouldUseMockCheckout } from "@/lib/stripe-checkout";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM;
const IS_DEV = process.env.NODE_ENV !== "production";

const PRICE_IDS: Record<string, string | undefined> = {
  pro: STRIPE_PRICE_PRO,
  team: STRIPE_PRICE_TEAM,
};

export async function POST(req: Request) {
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
  const { plan } = body as {
    plan?: string;
  };

  if (!plan) {
    return NextResponse.json({ error: "Missing checkout details." }, { status: 400 });
  }

  const userId = user.id;
  const userEmail = user.email;

  const priceId = PRICE_IDS[plan];
  if (!priceId && !IS_DEV) {
    return NextResponse.json({ error: `Unsupported plan: ${plan}` }, { status: 400 });
  }

  if (shouldUseMockCheckout({ isDev: IS_DEV, secretKey: STRIPE_SECRET_KEY, priceId })) {
    const mockSessionId = `mock:${plan}:${userId}:${encodeURIComponent(userEmail)}`;
    return NextResponse.json({
      url: `${NEXT_PUBLIC_APP_URL}/stripe/success?session_id=${encodeURIComponent(mockSessionId)}`,
    });
  }

  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
  }

  if (!priceId) {
    return NextResponse.json({ error: `Missing Stripe price for plan: ${plan}` }, { status: 500 });
  }

  const params = new URLSearchParams();
  params.append("payment_method_types[]", "card");
  params.append("mode", "subscription");
  params.append("client_reference_id", userId);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append(
    "success_url",
    `${NEXT_PUBLIC_APP_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
  );
  params.append("cancel_url", `${NEXT_PUBLIC_APP_URL}/pricing`);
  params.append("customer_email", userEmail);
  params.append("metadata[plan]", plan);
  params.append("metadata[userId]", userId);
  params.append("metadata[userEmail]", userEmail);
  params.append("subscription_data[metadata][plan]", plan);
  params.append("subscription_data[metadata][userId]", userId);
  params.append("subscription_data[metadata][userEmail]", userEmail);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || "Stripe checkout failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.url });
}
