import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONFIRM_PHRASE = "SUPPRIMER";

export function isAdminDeleteConfirmPhrase(value: string): boolean {
  return value.trim().toUpperCase() === CONFIRM_PHRASE;
}

export const ADMIN_DELETE_CONFIRM_PHRASE = CONFIRM_PHRASE;

type DeleteResult = { ok: true } | { ok: false; error: string; code: string };

/** Supprime un joueur (auth + profil en cascade) après nettoyage des FK restrict. */
export async function adminDeletePlayerAccount(playerId: string): Promise<DeleteResult> {
  const admin = createSupabaseAdminClient();

  const { data: profile, error: readErr } = await admin
    .from("profiles")
    .select("id, display_name, email, global_role")
    .eq("id", playerId)
    .maybeSingle();

  if (readErr) {
    return { ok: false, error: readErr.message, code: "READ_FAILED" };
  }
  if (!profile?.id) {
    return { ok: false, error: "Profil introuvable.", code: "NOT_FOUND" };
  }

  const globalRole = String(profile.global_role ?? "").toLowerCase();
  if (globalRole === "super_admin") {
    return {
      ok: false,
      error: "Impossible de supprimer un compte super_admin.",
      code: "SUPER_ADMIN_PROTECTED",
    };
  }

  const { error: tournamentErr } = await admin.from("tournaments").delete().eq("created_by", playerId);
  if (tournamentErr) {
    console.error("[adminDeletePlayerAccount] tournaments", tournamentErr.message);
    return {
      ok: false,
      error: "Échec suppression des tournois liés au joueur.",
      code: "TOURNAMENT_DELETE_FAILED",
    };
  }

  const { error: deleteUserErr } = await admin.auth.admin.deleteUser(playerId);
  if (deleteUserErr) {
    console.error("[adminDeletePlayerAccount] auth", deleteUserErr.message);
    return {
      ok: false,
      error: deleteUserErr.message || "Échec suppression auth.users.",
      code: "AUTH_DELETE_FAILED",
    };
  }

  return { ok: true };
}

/** Supprime un club et ses données (courts, réservations, memberships…) après tournois. */
export async function adminDeleteClubAccount(clubId: string): Promise<DeleteResult> {
  const admin = createSupabaseAdminClient();

  const { data: club, error: readErr } = await admin
    .from("clubs")
    .select("id, name, city")
    .eq("id", clubId)
    .maybeSingle();

  if (readErr) {
    return { ok: false, error: readErr.message, code: "READ_FAILED" };
  }
  if (!club?.id) {
    return { ok: false, error: "Club introuvable.", code: "NOT_FOUND" };
  }

  const { error: tournamentErr } = await admin.from("tournaments").delete().eq("club_id", clubId);
  if (tournamentErr) {
    console.error("[adminDeleteClubAccount] tournaments", tournamentErr.message);
    return {
      ok: false,
      error: "Échec suppression des tournois du club.",
      code: "TOURNAMENT_DELETE_FAILED",
    };
  }

  const { error: clubErr } = await admin.from("clubs").delete().eq("id", clubId);
  if (clubErr) {
    console.error("[adminDeleteClubAccount] club", clubErr.message);
    return {
      ok: false,
      error: clubErr.message || "Échec suppression du club.",
      code: "CLUB_DELETE_FAILED",
    };
  }

  return { ok: true };
}
