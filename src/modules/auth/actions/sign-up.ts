"use server";

import { redirect } from "next/navigation";

/** Inscription email/mot de passe désactivée — utiliser Google Gmail (OAuth). */
export async function signUpAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  redirect(`/${locale}/auth/sign-up?error=use_google`);
}
