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

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const wantsAll = url.searchParams.get("scope") === "all";
    const admin = wantsAll ? await isAdminUser(user.id) : false;

    if (wantsAll && !admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const query = supabaseAdmin
      .from("manual_billing_requests")
      .select(
        "id, user_id, user_email, plan, amount_mnt, status, bank_name, account_name, account_number, payer_name, transfer_reference, note, review_note, reviewed_at, reviewed_by, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    const { data, error } = wantsAll && admin ? await query : await query.eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load billing requests." },
      { status: 500 },
    );
  }
}
