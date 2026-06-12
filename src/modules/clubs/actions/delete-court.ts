"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import type { ActionResult } from "@/modules/clubs/actions";
import {
  assertClubStaffCanManage,
  clubStaffForbiddenMessage,
} from "@/modules/clubs/actions/club-staff-guard";

function t(
  locale: string,
  key: "auth" | "invalid" | "notFound" | "lastCourt" | "hasBookings" | "fail",
): string {
  const en = locale === "en";
  switch (key) {
    case "auth":
      return en ? "You must be signed in." : "Vous devez être connecté.";
    case "invalid":
      return en ? "Invalid request." : "Requête invalide.";
    case "notFound":
      return en ? "Court not found for this club." : "Terrain introuvable pour ce club.";
    case "lastCourt":
      return en
        ? "You must keep at least one court for bookings."
        : "Il faut au moins un terrain pour les réservations.";
    case "hasBookings":
      return en
        ? "This court has upcoming bookings. Cancel them first."
        : "Ce terrain a des réservations à venir. Annulez-les avant suppression.";
    case "fail":
    default:
      return en ? "Could not delete the court. Try again later." : "Impossible de supprimer le terrain. Réessayez plus tard.";
  }
}

export async function deleteCourtAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const courtId = String(formData.get("court_id") ?? "").trim();

  if (!clubId || !courtId) {
    return { ok: false, error: t(locale, "invalid") };
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

  const { count: courtCount, error: countError } = await adminClient
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (countError) {
    console.error("[deleteCourtAction] count failed", countError);
    return { ok: false, error: t(locale, "fail") };
  }

  if ((courtCount ?? 0) <= 1) {
    return { ok: false, error: t(locale, "lastCourt") };
  }

  const nowIso = new Date().toISOString();
  const { count: upcomingCount, error: bookingError } = await adminClient
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("court_id", courtId)
    .gte("ends_at", nowIso)
    .neq("status", "cancelled");

  if (bookingError) {
    console.error("[deleteCourtAction] bookings lookup failed", bookingError);
    return { ok: false, error: t(locale, "fail") };
  }

  if ((upcomingCount ?? 0) > 0) {
    return { ok: false, error: t(locale, "hasBookings") };
  }

  const { error: deleteError } = await adminClient.from("courts").delete().eq("id", courtId).eq("club_id", clubId);

  if (deleteError) {
    console.error("[deleteCourtAction] delete failed", deleteError);
    return { ok: false, error: t(locale, "fail") };
  }

  revalidatePath(`/${locale}/club/courts`, "page");
  revalidatePath(`/${locale}/club/slots`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");

  return { ok: true };
}
