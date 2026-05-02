"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const city = String(formData.get("city") ?? "Tunis").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rawLevel = String(formData.get("level") ?? "beginner");

  // Calculate trust score
  let trustScore = 50; // Base score
  if (phone) trustScore += 20; // Phone bonus
  
  const levelBonuses: Record<string, number> = {
    beginner: 5,
    intermediate: 10,
    advanced: 15,
    expert: 20,
  };
  trustScore += levelBonuses[rawLevel] || 0;

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

  // Upsert profile (create or update)
  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      display_name: displayName,
      city: city,
      phone: phone,
      league: league,
      trust_score: trustScore,
      verification_level: phone ? 2 : 1,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error("Onboarding error:", error);
    const encodedError = encodeURIComponent(error.message);
    redirect(`/${locale}/onboarding?error=${encodedError}`);
  }

  redirect(`/${locale}/dashboard`);
}
