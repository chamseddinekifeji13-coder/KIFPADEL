"use server";

import { redirect } from "next/navigation";

import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { signInWithSupabase } from "@/modules/auth/sign-in-service";

export async function signInAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const safeNext = sanitizeAuthNextPath(String(formData.get("next") ?? ""), locale);
  const supabase = await createSupabaseServerActionClient();

  const result = await signInWithSupabase(supabase, {
    locale,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: safeNext,
  });

  if (result.ok) {
    redirect(result.redirectTo);
  }

  redirect(`/${locale}/auth/sign-in?error=${result.error}&next=${encodeURIComponent(safeNext)}`);
}
