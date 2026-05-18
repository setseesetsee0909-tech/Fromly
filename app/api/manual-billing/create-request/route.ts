import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getManualBillingConfig, getManualBillingPlanAmount, hasUsableManualBillingConfig } from "@/lib/manual-billing";
import type { Plan } from "@/lib/plans";

function isPaidPlan(value: unknown): value is Exclude<Plan, "free"> {
  return value === "pro" || value === "team";
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

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const config = getManualBillingConfig();
    if (!hasUsableManualBillingConfig(config)) {
      return NextResponse.json(
        { error: "Manual billing is not configured yet. Add the bank details in your environment." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      note?: string;
      payerName?: string;
      plan?: Plan;
      transferReference?: string;
    };

    if (!isPaidPlan(body.plan)) {
      return NextResponse.json({ error: "Unsupported paid plan." }, { status: 400 });
    }

    const payerName = body.payerName?.trim() ?? "";
    const transferReference = body.transferReference?.trim() ?? "";
    const note = body.note?.trim() ?? "";

    if (!payerName) {
      return NextResponse.json({ error: "Missing payer name." }, { status: 400 });
    }

    if (!transferReference) {
      return NextResponse.json({ error: "Missing transfer reference." }, { status: 400 });
    }

    const { data: existingPending } = await supabaseAdmin
      .from("manual_billing_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending bank transfer request. Please wait for review." },
        { status: 409 },
      );
    }

    const amount = getManualBillingPlanAmount(body.plan, config);
    const { data, error } = await supabaseAdmin
      .from("manual_billing_requests")
      .insert({
        account_name: config.accountName,
        account_number: config.accountNumber,
        amount_mnt: amount,
        bank_name: config.bankName,
        note: note || null,
        payer_name: payerName,
        plan: body.plan,
        transfer_reference: transferReference,
        user_email: user.email,
        user_id: user.id,
      })
      .select(
        "id, amount_mnt, bank_name, account_name, account_number, payer_name, transfer_reference, note, plan, status, created_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Unable to create the bank transfer request." },
        { status: 500 },
      );
    }

    return NextResponse.json({ request: data, success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create the manual billing request.",
      },
      { status: 500 },
    );
  }
}
