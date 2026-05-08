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

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const bootstrapAdminEmails = getBootstrapAdminEmails();
    if (bootstrapAdminEmails.size === 0) {
      return NextResponse.json({ synced: false, reason: "bootstrap-admins-not-configured" });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const email = user.email?.trim().toLowerCase();
    if (!email || !bootstrapAdminEmails.has(email)) {
      return NextResponse.json({ synced: false, reason: "email-not-allowed" });
    }

    const { data: existingRoles, error: roleLookupError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);

    if (roleLookupError) {
      return NextResponse.json({ error: roleLookupError.message }, { status: 500 });
    }

    if ((existingRoles ?? []).length > 0) {
      return NextResponse.json({ synced: false, reason: "already-admin" });
    }

    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: user.id,
      role: "admin",
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ synced: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync admin role.";
    const reason =
      message.includes("Invalid Supabase service role key")
        ? "invalid-service-role-key"
        : message.includes("SUPABASE_URL")
          ? "missing-supabase-url"
          : "sync-role-failed";

    return NextResponse.json(
      {
        error: message,
        reason,
      },
      { status: 500 },
    );
  }
}
