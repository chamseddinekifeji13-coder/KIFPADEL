"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import type { ActionResult } from "@/modules/clubs/actions";
import {
  assertClubStaffCanManage,
  clubStaffForbiddenMessage,
} from "@/modules/clubs/actions/club-staff-guard";

function t(locale: string, key: "auth" | "invalid" | "fail"): string {
  const en = locale === "en";
  switch (key) {
    case "auth":
      return en ? "You must be signed in." : "Vous devez être connecté.";
    case "invalid":
      return en ? "Invalid request." : "Requête invalide.";
    case "fail":
    default:
      return en ? "Could not add the court. Try again later." : "Impossible d’ajouter le terrain. Réessayez plus tard.";
  }
}

export async function createCourtAction(formData: FormData): Promise<ActionResult> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();

  if (!clubId) {
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
  const { count, error: countError } = await adminClient
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (countError) {
    console.error("[createCourtAction] count failed", countError);
    return { ok: false, error: t(locale, "fail") };
  }

  const nextIndex = (count ?? 0) + 1;
  const { error: insertError } = await adminClient.from("courts").insert({
    club_id: clubId,
    label: `Terrain ${nextIndex}`,
    surface: "standard",
    is_indoor: false,
    is_active: true,
  });

  if (insertError) {
    console.error("[createCourtAction] insert failed", insertError);
    return { ok: false, error: t(locale, "fail") };
  }

  revalidatePath(`/${locale}/club/courts`, "page");
  revalidatePath(`/${locale}/club/slots`, "page");
  revalidatePath(`/${locale}/club/dashboard`, "page");

  return { ok: true };
}
