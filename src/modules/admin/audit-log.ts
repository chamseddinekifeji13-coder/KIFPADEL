import type { SupabaseClient } from "@supabase/supabase-js";

/** Actions logged to `audit_log` (Super Admin V1). Extend as needed. */
export type AdminAuditAction =
  | "CLUB_SUSPEND"
  | "CLUB_REACTIVATE"
  | "PLAYER_SUSPEND"
  | "PLAYER_REACTIVATE"
  | "SPONSOR_CREATE"
  | "SPONSOR_UPDATE"
  | "SPONSOR_TOGGLE_ACTIVE"
  | "SUPER_ADMIN_GRANTED";

export type AuditLogInsertRow = {
  actor_profile_id: string | null;
  actor_global_role: string | null;
  action: AdminAuditAction | string;
  target_table?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
};

/** Persists audit row — must run under a Super Admin JWT (RLS). */
export async function insertAuditRow(
  supabase: SupabaseClient,
  row: AuditLogInsertRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("audit_log").insert({
    actor_profile_id: row.actor_profile_id,
    actor_global_role: row.actor_global_role,
    action: row.action,
    target_table: row.target_table ?? null,
    target_id: row.target_id ?? null,
    metadata: row.metadata ?? {},
  });

  if (error) {
    console.error("[insertAuditRow]", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
