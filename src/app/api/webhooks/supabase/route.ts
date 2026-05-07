import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook handler for Supabase Auth events.
 * Listens for new user creation in auth.users and creates a corresponding profile.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Supabase Webhooks for Database changes follow this structure
    // We filter for INSERT events on the auth.users table
    if (payload.table === "users" && payload.type === "INSERT") {
      const user = payload.record;
      const adminClient = createSupabaseAdminClient();

      const { error } = await adminClient.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        display_name: user.raw_user_meta_data?.full_name || user.email.split("@")[0],
        avatar_url: user.raw_user_meta_data?.avatar_url || null,
        league: "Bronze", // Default starting league
        trust_score: 100.0,
        reliability: "Excellent",
      });

      if (error) {
        console.error("Error creating profile via webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
