import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdminUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    if (!(await isAdminUser(user.id))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as {
      action?: "approve" | "reject";
      requestId?: string;
      reviewNote?: string;
    };

    if (!body.requestId || (body.action !== "approve" && body.action !== "reject")) {
      return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
    }

    const { data: billingRequest, error: requestError } = await supabaseAdmin
      .from("manual_billing_requests")
      .select("id, plan, status, user_id")
      .eq("id", body.requestId)
      .maybeSingle();

    if (requestError || !billingRequest) {
      return NextResponse.json(
        { error: requestError?.message || "Manual billing request not found." },
        { status: 404 },
      );
    }

    if (billingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been reviewed." },
        { status: 409 },
      );
    }

    const reviewNote = body.reviewNote?.trim() ?? null;
    const nextStatus = body.action === "approve" ? "approved" : "rejected";

    const { error: updateRequestError } = await supabaseAdmin
      .from("manual_billing_requests")
      .update({
        review_note: reviewNote,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        status: nextStatus,
      })
      .eq("id", billingRequest.id);

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 });
    }

    if (body.action === "approve") {
      const { error: subscriptionError } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          { user_id: billingRequest.user_id, plan: billingRequest.plan, status: "active" },
          { onConflict: "user_id" },
        );

      if (subscriptionError) {
        return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to review billing request." },
      { status: 500 },
    );
  }
}
