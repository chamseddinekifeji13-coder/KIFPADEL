"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const city = String(formData.get("city") ?? "Tunis").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rawLevel = String(formData.get("level") ?? "beginner");

  // Map UI level IDs to database league names
  const levelMap: Record<string, string> = {
    beginner: "Bronze",
    intermediate: "Silver",
    advanced: "Gold",
    expert: "Platinum",
  };
  const league = levelMap[rawLevel] || "Bronze";

  if (!displayName) {
    redirect(`/${locale}/onboarding?error=missing_name`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      city: city,
      phone: phone,
      league: league,
      verification_level: phone ? 2 : 1, // Higher verification level if phone provided
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Onboarding error:", error);
    redirect(`/${locale}/onboarding?error=update_failed`);
  }

  redirect(`/${locale}/dashboard`);
}
