"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import type { ActionResult } from "@/modules/clubs/actions";

const STAFF_ROLES = new Set(["club_staff", "club_manager", "club_admin", "platform_admin"]);

const MEMBERSHIP_USER_COLUMNS = ["user_id", "player_id"] as const;

const MAX_LABEL_LEN = 120;

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

function t(locale: string, key: "auth" | "forbidden" | "invalid" | "empty" | "long" | "fail" | "notFound"): string {
  const en = locale === "en";
  switch (key) {
    case "auth":
      return en ? "You must be signed in to save." : "Vous devez être connecté pour enregistrer.";
    case "forbidden":
      return en ? "You are not allowed to edit courts for this club." : "Vous n’avez pas le droit de modifier les terrains de ce club.";
    case "invalid":
      return en ? "Invalid request." : "Requête invalide.";
    case "empty":
      return en ? "Enter a court name or number." : "Indiquez un nom ou un numéro de terrain.";
    case "long":
      return en ? `Use at most ${MAX_LABEL_LEN} characters.` : `Utilisez au plus ${MAX_LABEL_LEN} caractères.`;
    case "notFound":
      return en ? "Court not found for this club." : "Terrain introuvable pour ce club.";
    case "fail":
    default:
      return en ? "Update failed. Try again later." : "La mise à jour a échoué. Réessayez plus tard.";
  }
}

export async function updateCourtLabelAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const courtId = String(formData.get("court_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!clubId || !courtId) {
    return { ok: false, error: t(locale, "invalid") };
  }
  if (!label.length) {
    return { ok: false, error: t(locale, "empty") };
  }
  if (label.length > MAX_LABEL_LEN) {
    return { ok: false, error: t(locale, "long") };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t(locale, "auth") };
  }

  const role = await findStaffMembershipRole(supabase, clubId, user.id);
  if (!role || !STAFF_ROLES.has(role)) {
    return { ok: false, error: t(locale, "forbidden") };
  }

  const { data: courtRow, error: courtSelErr } = await supabase
    .from("courts")
    .select("id,club_id")
    .eq("id", courtId)
    .maybeSingle();

  const rowClub = courtRow?.club_id as string | undefined;
  if (courtSelErr || !rowClub || rowClub !== clubId) {
    return { ok: false, error: t(locale, "notFound") };
  }

  const { error: updateErr } = await supabase.from("courts").update({ label }).eq("id", courtId).eq("club_id", clubId);

  if (updateErr) {
    console.error("[updateCourtLabelAction]", updateErr);
    return { ok: false, error: t(locale, "fail") };
  }

  revalidatePath(`/${locale}/club/courts`, "page");
  revalidatePath(`/${locale}/club/slots`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");

  return { ok: true };
}
