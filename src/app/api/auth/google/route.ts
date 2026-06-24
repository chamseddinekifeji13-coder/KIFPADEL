import { NextResponse } from "next/server";

import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { signInWithGoogleViaSupabase } from "@/modules/auth/google-sign-in-service";

export async function POST(request: Request) {
  const { supabase, attachCookies } = await createSupabaseRouteApiClient();

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    return attachCookies(
      NextResponse.json({ ok: false, error: "auth_config_error" }, { status: 400 }),
    );
  }

  const result = await signInWithGoogleViaSupabase(supabase, {
    locale: typeof body.locale === "string" ? body.locale : "fr",
    next: typeof body.next === "string" ? body.next : undefined,
    ref: typeof body.ref === "string" ? body.ref : null,
  });

  const status = result.ok ? 200 : 422;
  return attachCookies(NextResponse.json(result, { status }));
}
