"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  optionalTrimmedString,
  parseNonNegativeInt,
} from "@/lib/utils/club-form-parse";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function assignClubManager(
  adminClient: SupabaseAdminClient,
  clubId: string,
  userId: string,
) {
  const errors: unknown[] = [];
  const role = "club_admin" as const;

  const payload = {
    club_id: clubId,
    user_id: userId,
    role,
    is_primary: true as const,
  };

  const { error: membershipInsertError } = await adminClient.from("club_memberships").insert(payload);

  if (!membershipInsertError) {
    return { ok: true, role } as const;
  }

  errors.push({ role, step: "insert", error: membershipInsertError });

  const { data: existingMembership, error: membershipReadError } = await adminClient
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipReadError) {
    errors.push({ role, step: "read_existing", error: membershipReadError });
    return { ok: false, errors } as const;
  }

  if (!existingMembership?.id) {
    return { ok: false, errors } as const;
  }

  const { error: membershipUpdateError } = await adminClient
    .from("club_memberships")
    .update({ role, is_primary: true })
    .eq("id", existingMembership.id);

  if (!membershipUpdateError) {
    return { ok: true, role } as const;
  }

  errors.push({ role, step: "update_existing", error: membershipUpdateError });
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

function slugifyClubName(name: string): string {
  const asciiish = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const dashed = asciiish.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return dashed.length > 0 ? dashed : "club";
}

function isSlugUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  if (String(e.code ?? "") !== "23505") return false;
  const combined = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  return combined.includes("slug");
}

async function insertClubRowWithSlugRetries(
  adminClient: SupabaseAdminClient,
  payload: Record<string, unknown>,
): Promise<{ clubId: string | null; error: unknown }> {
  const baseSlug = slugifyClubName(String(payload.name ?? ""));
  const slugVariants = [baseSlug, `${baseSlug}-2`, `${baseSlug}-3`, `${baseSlug}-4`];
  let lastSlugUniqueError: unknown = null;

  for (const slug of slugVariants) {
    const { data, error } = await adminClient
      .from("clubs")
      .insert({ ...payload, slug })
      .select("id")
      .single();

    if (!error && data?.id) {
      return { clubId: String(data.id), error: null };
    }

    if (error && isSlugUniqueViolation(error)) {
      lastSlugUniqueError = error;
      console.warn("[createClubAction] club slug unique violation, retrying another slug", slug);
      continue;
    }

    return { clubId: null, error };
  }

  return { clubId: null, error: lastSlugUniqueError };
}

/**
 * Insère un club : payload complet puis repli minimal (name, city, is_active) si des colonnes
 * étendues ne sont pas encore migrées sur l’instance Supabase.
 */
async function insertClubWithFallback(
  adminClient: SupabaseAdminClient,
  payload: Record<string, unknown>,
): Promise<{ clubId: string | null; error: unknown }> {
  const fullResult = await insertClubRowWithSlugRetries(adminClient, payload);

  if (fullResult.clubId) {
    return { clubId: fullResult.clubId, error: null };
  }

  const error = fullResult.error;
  console.warn("[createClubAction] full club insert failed:", error);

  if (!isLikelyMissingColumnClubError(error)) {
    return { clubId: null, error };
  }

  const minimal = {
    name: payload.name as string,
    city: payload.city as string,
    is_active: (payload.is_active as boolean) ?? true,
  };

  const minimalResult = await insertClubRowWithSlugRetries(adminClient, minimal);

  if (!minimalResult.clubId) {
    console.error("[createClubAction] minimal club insert failed:", minimalResult.error);
    return { clubId: null, error: minimalResult.error ?? error };
  }

  const clubId = minimalResult.clubId;
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

async function provisionCourtsFromCounts(
  adminClient: SupabaseAdminClient,
  clubId: string,
  indoorCourts: number,
  outdoorCourts: number,
) {
  const total = indoorCourts + outdoorCourts;
  if (total <= 0) {
    return;
  }

  const { data: existingCourts, error: existingCourtsError } = await adminClient
    .from("courts")
    .select("id")
    .eq("club_id", clubId)
    .limit(1);

  if (existingCourtsError) {
    console.warn("[createClubAction] court provisioning lookup failed", existingCourtsError.message);
    return;
  }

  if ((existingCourts ?? []).length > 0) {
    return;
  }

  const rows: Array<{ club_id: string; label: string; surface: string; is_indoor: boolean }> = [];
  let labelSeq = 1;
  for (let i = 0; i < indoorCourts; i++) {
    rows.push({
      club_id: clubId,
      label: `Terrain ${labelSeq}`,
      surface: "standard",
      is_indoor: true,
    });
    labelSeq += 1;
  }
  for (let i = 0; i < outdoorCourts; i++) {
    rows.push({
      club_id: clubId,
      label: `Terrain ${labelSeq}`,
      surface: "standard",
      is_indoor: false,
    });
    labelSeq += 1;
  }

  const { error: bulkError } = await adminClient.from("courts").insert(rows);

  if (bulkError) {
    console.warn("[createClubAction] bulk court provisioning failed", bulkError.message);
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
  const totalCourtsDesired = indoorCourts + outdoorCourts;
  if (totalCourtsDesired > 0) {
    await provisionCourtsFromCounts(adminClient, clubId, indoorCourts, outdoorCourts);
  } else {
    await ensureDefaultCourt(adminClient, clubId);
  }

  redirect(`/${locale}/club/dashboard?created=1`);
}
