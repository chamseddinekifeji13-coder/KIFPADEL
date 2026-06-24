import { NextResponse } from "next/server";

import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { signInWithSupabase } from "@/modules/auth/sign-in-service";
import type { SignInInput } from "@/modules/auth/sign-in-types";

function isSignInBody(body: unknown): body is SignInInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.locale === "string" && typeof b.email === "string" && typeof b.password === "string";
}

export async function POST(request: Request) {
  const { supabase, attachCookies } = await createSupabaseRouteApiClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return attachCookies(
      NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 }),
    );
  }

  if (!isSignInBody(body)) {
    return attachCookies(
      NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 }),
    );
  }

  const result = await signInWithSupabase(supabase, {
    locale: body.locale,
    email: body.email,
    password: body.password,
    next: typeof body.next === "string" ? body.next : undefined,
  });

  const status = result.ok ? 200 : 422;
  return attachCookies(NextResponse.json(result, { status }));
}
