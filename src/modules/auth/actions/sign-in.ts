"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

function getSafeNextPath(rawNext: FormDataEntryValue | null, locale: string) {
  const fallback = `/${locale}/profile`;
  const next = String(rawNext ?? "").trim();

  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;

  return next;
}

export async function signInAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"), locale);

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
    const diagnostic = `${error.name}|${(error as { code?: string }).code ?? ""}|${(error as { status?: number }).status ?? ""}|${error.message}`.toLowerCase();
    if (diagnostic.includes("email not confirmed")) {
      redirect(`/${locale}/auth/sign-in?error=email_not_confirmed`);
    }
    if (
      diagnostic.includes("api key") ||
      diagnostic.includes("invalid jwt") ||
      diagnostic.includes("unauthorized") ||
      diagnostic.includes("forbidden")
    ) {
      redirect(`/${locale}/auth/sign-in?error=auth_config_error`);
    }
    if (diagnostic.includes("rate limit") || diagnostic.includes("too many requests")) {
      redirect(`/${locale}/auth/sign-in?error=rate_limited`);
    }
    redirect(`/${locale}/auth/sign-in?error=invalid_credentials`);
  }

  redirect(next);
}
