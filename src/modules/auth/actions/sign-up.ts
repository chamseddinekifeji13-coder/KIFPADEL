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
  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/onboarding`,
    }
  });

  if (error) {
    console.error("Auth error:", error);
    redirect(`/${locale}/auth/sign-up?error=signup_failed`);
  }

  // Redirect to sign-in page with a success message
  redirect(`/${locale}/auth/sign-in?status=check_email`);
}
