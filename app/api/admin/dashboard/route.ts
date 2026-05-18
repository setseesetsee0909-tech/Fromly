import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getBootstrapAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";

  return new Set(
    raw
      .split(/[,\n;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function isAdminUser(userId: string, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (normalizedEmail && getBootstrapAdminEmails().has(normalizedEmail)) {
    return true;
  }

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

    if (!(await isAdminUser(user.id, user.email))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const [surveysResult, profilesResult, rolesResult, manualRequestsResult] = await Promise.all([
      supabaseAdmin
        .from("surveys")
        .select("id, title, is_published, created_at, owner_id")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("manual_billing_requests")
        .select(
          "id, user_id, user_email, plan, amount_mnt, status, bank_name, account_name, account_number, payer_name, transfer_reference, note, review_note, reviewed_at, reviewed_by, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      surveysResult.error ||
      profilesResult.error ||
      rolesResult.error ||
      manualRequestsResult.error;

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({
      manualRequests: manualRequestsResult.data ?? [],
      profiles: profilesResult.data ?? [],
      roles: rolesResult.data ?? [],
      surveys: surveysResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load admin dashboard." },
      { status: 500 },
    );
  }
}
