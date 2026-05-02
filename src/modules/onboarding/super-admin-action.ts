"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

function normalizeSecret(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
}

function getConfiguredSecret() {
  const candidates = [
    process.env.SUPER_ADMIN_ONBOARDING_KEY,
    process.env.SUPER_ADMIN_SECRET,
    process.env.ADMIN_ONBOARDING_KEY,
    // Fallback for misconfigured environments.
    process.env.NEXT_PUBLIC_SUPER_ADMIN_ONBOARDING_KEY,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return normalizeSecret(candidate);
    }
  }

  return "";
}

async function updateProfileByKnownKeys(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const byId = await adminClient.from("profiles").update(payload).eq("id", userId);
  if (!byId.error) return;

  await adminClient.from("profiles").update(payload).eq("user_id", userId);
}

export async function completeSuperAdminOnboardingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const secret = normalizeSecret(String(formData.get("secret") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();

  const expectedSecret = getConfiguredSecret();
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
    await updateProfileByKnownKeys(adminClient, user.id, { display_name: displayName });
  }

  // Best effort: set the global role when available.
  await updateProfileByKnownKeys(adminClient, user.id, { global_role: "super_admin" });

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

  const { data: existingMembership, error: membershipReadError } = await adminClient
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("player_id", user.id)
    .maybeSingle();

  if (membershipReadError) {
    redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
  }

  if (existingMembership?.id) {
    const { error: membershipUpdateError } = await adminClient
      .from("club_memberships")
      .update({ role: "platform_admin", is_primary: false })
      .eq("id", existingMembership.id);

    if (membershipUpdateError) {
      redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
    }
  } else {
    const { error: membershipInsertError } = await adminClient
      .from("club_memberships")
      .insert({
        club_id: clubId,
        player_id: user.id,
        role: "platform_admin",
        is_primary: false,
      });

    if (membershipInsertError) {
      redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
    }
  }

  redirect(`/${locale}/admin?onboarded=1`);
}
