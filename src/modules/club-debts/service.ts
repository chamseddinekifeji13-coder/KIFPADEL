import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateClubDebtInput = {
  clubId: string;
  playerId: string;
  bookingId: string;
  reason: string;
  amountCents: number;
  currency?: string;
};

/**
 * Persists a financial obligation row for a player toward a club.
 * Intended to be called from server actions where staff RLS allows inserts on `club_debts`.
 *
 * TODO(kif-debt): Replace `deriveNoShowDebtAmountCents` heuristics with club settings
 * (e.g. persisted `noShowPenaltyPoints` / fee schedule on `public.clubs`).
 */
export async function createClubDebt(
  supabase: SupabaseClient,
  input: CreateClubDebtInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const currency = input.currency ?? "TND";

  const { data: existing } = await supabase
    .from("club_debts")
    .select("id")
    .eq("booking_id", input.bookingId)
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

/**
 * Derives the recorded debt amount for a no-show from the booking price when available.
 * `bookings.total_price` is assumed to be in major currency units (e.g. TND).
 * Stored integer follows the `amount_cents` column name in DB (may later mean millimes / minor units).
 */
export function deriveNoShowDebtAmountCents(totalPrice: unknown): number {
  const n = Number(totalPrice);
  if (Number.isFinite(n) && n > 0) {
    return Math.round(n * 100);
  }
  /** Fallback until club-level penalties are persisted — see TODO above. */
  return 5_000;
}
