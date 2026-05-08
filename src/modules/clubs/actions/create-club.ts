"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  optionalTrimmedString,
  parseNonNegativeInt,
} from "@/lib/utils/club-form-parse";

const MEMBERSHIP_USER_COLUMNS = ["player_id", "user_id"] as const;
const MANAGER_ROLES = ["club_manager", "club_admin"] as const;

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type MembershipPayload = Record<string, string | boolean>;

function buildMembershipPayloads(
  clubId: string,
  userId: string,
  role: (typeof MANAGER_ROLES)[number],
) {
  // Après migration 20260507140000 : `player_id` a souvent été renommé en `user_id` — tester `user_id` en premier.
  return [
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

async function setPrimaryClubIfEmpty(
  adminClient: SupabaseAdminClient,
  userId: string,
  clubId: string,
) {
  const { error } = await adminClient
    .from("profiles")
    .update({ main_club_id: clubId })
    .eq("id", userId)
    .is("main_club_id", null);

  if (error) {
    console.warn("[createClubAction] main_club_id optional update skipped", error.message);
  }
}

function isLikelyMissingColumnClubError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; code?: string };
  const msg = String(e.message ?? "").toLowerCase();
  const code = String(e.code ?? "");
  if (code === "42703") return true;
  if (msg.includes("does not exist")) return true;
  if (msg.includes("schema cache")) return true;
  return false;
}

/**
 * Insère un club : payload complet puis repli minimal (name, city, is_active) si des colonnes
 * étendues ne sont pas encore migrées sur l’instance Supabase.
 */
async function insertClubWithFallback(
  adminClient: SupabaseAdminClient,
  payload: Record<string, unknown>,
): Promise<{ clubId: string | null; error: unknown }> {
  const { data, error } = await adminClient.from("clubs").insert(payload).select("id").single();

  if (!error && data?.id) {
    return { clubId: String(data.id), error: null };
  }

  console.warn("[createClubAction] full club insert failed:", error);

  if (!isLikelyMissingColumnClubError(error)) {
    return { clubId: null, error };
  }

  const minimal = {
    name: payload.name as string,
    city: payload.city as string,
    is_active: (payload.is_active as boolean) ?? true,
  };

  const { data: row, error: minimalError } = await adminClient
    .from("clubs")
    .insert(minimal)
    .select("id")
    .single();

  if (minimalError || !row?.id) {
    console.error("[createClubAction] minimal club insert failed:", minimalError);
    return { clubId: null, error: minimalError ?? error };
  }

  const clubId = String(row.id);
  const extras: Record<string, unknown> = { ...payload };
  delete extras.name;
  delete extras.city;
  delete extras.is_active;

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extras)) {
    if (v !== undefined) patch[k] = v;
  }

  if (Object.keys(patch).length > 0) {
    const { error: patchError } = await adminClient.from("clubs").update(patch).eq("id", clubId);
    if (patchError) {
      console.warn("[createClubAction] club extended columns not applied:", patchError.message);
    }
  }

  return { clubId, error: null };
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
  const addressRaw = String(formData.get("address") ?? "").trim();
  const address = addressRaw.length > 0 ? addressRaw : null;
  const indoorCourts = parseNonNegativeInt(formData.get("indoor_courts_count"));
  const outdoorCourts = parseNonNegativeInt(formData.get("outdoor_courts_count"));
  const contactName = optionalTrimmedString(formData.get("contact_name"));
  const contactPhone = optionalTrimmedString(formData.get("contact_phone"));
  const contactEmail = optionalTrimmedString(formData.get("contact_email"));

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

  const clubPayload: Record<string, unknown> = {
    name,
    city,
    is_active: true,
    indoor_courts_count: indoorCourts,
    outdoor_courts_count: outdoorCourts,
  };
  if (address) clubPayload.address = address;
  if (contactName) clubPayload.contact_name = contactName;
  if (contactPhone) clubPayload.contact_phone = contactPhone;
  if (contactEmail) clubPayload.contact_email = contactEmail;

  const { clubId, error: clubError } = await insertClubWithFallback(adminClient, clubPayload);

  if (!clubId) {
    console.error("[createClubAction] club creation failed", clubError);
    redirect(`/${locale}/clubs/new?error=create_failed`);
  }

  const managerAssignment = await assignClubManager(adminClient, clubId, user.id);
  if (!managerAssignment.ok) {
    console.error("[createClubAction] membership assignment failed", managerAssignment.errors);
    await adminClient.from("clubs").delete().eq("id", clubId);
    redirect(`/${locale}/clubs/new?error=membership_failed`);
  }

  await setPrimaryClubIfEmpty(adminClient, user.id, clubId);
  await ensureDefaultCourt(adminClient, clubId);

  redirect(`/${locale}/club/dashboard?created=1`);
}
