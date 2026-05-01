"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/${locale}/auth/sign-up?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/${locale}/auth/sign-up?error=signup_failed`);
  }

  if (!data.session) {
    redirect(`/${locale}/auth/sign-in?status=check_email`);
  }

  redirect(`/${locale}/onboarding`);
}
