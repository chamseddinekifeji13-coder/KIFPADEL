"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const city = String(formData.get("city") ?? "Tunis").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rawLevel = String(formData.get("level") ?? "beginner");
  const rawGender = String(formData.get("gender") ?? "").trim();
  const gender =
    rawGender === "male" || rawGender === "female" ? rawGender : null;

  // Calculate trust score. Phone verification is not wired to a real OTP provider yet,
  // so a typed phone number must not increase trust or verification level.
  let trustScore = 50; // Base score
  
  const levelBonuses: Record<string, number> = {
    beginner: 5,
    intermediate: 10,
    advanced: 15,
    expert: 20,
  };
  trustScore += levelBonuses[rawLevel] || 0;

  // Map UI level IDs to database league names
  const levelMap: Record<string, string> = {
    beginner: "bronze",
    intermediate: "silver",
    advanced: "gold",
    expert: "platinum",
  };
  const league = levelMap[rawLevel] || "bronze";

  if (!displayName) {
    redirect(`/${locale}/onboarding?error=missing_name`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const profilePayload = {
    display_name: displayName,
    city,
    phone,
    league,
    trust_score: trustScore,
    verification_level: 1,
    gender,
  };

  const fallbackProfilePayload = {
    display_name: displayName,
    city,
    phone,
    league,
    trust_score: trustScore,
    gender,
  };

  // Avoid upsert here: some environments can keep stale schema cache for conflict keys.
  let { data: updatedRows, error: updateError } = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("id", user.id)
    .select("id");

  const updateDiagnostic = `${updateError?.message ?? ""}`.toLowerCase();
  if (updateError && updateDiagnostic.includes("verification_level")) {
    const retry = await supabase
      .from("profiles")
      .update(fallbackProfilePayload)
      .eq("id", user.id)
      .select("id");
    updatedRows = retry.data;
    updateError = retry.error;
  }

  if (updateError && `${updateError.message}`.toLowerCase().includes("gender")) {
    const { gender: _omit, ...noGender } = profilePayload;
    const retry = await supabase.from("profiles").update(noGender).eq("id", user.id).select("id");
    updatedRows = retry.data;
    updateError = retry.error;
  }

  if (updateError) {
    console.error("Onboarding update error:", updateError);
    const encodedError = encodeURIComponent(updateError.message);
    redirect(`/${locale}/onboarding?error=${encodedError}`);
  }

  if (!updatedRows || updatedRows.length === 0) {
    let { error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        ...profilePayload,
      });

    const insertDiagnostic = `${insertError?.message ?? ""}`.toLowerCase();
    if (insertError && insertDiagnostic.includes("verification_level")) {
      const retry = await supabase.from("profiles").insert({
        id: user.id,
        ...fallbackProfilePayload,
      });
      insertError = retry.error;
    }

    if (insertError && `${insertError.message}`.toLowerCase().includes("gender")) {
      const { gender: _omit, ...noGender } = profilePayload;
      const retry = await supabase.from("profiles").insert({ id: user.id, ...noGender });
      insertError = retry.error;
    }

    if (insertError) {
      console.error("Onboarding insert error:", insertError);
      const encodedError = encodeURIComponent(insertError.message);
      redirect(`/${locale}/onboarding?error=${encodedError}`);
    }
  }

  redirect(`/${locale}/profile`);
}
