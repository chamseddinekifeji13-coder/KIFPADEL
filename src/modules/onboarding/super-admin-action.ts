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
  client: ReturnType<typeof createSupabaseAdminClient> | Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const byId = await client.from("profiles").update(payload).eq("id", userId);
  if (!byId.error) return;

  await client.from("profiles").update(payload).eq("user_id", userId);
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

  if (displayName) {
    await updateProfileByKnownKeys(supabase, user.id, { display_name: displayName });
  }

  // Primary path: promote the authenticated user profile to super admin.
  const setRoleById = await supabase
    .from("profiles")
    .update({ global_role: "super_admin" })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  let roleUpdated = !setRoleById.error && Boolean(setRoleById.data);
  if (!roleUpdated) {
    const setRoleByUserId = await supabase
      .from("profiles")
      .update({ global_role: "super_admin" })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();
    roleUpdated = !setRoleByUserId.error && Boolean(setRoleByUserId.data);
  }
  // Do not hard-fail here: some environments may not expose global_role yet.

  const adminClient = createSupabaseAdminClient();

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
    // If we could set global role, we can still continue to admin.
    if (roleUpdated) {
      redirect(`/${locale}/admin?onboarded=1`);
    }
    redirect(`/${locale}/onboarding/super-admin?error=setup_failed`);
  }

  const { data: existingMembership, error: membershipReadError } = await adminClient
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("player_id", user.id)
    .maybeSingle();

  if (membershipReadError) {
    // Non-blocking now: global_role already grants admin access.
    redirect(`/${locale}/admin?onboarded=1`);
  }

  if (existingMembership?.id) {
    const { error: membershipUpdateError } = await adminClient
      .from("club_memberships")
      .update({ role: "platform_admin", is_primary: false })
      .eq("id", existingMembership.id);

    if (membershipUpdateError) {
      redirect(`/${locale}/admin?onboarded=1`);
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
      redirect(`/${locale}/admin?onboarded=1`);
    }
  }

  redirect(`/${locale}/admin?onboarded=1`);
}
