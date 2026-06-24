import { NextResponse } from "next/server";

import { createSupabaseRouteApiClient } from "@/lib/supabase/route-api";
import { signUpWithSupabase } from "@/modules/auth/sign-up-service";
import type { SignUpInput } from "@/modules/auth/sign-up-types";

function isSignUpBody(body: unknown): body is SignUpInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.locale === "string" &&
    typeof b.email === "string" &&
    typeof b.password === "string" &&
    typeof b.phone === "string" &&
    typeof b.gender === "string"
  );
}

/** Inscription — chemin hors /api/auth/* (conflit avec [locale]/auth/...). */
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

  if (!isSignUpBody(body)) {
    return attachCookies(
      NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 }),
    );
  }

  const result = await signUpWithSupabase(supabase, {
    locale: body.locale,
    email: body.email,
    password: body.password,
    phone: body.phone,
    gender: body.gender,
    displayName: typeof body.displayName === "string" ? body.displayName : undefined,
    next: typeof body.next === "string" ? body.next : undefined,
    ref: typeof body.ref === "string" ? body.ref : null,
  });

  const status = result.ok ? 200 : 422;
  return attachCookies(NextResponse.json(result, { status }));
}
