"use server";

import { signInWithGoogleViaSupabase } from "@/modules/auth/google-sign-in-service";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type GoogleSignInResult =
  | { ok: true; url: string }
  | { ok: false; error: "auth_config_error" };

export async function signInWithGoogleAction(formData: FormData): Promise<GoogleSignInResult> {
  const supabase = await createSupabaseServerActionClient();
  return signInWithGoogleViaSupabase(supabase, {
    locale: String(formData.get("locale") ?? "fr"),
    next: String(formData.get("next") ?? ""),
    ref: String(formData.get("ref") ?? ""),
  });
}
