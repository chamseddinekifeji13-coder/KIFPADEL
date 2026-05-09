"use server";

import { createClient } from "@/lib/supabase/server";
import { trustImpactFromEvent } from "@/domain/rules/trust";
import { addTrustEvent } from "@/modules/players/repository";
import { createClubDebt, deriveNoShowDebtAmountCents } from "@/modules/club-debts/service";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Marks a booking as completed (player arrived).
 */
export async function confirmArrivalAction(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);

  if (error) {
    return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
  }

  return { ok: true };
}

/**
 * Reports a no-show incident and applies trust penalty.
 * Also records a pending `club_debts` row for the player toward the club (best-effort).
 */
export async function reportNoShowAction(bookingId: string, playerId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: bookingRow, error: bookingLoadError } = await supabase
    .from("bookings")
    .select("id, club_id, total_price")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingLoadError || !bookingRow) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const clubId = String((bookingRow as { club_id: string }).club_id);
  const totalPrice = (bookingRow as { total_price?: number | null }).total_price;

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", bookingId);

  if (bookingError) {
    return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
  }

  const impact = trustImpactFromEvent("no_show");

  try {
    await addTrustEvent({
      player_id: playerId,
      kind: "no_show",
      delta: impact.delta,
      booking_id: bookingId,
    });
  } catch {
    return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
  }

  const debt = await createClubDebt(supabase, {
    clubId,
    playerId,
    bookingId,
    reason: "no_show",
    amountCents: deriveNoShowDebtAmountCents(totalPrice),
  });

  if (!debt.ok) {
    console.warn("[reportNoShowAction] club_debt insert failed (non-blocking):", debt.error);
  }

  return { ok: true };
}

/**
 * Confirms an incident and applies trust penalty.
 */
export async function confirmIncidentAction(
  playerId: string,
  incidentType: "no_show" | "late_cancel" | "bad_behavior",
  bookingId?: string,
): Promise<ActionResult> {
  const impact = trustImpactFromEvent(incidentType);

  try {
    await addTrustEvent({
      player_id: playerId,
      kind: incidentType,
      delta: impact.delta,
      booking_id: bookingId ?? null,
    });
  } catch {
    return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
  }

  return { ok: true };
}

/**
 * Records good behavior and gives trust boost.
 */
export async function recordGoodBehaviorAction(playerId: string): Promise<ActionResult> {
  const impact = trustImpactFromEvent("good_behavior");

  try {
    await addTrustEvent({
      player_id: playerId,
      kind: "good_behavior",
      delta: impact.delta,
    });
  } catch {
    return { ok: false, error: "Erreur lors de l'enregistrement." };
  }

  return { ok: true };
}
