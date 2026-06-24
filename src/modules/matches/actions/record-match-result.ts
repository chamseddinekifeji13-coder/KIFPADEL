"use server";

import type { SetScore } from "@/domain/rules/match-score";
import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  recordMatchResult,
  type RecordMatchResultOutcome,
} from "@/modules/matches/record-match-result-service";

export type { RecordMatchResultOutcome };

export type RecordMatchResultInput = {
  locale: string;
  matchId: string;
  sets: SetScore[];
  tournamentId?: string;
};

export async function recordMatchResultAction(
  input: RecordMatchResultInput,
): Promise<RecordMatchResultOutcome> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  return recordMatchResult(supabase, user.id, input);
}
