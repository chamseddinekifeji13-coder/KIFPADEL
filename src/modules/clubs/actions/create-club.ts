"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

const MEMBERSHIP_USER_COLUMNS = ["player_id", "user_id"] as const;
const MANAGER_ROLES = ["club_manager", "club_admin", "manager", "admin", "owner"] as const;

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type MembershipPayload = Record<string, string | boolean>;

function buildMembershipPayloads(
  clubId: string,
  userId: string,
  role: (typeof MANAGER_ROLES)[number],
) {
  return [
    {
      label: "player_id_and_user_id",
      payload: {
        club_id: clubId,
        player_id: userId,
        user_id: userId,
        role,
        is_primary: true,
      },
      lookupColumns: MEMBERSHIP_USER_COLUMNS,
    },
    {
      label: "player_id",
      payload: {
        club_id: clubId,
        player_id: userId,
        role,
        is_primary: true,
      },
      lookupColumns: ["player_id"] as const,
    },
    {
      label: "user_id",
      payload: {
        club_id: clubId,
        user_id: userId,
        role,
        is_primary: true,
      },
      lookupColumns: ["user_id"] as const,
    },
  ] satisfies Array<{
    label: string;
    payload: MembershipPayload;
    lookupColumns: readonly (typeof MEMBERSHIP_USER_COLUMNS)[number][];
  }>;
}

async function assignClubManager(
  adminClient: SupabaseAdminClient,
  clubId: string,
  userId: string,
) {
  const errors: unknown[] = [];

  for (const role of MANAGER_ROLES) {
    const payloads = buildMembershipPayloads(clubId, userId, role);

    for (const { label, payload, lookupColumns } of payloads) {
      const { error: membershipInsertError } = await adminClient
        .from("club_memberships")
        .insert(payload);

      if (!membershipInsertError) {
        return { ok: true, label, role } as const;
      }

      errors.push({ label, role, step: "insert", error: membershipInsertError });

      let existingMembershipQuery = adminClient
        .from("club_memberships")
        .select("id")
        .eq("club_id", clubId);

      for (const userColumn of lookupColumns) {
        existingMembershipQuery = existingMembershipQuery.eq(userColumn, userId);
      }

      const { data: existingMembership, error: membershipReadError } =
        await existingMembershipQuery.maybeSingle();

      if (membershipReadError) {
        errors.push({ label, role, step: "read_existing", error: membershipReadError });
        continue;
      }

      if (!existingMembership?.id) {
        continue;
      }

      const { error: membershipUpdateError } = await adminClient
        .from("club_memberships")
        .update({ role, is_primary: true })
        .eq("id", existingMembership.id);

      if (!membershipUpdateError) {
        return { ok: true, label, role } as const;
      }

      errors.push({ label, role, step: "update_existing", error: membershipUpdateError });
    }
  }

  return { ok: false, errors } as const;
}

async function setPrimaryClub(
  adminClient: SupabaseAdminClient,
  userId: string,
  clubId: string,
) {
  for (const profileKey of ["id", "user_id"] as const) {
    const { error } = await adminClient
      .from("profiles")
      .update({ main_club_id: clubId })
      .eq(profileKey, userId);

    if (!error) {
      return;
    }
  }
}

async function ensureDefaultCourt(adminClient: SupabaseAdminClient, clubId: string) {
  const { data: existingCourts, error: existingCourtsError } = await adminClient
    .from("courts")
    .select("id")
    .eq("club_id", clubId)
    .limit(1);

  if (existingCourtsError) {
    console.warn("[createClubAction] default court lookup failed", existingCourtsError);
    return;
  }

  if ((existingCourts ?? []).length > 0) {
    return;
  }

  const { error: createCourtError } = await adminClient.from("courts").insert({
    club_id: clubId,
    label: "Terrain 1",
    surface: "standard",
    is_indoor: false,
  });

  if (createCourtError) {
    console.warn("[createClubAction] default court creation failed", createCourtError);
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

  await setPrimaryClub(adminClient, user.id, clubId);
  await ensureDefaultCourt(adminClient, clubId);

  const managerAssignment = await assignClubManager(adminClient, clubId, user.id);
  if (!managerAssignment.ok) {
    // Do not roll back the club: some live schemas use a different membership
    // shape, while profile.main_club_id is enough for the current club space.
    console.error("[createClubAction] membership assignment failed", managerAssignment.errors);
  }

  redirect(`/${locale}/club/dashboard?created=1`);
}
