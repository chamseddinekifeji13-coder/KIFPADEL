"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect(`/${locale}/auth/sign-in?error=missing_fields`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
    }
  });

  if (error) {
    console.error("Sign-in error:", error);
    redirect(`/${locale}/auth/sign-in?error=invalid_credentials`);
  }

  redirect(`/${locale}/auth/sign-in?status=check_email`);
}
