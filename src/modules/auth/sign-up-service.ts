import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { REFERRAL_COOKIE } from "@/lib/auth/referral-cookie";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";
import { formatTunisiaLocalDisplay, normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";
import { normalizeSignupEmail, normalizeSignupPassword } from "@/lib/auth/normalize-signup-email";
import { publicEnv } from "@/lib/config/env";
import { sendActivationEmailViaResend } from "@/modules/auth/send-activation-email";
import type { Gender } from "@/domain/types/core";
import { applyReferrerToProfile } from "@/modules/referrals/apply-referrer";
import type { SignUpErrorCode, SignUpInput, SignUpResult } from "@/modules/auth/sign-up-types";

function parseSignupGender(raw: string): Gender | null {
  const value = raw.trim();
  return value === "male" || value === "female" ? value : null;
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function signUpReturnPath(locale: string, safeNext: string, error: SignUpErrorCode, ref?: string | null) {
  const params = new URLSearchParams({ error, next: safeNext });
  if (ref) params.set("ref", ref);
  return `/${locale}/auth/sign-up?${params.toString()}`;
}

async function resolveReferrerId(inputRef?: string | null): Promise<string | null> {
  const fromInput = parseReferrerIdParam(inputRef ?? "");
  if (fromInput) return fromInput;
  const cookieStore = await cookies();
  return parseReferrerIdParam(cookieStore.get(REFERRAL_COOKIE)?.value);
}

async function clearReferralCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFERRAL_COOKIE);
}

function mapAuthSignUpError(error: {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
}): SignUpErrorCode {
  const diagnostic = `${error.name ?? ""}|${error.code ?? ""}|${error.status ?? ""}|${error.message ?? ""}`.toLowerCase();
  if (diagnostic.includes("already registered")) return "user_exists";
  if (diagnostic.includes("redirect") || diagnostic.includes("url")) return "invalid_redirect_url";
  if (
    diagnostic.includes("database error saving new user") ||
    diagnostic.includes("profiles key column not found") ||
    diagnostic.includes("on_auth_user_created") ||
    diagnostic.includes("handle_new_user")
  ) {
    return "profile_trigger_error";
  }
  if (
    diagnostic.includes("api key") ||
    diagnostic.includes("invalid jwt") ||
    diagnostic.includes("unauthorized") ||
    diagnostic.includes("forbidden")
  ) {
    return "auth_config_error";
  }
  if (diagnostic.includes("rate limit") || diagnostic.includes("too many requests")) return "rate_limited";
  if (
    diagnostic.includes("password") &&
    (diagnostic.includes("weak") ||
      diagnostic.includes("at least") ||
      diagnostic.includes("characters") ||
      diagnostic.includes("strength") ||
      diagnostic.includes("short") ||
      diagnostic.includes("minimum") ||
      diagnostic.includes("too small"))
  ) {
    return "weak_password";
  }
  if (
    diagnostic.includes("captcha") ||
    diagnostic.includes("bot") ||
    diagnostic.includes("security check") ||
    diagnostic.includes("human verification")
  ) {
    return "bot_protection";
  }
  if (
    (diagnostic.includes("email") && diagnostic.includes("invalid")) ||
    diagnostic.includes("invalid_email") ||
    diagnostic.includes("unable to validate email")
  ) {
    return "invalid_email";
  }
  if (
    diagnostic.includes("service unavailable") ||
    diagnostic.includes("temporarily unavailable") ||
    diagnostic.includes("timeout")
  ) {
    return "service_unavailable";
  }
  return "signup_failed";
}

export async function signUpWithSupabase(
  supabase: SupabaseClient,
  input: SignUpInput,
): Promise<SignUpResult> {
  const locale = input.locale || "fr";
  const email = normalizeSignupEmail(input.email);
  const password = normalizeSignupPassword(input.password);
  const phoneRaw = input.phone.trim();
  const displayName = (input.displayName ?? "").trim();
  const gender = parseSignupGender(input.gender);
  const safeNext = sanitizeAuthNextPath(input.next ?? "", locale, `/${locale}/onboarding`);
  const referrerId = await resolveReferrerId(input.ref);

  if (!email || !password || !phoneRaw) {
    return { ok: false, error: "missing_fields" };
  }
  if (!gender) {
    return { ok: false, error: "invalid_gender" };
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(phoneRaw);
  if (!phoneE164) {
    return { ok: false, error: "invalid_phone" };
  }

  try {
    const phoneTaken = await isPhoneE164VerifiedByAnotherUser(phoneE164);
    if (phoneTaken) {
      return { ok: false, error: "phone_in_use" };
    }
  } catch (dupErr) {
    console.warn("[signUpWithSupabase] phone duplicate check failed", dupErr);
    return { ok: false, error: "service_unavailable" };
  }

  const phoneLocal = digitsOnly(phoneRaw).replace(/^216/, "").slice(-8);
  const phoneDisplay = formatTunisiaLocalDisplay(phoneE164);
  const emailRedirectTo = `${publicEnv.siteUrl}/${locale}/auth/confirm-email?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        phone_local: phoneLocal,
        phone_e164: phoneE164,
        phone_display: phoneDisplay,
        gender,
      },
    },
  });

  if (error) {
    console.error("[signUpWithSupabase] Auth error:", JSON.stringify(error, null, 2));
    const code = mapAuthSignUpError(error);
    const detail = error.message?.trim() || undefined;
    return { ok: false, error: code, detail };
  }

  const userId = data.user?.id;
  const needsEmailConfirm = Boolean(data.user && !data.user.email_confirmed_at);

  if (needsEmailConfirm) {
    const mailed = await sendActivationEmailViaResend({ email, locale, next: safeNext });
    if (!mailed.ok) {
      console.error("[signUpWithSupabase] activation email failed", mailed.error);
      const signInParams = new URLSearchParams({
        status: "check_email",
        email_warning: "send_failed",
        next: safeNext,
      });
      return { ok: true, redirectTo: `/${locale}/auth/sign-in?${signInParams.toString()}` };
    }
  }

  if (userId) {
    try {
      const admin = createSupabaseAdminClient();
      const profilePatch: { phone: string; gender: Gender; display_name?: string } = {
        phone: phoneDisplay,
        gender,
      };
      if (displayName.length >= 2) {
        profilePatch.display_name = displayName;
      }
      await admin.from("profiles").update(profilePatch).eq("id", userId);
      await admin.from("player_notification_preferences").upsert({
        user_id: userId,
        tournaments_enabled: true,
        club_events_enabled: true,
        whatsapp_enabled: true,
        email_enabled: true,
        all_clubs_alerts: false,
        updated_at: new Date().toISOString(),
      });
      if (referrerId) {
        await applyReferrerToProfile(userId, referrerId);
        await clearReferralCookie();
      }
    } catch (initErr) {
      console.warn("[signUpWithSupabase] profile init failed", initErr);
    }
  }

  const signInParams = new URLSearchParams({
    status: "check_email",
    next: safeNext,
  });
  return { ok: true, redirectTo: `/${locale}/auth/sign-in?${signInParams.toString()}` };
}

export function signUpErrorRedirect(locale: string, safeNext: string, error: SignUpErrorCode, ref?: string | null) {
  return signUpReturnPath(locale, safeNext, error, ref);
}
