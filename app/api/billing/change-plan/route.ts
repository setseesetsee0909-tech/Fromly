import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Plan } from "@/lib/plans";

const ALLOWED_SELF_SERVICE_PLANS = new Set<Plan>(["free"]);

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const body = (await request.json()) as { plan?: Plan };
    const plan = body.plan;

    if (!plan) {
      return NextResponse.json({ error: "Missing plan." }, { status: 400 });
    }

    if (!ALLOWED_SELF_SERVICE_PLANS.has(plan)) {
      return NextResponse.json(
        { error: "Paid plans can only be activated through verified checkout." },
        { status: 403 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert({ user_id: user.id, plan, status: "active" }, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update subscription.",
      },
      { status: 500 },
    );
  }
}
