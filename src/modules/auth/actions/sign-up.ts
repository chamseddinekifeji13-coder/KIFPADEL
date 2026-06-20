"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPhoneE164VerifiedByAnotherUser } from "@/lib/phone/phone-duplicate-guard";
import { formatTunisiaLocalDisplay } from "@/lib/phone/normalize-tunisia";
import { normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";
import { publicEnv } from "@/lib/config/env";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { sendActivationEmailViaResend } from "@/modules/auth/send-activation-email";

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  if (!email || !password || !phoneRaw) {
    redirect(`/${locale}/auth/sign-up?error=missing_fields`);
  }

  const phoneE164 = normalizeTunisiaPhoneToE164(phoneRaw);
  if (!phoneE164) {
    redirect(`/${locale}/auth/sign-up?error=invalid_phone`);
  }

  try {
    if (await isPhoneE164VerifiedByAnotherUser(phoneE164)) {
      redirect(`/${locale}/auth/sign-up?error=phone_in_use`);
    }
  } catch (dupErr) {
    console.warn("[signUpAction] phone duplicate check failed", dupErr);
    redirect(`/${locale}/auth/sign-up?error=signup_failed`);
  }

  const phoneLocal = digitsOnly(phoneRaw).replace(/^216/, "").slice(-8);
  const phoneDisplay = formatTunisiaLocalDisplay(phoneE164);

  const supabase = await createSupabaseServerActionClient();
  const onboardingPath = `/${locale}/onboarding`;
  const emailRedirectTo = `${publicEnv.siteUrl}/${locale}/auth/confirm-email?next=${encodeURIComponent(onboardingPath)}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        phone_local: phoneLocal,
        phone_e164: phoneE164,
        phone_display: phoneDisplay,
      },
    },
  });

  if (error) {
    console.error("[signUpAction] Auth error details:", JSON.stringify(error, null, 2));
    const diagnostic = `${error.name}|${(error as { code?: string }).code ?? ""}|${(error as { status?: number }).status ?? ""}|${error.message}`.toLowerCase();
    if (diagnostic.includes("already registered")) {
      redirect(`/${locale}/auth/sign-up?error=user_exists`);
    }
    if (diagnostic.includes("redirect") || diagnostic.includes("url")) {
      redirect(`/${locale}/auth/sign-up?error=invalid_redirect_url`);
    }
    if (
      diagnostic.includes("database error saving new user") ||
      diagnostic.includes("profiles key column not found") ||
      diagnostic.includes("on_auth_user_created") ||
      diagnostic.includes("handle_new_user")
    ) {
      redirect(`/${locale}/auth/sign-up?error=profile_trigger_error`);
    }
    if (
      diagnostic.includes("api key") ||
      diagnostic.includes("invalid jwt") ||
      diagnostic.includes("unauthorized") ||
      diagnostic.includes("forbidden")
    ) {
      redirect(`/${locale}/auth/sign-up?error=auth_config_error`);
    }
    if (diagnostic.includes("rate limit") || diagnostic.includes("too many requests")) {
      redirect(`/${locale}/auth/sign-up?error=rate_limited`);
    }
    redirect(`/${locale}/auth/sign-up?error=signup_failed`);
  }

  const userId = data.user?.id;
  const needsEmailConfirm = Boolean(data.user && !data.user.email_confirmed_at);

  if (needsEmailConfirm) {
    const mailed = await sendActivationEmailViaResend({ email, locale });
    if (!mailed.ok) {
      console.error("[signUpAction] activation email via Resend failed", mailed.error);
    }
  }

  if (userId) {
    try {
      const admin = createSupabaseAdminClient();
      await admin.from("profiles").update({ phone: phoneDisplay }).eq("id", userId);
      await admin.from("player_notification_preferences").upsert({
        user_id: userId,
        tournaments_enabled: true,
        club_events_enabled: true,
        whatsapp_enabled: true,
        email_enabled: true,
        all_clubs_alerts: false,
        updated_at: new Date().toISOString(),
      });
    } catch (initErr) {
      console.warn("[signUpAction] profile phone / notification prefs init failed", initErr);
    }
  }

  redirect(`/${locale}/auth/sign-in?status=check_email`);
}
