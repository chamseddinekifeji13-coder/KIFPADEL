"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { getSuperAdminActor } from "@/modules/admin/actor";
import type { TournamentScope } from "@/domain/types/tournaments";

export type PlatformTournamentActionResult =
  | { ok: true; tournamentId: string }
  | { ok: false; error: string };

export async function createPlatformTournamentAction(input: {
  locale: string;
  title: string;
  hostClubId: string;
  tournamentScope: Extract<TournamentScope, "interclub" | "inter_region" | "platform">;
  description?: string | null;
  regionsDisplay?: string | null;
  startsAtIso?: string | null;
  endsAtIso?: string | null;
  entryFeeCents?: number | null;
  initialStatus: "draft" | "registration_open";
}): Promise<PlatformTournamentActionResult> {
  const loc = input.locale?.trim() || "fr";
  const supabase = await createSupabaseServerActionClient();
  const actor = await getSuperAdminActor(supabase);
  if (!actor) {
    return { ok: false, error: "Accès super admin requis." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const title = input.title?.trim();
  const hostClubId = input.hostClubId?.trim();

  if (!title) return { ok: false, error: "Titre requis." };
  if (!hostClubId) return { ok: false, error: "Club hôte requis (terrains & matchs)." };

  const regionsLabel = input.regionsDisplay?.trim();
  const scope_metadata =
    regionsLabel && regionsLabel.length > 0
      ? { regions_display: regionsLabel }
      : {};

  const { data: row, error } = await supabase
    .from("tournaments")
    .insert({
      club_id: hostClubId,
      created_by: user.id,
      title,
      description: input.description?.trim() || null,
      starts_at: input.startsAtIso || null,
      ends_at: input.endsAtIso || null,
      entry_fee_cents: input.entryFeeCents ?? null,
      status: input.initialStatus,
      tournament_scope: input.tournamentScope,
      scope_metadata,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  const tournamentId = String((row as { id: string }).id);
  revalidatePath(`/${loc}/admin/tournaments`);
  revalidatePath(`/${loc}/tournaments`);
  revalidatePath(`/${loc}/tournaments/${tournamentId}`);
  revalidatePath(`/${loc}/club/tournaments`);
  revalidatePath(`/${loc}/club/tournaments/${tournamentId}`);
  return { ok: true, tournamentId };
}
