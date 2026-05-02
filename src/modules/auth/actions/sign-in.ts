"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function signInAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/${locale}/auth/sign-in?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Sign-in error:", error);
    redirect(`/${locale}/auth/sign-in?error=invalid_credentials`);
  }

  redirect(`/${locale}/profile`);
}
