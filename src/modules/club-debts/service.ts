import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateClubDebtInput = {
  clubId: string;
  playerId: string;
  bookingId: string;
  reason: string;
  amountCents: number;
  currency?: string;
  participantId?: string | null;
};

/**
 * Persists a financial obligation row for a player toward a club.
 */
export async function createClubDebt(
  supabase: SupabaseClient,
  input: CreateClubDebtInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const currency = input.currency ?? "TND";

  if (input.participantId) {
    const { data: existingByParticipant } = await supabase
      .from("club_debts")
      .select("id")
      .eq("participant_id", input.participantId)
      .eq("reason", input.reason)
      .maybeSingle();

    if (existingByParticipant?.id) {
      return { ok: true, id: String(existingByParticipant.id) };
    }
  }

  const { data: existing } = await supabase
    .from("club_debts")
    .select("id")
    .eq("booking_id", input.bookingId)
    .eq("player_id", input.playerId)
    .eq("reason", input.reason)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, id: String(existing.id) };
  }

  const { data: inserted, error } = await supabase
    .from("club_debts")
    .insert({
      club_id: input.clubId,
      player_id: input.playerId,
      booking_id: input.bookingId,
      participant_id: input.participantId ?? null,
      reason: input.reason,
      amount_cents: input.amountCents,
      currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: String((inserted as { id: string }).id) };
}

export function deriveNoShowDebtAmountCents(sharePrice: unknown): number {
  const n = Number(sharePrice);
  if (Number.isFinite(n) && n > 0) {
    return Math.round(n * 100);
  }
  return 5_000;
}
