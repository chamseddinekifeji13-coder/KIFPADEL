"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  optionalTrimmedString,
  parseNonNegativeInt,
} from "@/lib/utils/club-form-parse";

import type { ActionResult } from "@/modules/clubs/actions";

const STAFF_ROLES = new Set(["club_staff", "club_manager", "club_admin", "platform_admin"]);

const MEMBERSHIP_USER_COLUMNS = ["user_id", "player_id"] as const;

async function findStaffMembershipRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  clubId: string,
  userId: string,
): Promise<string | null> {
  for (const col of MEMBERSHIP_USER_COLUMNS) {
    let qb = supabase.from("club_memberships").select("role").eq("club_id", clubId);
    qb = col === "user_id" ? qb.eq("user_id", userId) : qb.eq("player_id", userId);

    const { data, error } = await qb.maybeSingle();

    if (!error && data?.role) {
      return data.role;
    }
  }
  return null;
}

export async function updateClubBasicsAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const addressRaw = String(formData.get("address") ?? "").trim();
  const address = addressRaw.length > 0 ? addressRaw : null;
  const indoorCourts = parseNonNegativeInt(formData.get("indoor_courts_count"));
  const outdoorCourts = parseNonNegativeInt(formData.get("outdoor_courts_count"));
  const contactName = optionalTrimmedString(formData.get("contact_name"));
  const contactPhone = optionalTrimmedString(formData.get("contact_phone"));
  const contactEmail = optionalTrimmedString(formData.get("contact_email"));

  if (!clubId || !name || !city) {
    return {
      ok: false,
      error: "Club, nom et ville sont obligatoires.",
    };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté pour enregistrer." };
  }

  const role = await findStaffMembershipRole(supabase, clubId, user.id);

  if (!role || !STAFF_ROLES.has(role)) {
    return { ok: false, error: "Vous n’avez pas le droit de modifier ce club." };
  }

  const { error: updateError } = await supabase
    .from("clubs")
    .update({
      name,
      city,
      address,
      indoor_courts_count: indoorCourts,
      outdoor_courts_count: outdoorCourts,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
    })
    .eq("id", clubId);

  if (updateError) {
    console.error("[updateClubBasicsAction] update failed", updateError);
    return { ok: false, error: "La mise à jour a échoué. Réessayez plus tard." };
  }

  revalidatePath(`/${locale}/club/settings`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");

  return { ok: true };
}
