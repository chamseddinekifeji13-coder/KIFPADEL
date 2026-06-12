"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  adminDeleteClubAccount,
  adminDeletePlayerAccount,
  isAdminDeleteConfirmPhrase,
} from "@/modules/admin/account-deletion";
import { insertAuditRow } from "@/modules/admin/audit-log";
import { getSuperAdminActor } from "@/modules/admin/actor";

export async function adminSuspendClubAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!clubId || !reason) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  const { data: prev } = await supabase
    .from("clubs")
    .select("suspended_at,suspension_reason")
    .eq("id", clubId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("clubs")
    .update({ suspended_at: nowIso, suspension_reason: reason })
    .eq("id", clubId);

  if (error) {
    console.warn("[adminSuspendClubAction]", error.message);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "CLUB_SUSPEND",
    target_table: "clubs",
    target_id: clubId,
    metadata: {
      reason,
      previous_suspended_at: prev?.suspended_at ?? null,
      previous_suspension_reason: prev?.suspension_reason ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/clubs`);
  revalidatePath(`/${locale}/admin`);
}

export async function adminReactivateClubAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();

  if (!clubId) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  const { data: prev } = await supabase
    .from("clubs")
    .select("suspended_at,suspension_reason")
    .eq("id", clubId)
    .maybeSingle();

  const { error } = await supabase.from("clubs").update({ suspended_at: null, suspension_reason: null }).eq("id", clubId);

  if (error) {
    console.warn("[adminReactivateClubAction]", error.message);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "CLUB_REACTIVATE",
    target_table: "clubs",
    target_id: clubId,
    metadata: {
      previous_suspended_at: prev?.suspended_at ?? null,
      previous_suspension_reason: prev?.suspension_reason ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/clubs`);
  revalidatePath(`/${locale}/admin`);
}

export async function adminSuspendPlayerAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const playerId = String(formData.get("player_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!playerId || !reason) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  const { data: prev } = await supabase
    .from("profiles")
    .select("suspended_at,suspension_reason,trust_score,reliability_status")
    .eq("id", playerId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: nowIso, suspension_reason: reason })
    .eq("id", playerId);

  if (error) {
    console.warn("[adminSuspendPlayerAction]", error.message);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "PLAYER_SUSPEND",
    target_table: "profiles",
    target_id: playerId,
    metadata: {
      reason,
      previous_suspended_at: prev?.suspended_at ?? null,
      previous_suspension_reason: prev?.suspension_reason ?? null,
      trust_score_snapshot: prev?.trust_score ?? null,
      reliability_status_snapshot: prev?.reliability_status ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/players`);
  revalidatePath(`/${locale}/admin`);
}

export async function adminReactivatePlayerAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const playerId = String(formData.get("player_id") ?? "").trim();

  if (!playerId) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  const { data: prev } = await supabase
    .from("profiles")
    .select("suspended_at,suspension_reason")
    .eq("id", playerId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: null, suspension_reason: null })
    .eq("id", playerId);

  if (error) {
    console.warn("[adminReactivatePlayerAction]", error.message);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "PLAYER_REACTIVATE",
    target_table: "profiles",
    target_id: playerId,
    metadata: {
      previous_suspended_at: prev?.suspended_at ?? null,
      previous_suspension_reason: prev?.suspension_reason ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/players`);
  revalidatePath(`/${locale}/admin`);
}

export async function adminDeletePlayerAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const playerId = String(formData.get("player_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmPhrase = String(formData.get("confirm_phrase") ?? "");

  if (!playerId || !reason || !isAdminDeleteConfirmPhrase(confirmPhrase)) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  if (actor.userId === playerId) {
    console.warn("[adminDeletePlayerAction] self-delete blocked");
    return;
  }

  const { data: snapshot } = await supabase
    .from("profiles")
    .select("display_name, email, phone, global_role, trust_score")
    .eq("id", playerId)
    .maybeSingle();

  const result = await adminDeletePlayerAccount(playerId);
  if (!result.ok) {
    console.warn("[adminDeletePlayerAction]", result.code, result.error);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "PLAYER_DELETE",
    target_table: "profiles",
    target_id: playerId,
    metadata: {
      reason,
      snapshot: snapshot ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/players`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/audit-log`);
}

export async function adminDeleteClubAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr").trim() || "fr";
  const clubId = String(formData.get("club_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmPhrase = String(formData.get("confirm_phrase") ?? "");

  if (!clubId || !reason || !isAdminDeleteConfirmPhrase(confirmPhrase)) {
    return;
  }

  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) return;

  const { data: snapshot } = await supabase
    .from("clubs")
    .select("name, city, is_active, suspended_at")
    .eq("id", clubId)
    .maybeSingle();

  const result = await adminDeleteClubAccount(clubId);
  if (!result.ok) {
    console.warn("[adminDeleteClubAction]", result.code, result.error);
    return;
  }

  await insertAuditRow(supabase, {
    actor_profile_id: actor.userId,
    actor_global_role: actor.globalRole,
    action: "CLUB_DELETE",
    target_table: "clubs",
    target_id: clubId,
    metadata: {
      reason,
      snapshot: snapshot ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/clubs`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/audit-log`);
}
