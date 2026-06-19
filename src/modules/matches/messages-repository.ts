import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";

export type MatchMessage = {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export async function fetchMatchMessages(matchId: string, limit = 80): Promise<MatchMessage[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("match_messages")
      .select("id, match_id, sender_id, body, created_at, profiles:sender_id(display_name)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.warn("[matches.fetchMatchMessages]", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const profile = (row as { profiles?: { display_name?: string | null } | null }).profiles;
      return {
        id: String((row as { id: string }).id),
        matchId: String((row as { match_id: string }).match_id),
        senderId: String((row as { sender_id: string }).sender_id),
        senderName: profile?.display_name?.trim() || "Joueur",
        body: String((row as { body: string }).body),
        createdAt: String((row as { created_at: string }).created_at),
      };
    });
  } catch (err) {
    rethrowFrameworkError(err);
    return [];
  }
}

export async function canUserAccessMatchChat(matchId: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("can_access_match_chat", {
      p_match_id: matchId,
    });

    if (error) {
      console.warn("[matches.canUserAccessMatchChat]", error.message);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    rethrowFrameworkError(err);
    return false;
  }
}

/** Noms affichés des joueurs du match (pour le chat temps réel). */
export async function fetchMatchParticipantNames(
  matchId: string,
  creatorId: string | null | undefined,
): Promise<Record<string, string>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: participants, error } = await supabase
      .from("match_participants")
      .select("player_id, profiles:player_id(display_name)")
      .eq("match_id", matchId);

    if (error) {
      console.warn("[matches.fetchMatchParticipantNames]", error.message);
      return {};
    }

    const names: Record<string, string> = {};
    for (const row of participants ?? []) {
      const playerId = String((row as { player_id: string }).player_id);
      const profile = (row as { profiles?: { display_name?: string | null } | null }).profiles;
      names[playerId] = profile?.display_name?.trim() || "Joueur";
    }

    if (creatorId && !names[creatorId]) {
      const { data: creator } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", creatorId)
        .maybeSingle();
      names[creatorId] = (creator as { display_name?: string | null } | null)?.display_name?.trim() || "Organisateur";
    }

    return names;
  } catch (err) {
    rethrowFrameworkError(err);
    return {};
  }
}
