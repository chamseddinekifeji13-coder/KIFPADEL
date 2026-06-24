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

type ParticipantProfileSourceRow = MatchParticipantRow & {
  profileDisplayName?: string | null;
  profileAvatarUrl?: string | null;
};

function mapParticipantRow(
  participant: ParticipantProfileSourceRow,
): MatchParticipantProfile | null {
  if (!isActiveMatchParticipantRow(participant)) return null;

  const team = normalizeTeam(participant.team);
  if (!team) return null;

  const phase = resolveViewerParticipationPhase(participant);

  return {
    playerId: String(participant.player_id),
    team,
    displayName: participant.profileDisplayName?.trim() || "Joueur",
    avatarUrl: participant.profileAvatarUrl ?? null,
    participationPhase: phase === "confirmed" ? "confirmed" : "pending",
  };
}

export async function fetchMatchParticipantProfiles(
  matchId: string,
): Promise<MatchParticipantProfile[]> {
  try {
    let participants: MatchParticipantRow[] | null = null;

    try {
      const admin = createSupabaseAdminClient();
      const result = await admin
        .from("match_participants")
        .select("player_id, team, status, payment_method")
        .eq("match_id", matchId);
      if (!result.error) {
        participants = (result.data ?? []) as MatchParticipantRow[];
      }
    } catch {
      // Service role indisponible en local : repli sur le client utilisateur.
    }

    if (!participants) {
      const supabase = await createSupabaseServerClient();
      const result = await supabase
        .from("match_participants")
        .select("player_id, team, status, payment_method")
        .eq("match_id", matchId);

      if (result.error) {
        console.warn("[matches.fetchMatchParticipantProfiles]", result.error.message);
        return [];
      }

      participants = (result.data ?? []) as MatchParticipantRow[];
    }

    if (!participants || participants.length === 0) {
      return [];
    }

    const playerIds = [...new Set(participants.map((p) => String(p.player_id)).filter(Boolean))];
    const profileById = new Map<string, { displayName: string | null; avatarUrl: string | null }>();

    if (playerIds.length > 0) {
      let profileRows:
        | Array<{ id: string; display_name?: string | null; avatar_url?: string | null }>
        | null = null;

      try {
        const admin = createSupabaseAdminClient();
        const result = await admin
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", playerIds);
        if (!result.error) {
          profileRows = (result.data ?? []) as Array<{
            id: string;
            display_name?: string | null;
            avatar_url?: string | null;
          }>;
        }
      } catch {
        // repli user client ci-dessous
      }

      if (!profileRows) {
        const supabase = await createSupabaseServerClient();
        const result = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", playerIds);
        if (!result.error) {
          profileRows = (result.data ?? []) as Array<{
            id: string;
            display_name?: string | null;
            avatar_url?: string | null;
          }>;
        }
      }

      for (const row of profileRows ?? []) {
        profileById.set(String(row.id), {
          displayName: row.display_name ?? null,
          avatarUrl: row.avatar_url ?? null,
        });
      }
    }

    const profiles: MatchParticipantProfile[] = [];

    for (const row of participants) {
      const profile = profileById.get(String(row.player_id));
      const mapped = mapParticipantRow({
        ...row,
        profileDisplayName: profile?.displayName ?? null,
        profileAvatarUrl: profile?.avatarUrl ?? null,
      });
      if (mapped) profiles.push(mapped);
    }

    return profiles;
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}
