"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export async function completeSuperAdminOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const secret = String(formData.get("secret") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  const expectedSecret = process.env.SUPER_ADMIN_ONBOARDING_KEY?.trim();
  if (!expectedSecret) {
    redirect(`/${locale}/onboarding/super-admin?error=feature_not_configured`);
  }

  if (!secret || secret !== expectedSecret) {
    redirect(`/${locale}/onboarding/super-admin?error=invalid_secret`);
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/onboarding/super-admin`);
  }

  const adminClient = createSupabaseAdminClient();

  if (displayName) {
    await adminClient
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
  }

  // Best effort: set the global role when available.
  await adminClient
    .from("profiles")
    .update({ global_role: "super_admin" })
    .eq("id", user.id);

  const { data: firstClub } = await adminClient
    .from("clubs")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let clubId = firstClub?.id as string | undefined;
  if (!clubId) {
    const { data: createdClub } = await adminClient
      .from("clubs")
      .insert({ name: "Kifpadel Platform", city: "Tunis", is_active: true })
      .select("id")
      .single();
    clubId = createdClub?.id as string | undefined;
  }

  if (!clubId) {
    redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
  }

  const { error: membershipError } = await adminClient
    .from("club_memberships")
    .upsert(
      {
        club_id: clubId,
        player_id: user.id,
        role: "platform_admin",
        is_primary: false,
      },
      { onConflict: "club_id,player_id" },
    );

  if (membershipError) {
    redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
  }

  redirect(`/${locale}/admin?onboarded=1`);
}
