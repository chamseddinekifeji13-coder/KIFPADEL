"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { getSuperAdminActor } from "@/modules/admin/actor";
import { insertAuditRow } from "@/modules/admin/audit-log";
import { insertSponsorRow, updateSponsorPatch } from "@/modules/sponsors/repository";

function parseOptionalUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t.length) return null;
  return t;
}

export async function adminCreateSponsorAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const name = String(formData.get("name") ?? "").trim();
  const logo_url = parseOptionalUrl(String(formData.get("logo_url") ?? ""));
  const website_url = parseOptionalUrl(String(formData.get("website_url") ?? ""));
  const positionRaw = Number(String(formData.get("position") ?? "0"));

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  if (!name) return;

  const position = Number.isFinite(positionRaw) ? Math.floor(positionRaw) : 0;

  try {
    const id = await insertSponsorRow(supabase, {
      name,
      logo_url,
      website_url,
      position,
      is_active: true,
    });

    await insertAuditRow(supabase, {
      actor_profile_id: actor.userId,
      actor_global_role: actor.globalRole,
      action: "SPONSOR_CREATE",
      target_table: "sponsors",
      target_id: id,
      metadata: { name, position, logo_url, website_url },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec.";
    console.warn("[adminCreateSponsorAction]", msg);
    return;
  }

  revalidatePath(`/${locale}/admin/sponsors`);
}

export async function adminUpdateSponsorAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const logo_url = parseOptionalUrl(String(formData.get("logo_url") ?? ""));
  const website_url = parseOptionalUrl(String(formData.get("website_url") ?? ""));
  const positionRaw = Number(String(formData.get("position") ?? "0"));

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  if (!id || !name) return;

  const position = Number.isFinite(positionRaw) ? Math.floor(positionRaw) : 0;

  try {
    await updateSponsorPatch(supabase, {
      id,
      name,
      logo_url,
      website_url,
      position,
    });

    await insertAuditRow(supabase, {
      actor_profile_id: actor.userId,
      actor_global_role: actor.globalRole,
      action: "SPONSOR_UPDATE",
      target_table: "sponsors",
      target_id: id,
      metadata: { name, position, logo_url, website_url },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec.";
    console.warn("[adminUpdateSponsorAction]", msg);
    return;
  }

  revalidatePath(`/${locale}/admin/sponsors`);
}

export async function adminToggleSponsorActiveAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const id = String(formData.get("id") ?? "").trim();
  const activeRaw = String(formData.get("is_active") ?? "").trim();

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  if (!id) return;

  const is_active = activeRaw === "true" || activeRaw === "1";

  try {
    await updateSponsorPatch(supabase, { id, is_active });

    await insertAuditRow(supabase, {
      actor_profile_id: actor.userId,
      actor_global_role: actor.globalRole,
      action: "SPONSOR_TOGGLE_ACTIVE",
      target_table: "sponsors",
      target_id: id,
      metadata: { is_active },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec.";
    console.warn("[adminToggleSponsorActiveAction]", msg);
    return;
  }

  revalidatePath(`/${locale}/admin/sponsors`);
}
