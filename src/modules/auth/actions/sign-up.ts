"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { publicEnv } from "@/lib/config/env";

export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/${locale}/auth/sign-up?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const emailRedirectTo = `${publicEnv.siteUrl}/${locale}/auth/callback?next=/${locale}/onboarding`;
  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo,
    }
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

  // Redirect to sign-in page with a success message
  redirect(`/${locale}/auth/sign-in?status=check_email`);
}
