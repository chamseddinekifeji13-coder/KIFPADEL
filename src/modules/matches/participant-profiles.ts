import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isActiveMatchParticipantRow,
  resolveViewerParticipationPhase,
  type MatchParticipantRow,
} from "@/domain/rules/match-participant";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export type MatchParticipantProfile = {
  playerId: string;
  team: "A" | "B";
  displayName: string;
  avatarUrl: string | null;
  participationPhase: "pending" | "confirmed";
};

function normalizeTeam(team: string): "A" | "B" | null {
  return team === "A" || team === "B" ? team : null;
}

function mapParticipantRow(
  participant: MatchParticipantRow & {
    profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
  },
): MatchParticipantProfile | null {
  if (!isActiveMatchParticipantRow(participant)) return null;

  const team = normalizeTeam(participant.team);
  if (!team) return null;

  const phase = resolveViewerParticipationPhase(participant);

  return {
    playerId: String(participant.player_id),
    team,
    displayName: participant.profiles?.display_name?.trim() || "Joueur",
    avatarUrl: participant.profiles?.avatar_url ?? null,
    participationPhase: phase === "confirmed" ? "confirmed" : "pending",
  };
}

export async function fetchMatchParticipantProfiles(
  matchId: string,
): Promise<MatchParticipantProfile[]> {
  const select =
    "player_id, team, status, payment_method, profiles:player_id(display_name, avatar_url)";

  try {
    let data: unknown[] | null = null;

    try {
      const admin = createSupabaseAdminClient();
      const result = await admin.from("match_participants").select(select).eq("match_id", matchId);
      if (!result.error) {
        data = result.data;
      }
    } catch {
      // Service role indisponible en local : repli sur le client utilisateur.
    }

    if (!data) {
      const supabase = await createSupabaseServerClient();
      const result = await supabase.from("match_participants").select(select).eq("match_id", matchId);

      if (result.error) {
        console.warn("[matches.fetchMatchParticipantProfiles]", result.error.message);
        return [];
      }

      data = result.data;
    }

    const profiles: MatchParticipantProfile[] = [];

    for (const row of data ?? []) {
      const mapped = mapParticipantRow(
        row as MatchParticipantRow & {
          profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
        },
      );
      if (mapped) profiles.push(mapped);
    }

    return profiles;
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}
