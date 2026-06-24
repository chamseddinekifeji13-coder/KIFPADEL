import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import type { SignInErrorCode, SignInInput, SignInResult } from "@/modules/auth/sign-in-types";

function mapSignInError(error: {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
}): SignInErrorCode {
  const diagnostic = `${error.name ?? ""}|${error.code ?? ""}|${error.status ?? ""}|${error.message ?? ""}`.toLowerCase();
  if (diagnostic.includes("email not confirmed")) return "email_not_confirmed";
  if (
    diagnostic.includes("api key") ||
    diagnostic.includes("invalid jwt") ||
    diagnostic.includes("unauthorized") ||
    diagnostic.includes("forbidden")
  ) {
    return "auth_config_error";
  }
  if (diagnostic.includes("rate limit") || diagnostic.includes("too many requests")) return "rate_limited";
  return "invalid_credentials";
}

export async function signInWithSupabase(
  supabase: SupabaseClient,
  input: SignInInput,
): Promise<SignInResult> {
  const locale = input.locale || "fr";
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const next = sanitizeAuthNextPath(input.next ?? "", locale);

  if (!email || !password) {
    return { ok: false, error: "missing_fields" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[signInWithSupabase] Auth error:", JSON.stringify(error, null, 2));
    return { ok: false, error: mapSignInError(error) };
  }

  return { ok: true, redirectTo: next };
}
