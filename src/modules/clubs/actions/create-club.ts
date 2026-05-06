"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

const MEMBERSHIP_USER_COLUMNS = ["player_id", "user_id"] as const;

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function assignClubManager(
  adminClient: SupabaseAdminClient,
  clubId: string,
  userId: string,
) {
  const errors: unknown[] = [];

  for (const userColumn of MEMBERSHIP_USER_COLUMNS) {
    const membershipPayload: Record<string, string | boolean> = {
      club_id: clubId,
      [userColumn]: userId,
      role: "club_manager",
      is_primary: true,
    };

    const { error: membershipInsertError } = await adminClient
      .from("club_memberships")
      .insert(membershipPayload);

    if (!membershipInsertError) {
      return { ok: true, userColumn } as const;
    }

    errors.push({ userColumn, step: "insert", error: membershipInsertError });

    const { data: existingMembership, error: membershipReadError } = await adminClient
      .from("club_memberships")
      .select("id")
      .eq("club_id", clubId)
      .eq(userColumn, userId)
      .maybeSingle();

    if (membershipReadError) {
      errors.push({ userColumn, step: "read_existing", error: membershipReadError });
      continue;
    }

    if (!existingMembership?.id) {
      continue;
    }

    const { error: membershipUpdateError } = await adminClient
      .from("club_memberships")
      .update({ role: "club_manager", is_primary: true })
      .eq("id", existingMembership.id);

    if (!membershipUpdateError) {
      return { ok: true, userColumn } as const;
    }

    errors.push({ userColumn, step: "update_existing", error: membershipUpdateError });
  }

  return { ok: false, errors } as const;
}

async function setPrimaryClubIfEmpty(
  adminClient: SupabaseAdminClient,
  userId: string,
  clubId: string,
) {
  for (const profileKey of ["id", "user_id"] as const) {
    const { error } = await adminClient
      .from("profiles")
      .update({ main_club_id: clubId })
      .eq(profileKey, userId)
      .is("main_club_id", null);

    if (!error) {
      return;
    }
  }
}

export async function createClubAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!name || !city) {
    redirect(`/${locale}/clubs/new?error=missing_fields`);
  }

  const supabase = await createSupabaseServerActionClient();
  const adminClient = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in?error=auth_required&next=/${locale}/clubs/new`);
  }

  // Create club with service role to bypass restrictive RLS defaults.
  const { data: createdClub, error: clubError } = await adminClient
    .from("clubs")
    .insert({
      name,
      city,
      is_active: true,
    })
    .select("id")
    .single();

  if (clubError || !createdClub) {
    console.error("[createClubAction] club creation failed", clubError);
    redirect(`/${locale}/clubs/new?error=create_failed`);
  }

  const clubId = createdClub.id as string;

  const managerAssignment = await assignClubManager(adminClient, clubId, user.id);
  if (!managerAssignment.ok) {
    console.error("[createClubAction] membership assignment failed", managerAssignment.errors);
    await adminClient.from("clubs").delete().eq("id", clubId);
    redirect(`/${locale}/clubs/new?error=membership_failed`);
  }

  await setPrimaryClubIfEmpty(adminClient, user.id, clubId);

  redirect(`/${locale}/club/dashboard?created=1`);
}
