"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { signUpErrorRedirect, signUpWithSupabase } from "@/modules/auth/sign-up-service";
import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { parseReferrerIdParam } from "@/lib/referrals/referral-url";

export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const safeNext = sanitizeAuthNextPath(String(formData.get("next") ?? ""), locale, `/${locale}/onboarding`);
  const referrerId = parseReferrerIdParam(String(formData.get("ref") ?? ""));

  const supabase = await createSupabaseServerActionClient();
  const result = await signUpWithSupabase(supabase, {
    locale,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    next: safeNext,
    ref: referrerId,
  });

  if (result.ok) {
    redirect(result.redirectTo);
  }

  redirect(signUpErrorRedirect(locale, safeNext, result.error, referrerId));
}
