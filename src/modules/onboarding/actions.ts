"use server";

import { redirect } from "next/navigation";
import { normalizePlayerCategoryId } from "@/domain/rules/player-category";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const city = String(formData.get("city") ?? "Tunis").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const phoneVerifiedFlag = String(formData.get("phoneVerified") ?? "") === "1";
  const rawLevel = String(formData.get("level") ?? "p25");
  const rawGender = String(formData.get("gender") ?? "").trim();
  const gender =
    rawGender === "male" || rawGender === "female" ? rawGender : null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile?.phone_verified_at && !phoneVerifiedFlag) {
    redirect(`/${locale}/onboarding?error=phone_not_verified`);
  }

  const phoneVerified = Boolean(existingProfile?.phone_verified_at || phoneVerifiedFlag);

  // Calculate trust score
  let trustScore = 50; // Base score
  if (phoneVerified) trustScore += 20;
  
  const levelBonuses: Record<string, number> = {
    p25: 5,
    p50: 8,
    p100: 10,
    p250: 15,
    p500: 18,
    p1000: 20,
  };
  const normalizedLevel = rawLevel.trim().toLowerCase();
  trustScore += levelBonuses[normalizedLevel] || 0;

  const league = normalizePlayerCategoryId(normalizedLevel);

  if (!displayName) {
    redirect(`/${locale}/onboarding?error=missing_name`);
  }

  const profilePayload = {
    display_name: displayName,
    city,
    phone,
    league,
    trust_score: trustScore,
    verification_level: phoneVerified ? 2 : 1,
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
