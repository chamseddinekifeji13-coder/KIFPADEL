"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { parsePositiveMoneyOrNull } from "@/lib/utils/club-form-parse";
import type { ActionResult } from "@/modules/clubs/actions";
import {
  assertClubStaffCanManage,
  clubStaffForbiddenMessage,
} from "@/modules/clubs/actions/club-staff-guard";

function t(
  locale: string,
  key: "auth" | "invalid" | "price" | "notFound" | "fail",
): string {
  const en = locale === "en";
  switch (key) {
    case "auth":
      return en ? "You must be signed in to save." : "Vous devez être connecté pour enregistrer.";
    case "invalid":
      return en ? "Invalid request." : "Requête invalide.";
    case "price":
      return en ? "Enter a valid price in DT (e.g. 40)." : "Indiquez un prix valide en DT (ex. 40).";
    case "notFound":
      return en ? "Court not found for this club." : "Terrain introuvable pour ce club.";
    case "fail":
    default:
      return en ? "Update failed. Try again later." : "La mise à jour a échoué. Réessayez plus tard.";
  }
}

export async function updateCourtPriceAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const courtId = String(formData.get("court_id") ?? "").trim();
  const priceParsed = parsePositiveMoneyOrNull(formData.get("price_per_slot"));

  if (!clubId || !courtId) {
    return { ok: false, error: t(locale, "invalid") };
  }

  if (priceParsed == null) {
    return { ok: false, error: t(locale, "price") };
  }

  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: t(locale, "auth") };
  }

  const guard = await assertClubStaffCanManage(supabase, clubId, user.id);
  if (!guard.ok) {
    return { ok: false, error: clubStaffForbiddenMessage(locale) };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: courtRow, error: courtSelErr } = await adminClient
    .from("courts")
    .select("id,club_id")
    .eq("id", courtId)
    .maybeSingle();

  const rowClub = courtRow?.club_id as string | undefined;
  if (courtSelErr || !rowClub || rowClub !== clubId) {
    return { ok: false, error: t(locale, "notFound") };
  }

  const { error: updateErr } = await adminClient
    .from("courts")
    .update({ price_per_slot: priceParsed })
    .eq("id", courtId)
    .eq("club_id", clubId);

  if (updateErr) {
    console.error("[updateCourtPriceAction]", updateErr);
    return { ok: false, error: t(locale, "fail") };
  }

  revalidatePath(`/${locale}/club/courts`, "page");
  revalidatePath(`/${locale}/club/slots`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");

  return { ok: true };
}
