import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeSecret(value: string | null) {
  return (value ?? "").trim().replace(/^Bearer\s+/i, "");
}

function isAuthorizedWebhook(request: Request) {
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error("[supabase-webhook] Missing SUPABASE_WEBHOOK_SECRET");
    return false;
  }

  const providedSecret =
    normalizeSecret(request.headers.get("authorization")) ||
    normalizeSecret(request.headers.get("x-webhook-secret")) ||
    normalizeSecret(request.headers.get("x-supabase-webhook-secret"));

  return providedSecret === expectedSecret;
}

/**
 * Webhook handler for Supabase Auth events.
 * Listens for new user creation in auth.users and creates a corresponding profile.
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorizedWebhook(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();

    // Supabase Webhooks for Database changes follow this structure
    // We filter for INSERT events on the auth.users table
    if (payload.table === "users" && payload.type === "INSERT") {
      const user = payload.record;
      const adminClient = createSupabaseAdminClient();

      const displayName =
        user.raw_user_meta_data?.full_name ||
        user.raw_user_meta_data?.display_name ||
        user.email?.split("@")[0] ||
        "Player";

      const { error } = await adminClient.from("profiles").insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: user.raw_user_meta_data?.avatar_url ?? null,
        league: "bronze",
        trust_score: 70,
        reliability_status: "healthy",
        sport_rating: 1200,
        gender: null,
      });

      if (error) {
        console.error("Error creating profile via webhook:", error);
        return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, created: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
