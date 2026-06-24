"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { REFERRAL_COOKIE } from "@/lib/auth/referral-cookie";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";
import { formatTunisiaLocalDisplay } from "@/lib/phone/normalize-tunisia";
import { normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";
import { publicEnv } from "@/lib/config/env";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { sendActivationEmailViaResend } from "@/modules/auth/send-activation-email";
import type { Gender } from "@/domain/types/core";
import { applyReferrerToProfile } from "@/modules/referrals/apply-referrer";

function parseSignupGender(raw: string): Gender | null {
  const value = raw.trim();
  return value === "male" || value === "female" ? value : null;
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function signUpReturnPath(locale: string, safeNext: string, query: Record<string, string>, ref?: string | null) {
  const params = new URLSearchParams(query);
  params.set("next", safeNext);
  if (ref) params.set("ref", ref);
  return `/${locale}/auth/sign-up?${params.toString()}`;
}

async function resolveReferrerId(formData: FormData): Promise<string | null> {
  const fromForm = parseReferrerIdParam(String(formData.get("ref") ?? ""));
  if (fromForm) return fromForm;
  const cookieStore = await cookies();
  return parseReferrerIdParam(cookieStore.get(REFERRAL_COOKIE)?.value);
}

async function clearReferralCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFERRAL_COOKIE);
}

export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const gender = parseSignupGender(String(formData.get("gender") ?? ""));
  const safeNext = sanitizeAuthNextPath(String(formData.get("next") ?? ""), locale, `/${locale}/onboarding`);
  const referrerId = await resolveReferrerId(formData);

  if (!email || !password || !phoneRaw) {
    redirect(signUpReturnPath(locale, safeNext, { error: "missing_fields" }, referrerId));
  }

  if (!gender) {
    redirect(signUpReturnPath(locale, safeNext, { error: "invalid_gender" }, referrerId));
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(phoneRaw);
  if (!phoneE164) {
    redirect(signUpReturnPath(locale, safeNext, { error: "invalid_phone" }, referrerId));
  }

  try {
    if (await isPhoneE164VerifiedByAnotherUser(phoneE164)) {
      redirect(signUpReturnPath(locale, safeNext, { error: "phone_in_use" }, referrerId));
    }
  } catch (dupErr) {
    console.warn("[signUpAction] phone duplicate check failed", dupErr);
    redirect(signUpReturnPath(locale, safeNext, { error: "signup_failed" }, referrerId));
  }

  const phoneLocal = digitsOnly(phoneRaw).replace(/^216/, "").slice(-8);
  const phoneDisplay = formatTunisiaLocalDisplay(phoneE164);

  const supabase = await createSupabaseServerActionClient();
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
    console.error("[signUpAction] Auth error details:", JSON.stringify(error, null, 2));
    const diagnostic = `${error.name}|${(error as { code?: string }).code ?? ""}|${(error as { status?: number }).status ?? ""}|${error.message}`.toLowerCase();
    if (diagnostic.includes("already registered")) {
      redirect(signUpReturnPath(locale, safeNext, { error: "user_exists" }, referrerId));
    }
    if (diagnostic.includes("redirect") || diagnostic.includes("url")) {
      redirect(signUpReturnPath(locale, safeNext, { error: "invalid_redirect_url" }, referrerId));
    }
    if (
      diagnostic.includes("database error saving new user") ||
      diagnostic.includes("profiles key column not found") ||
      diagnostic.includes("on_auth_user_created") ||
      diagnostic.includes("handle_new_user")
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "profile_trigger_error" }, referrerId));
    }
    if (
      diagnostic.includes("api key") ||
      diagnostic.includes("invalid jwt") ||
      diagnostic.includes("unauthorized") ||
      diagnostic.includes("forbidden")
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "auth_config_error" }, referrerId));
    }
    if (diagnostic.includes("rate limit") || diagnostic.includes("too many requests")) {
      redirect(signUpReturnPath(locale, safeNext, { error: "rate_limited" }, referrerId));
    }
    if (
      diagnostic.includes("password") &&
      (diagnostic.includes("weak") ||
        diagnostic.includes("at least") ||
        diagnostic.includes("characters") ||
        diagnostic.includes("strength"))
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "weak_password" }, referrerId));
    }
    if (
      diagnostic.includes("captcha") ||
      diagnostic.includes("bot") ||
      diagnostic.includes("security check") ||
      diagnostic.includes("human verification")
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "bot_protection" }, referrerId));
    }
    if (
      (diagnostic.includes("email") && diagnostic.includes("invalid")) ||
      diagnostic.includes("invalid_email")
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "invalid_email" }, referrerId));
    }
    if (
      diagnostic.includes("service unavailable") ||
      diagnostic.includes("temporarily unavailable") ||
      diagnostic.includes("timeout")
    ) {
      redirect(signUpReturnPath(locale, safeNext, { error: "service_unavailable" }, referrerId));
    }
    redirect(signUpReturnPath(locale, safeNext, { error: "signup_failed" }, referrerId));
  }

  const userId = data.user?.id;
  const needsEmailConfirm = Boolean(data.user && !data.user.email_confirmed_at);

  if (needsEmailConfirm) {
    const mailed = await sendActivationEmailViaResend({ email, locale, next: safeNext });
    if (!mailed.ok) {
      console.error("[signUpAction] activation email via Resend failed", mailed.error);
      redirect(
        `/${locale}/auth/sign-in?status=check_email&email_warning=send_failed&next=${encodeURIComponent(safeNext)}`,
      );
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
      console.warn("[signUpAction] profile phone / notification prefs init failed", initErr);
    }
  }

  const signInParams = new URLSearchParams({
    status: "check_email",
    next: safeNext,
  });
  redirect(`/${locale}/auth/sign-in?${signInParams.toString()}`);
}
