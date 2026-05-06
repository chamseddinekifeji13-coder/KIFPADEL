"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const supabase = await createSupabaseServerActionClient();

  await supabase.auth.signOut();

  redirect(`/${locale}`);
}
