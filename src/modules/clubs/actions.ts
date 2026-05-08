"use server";

import { createClient } from "@/lib/supabase/server";
import { trustImpactFromEvent } from "@/domain/rules/trust";
import { addTrustEvent } from "@/modules/players/repository";

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
 */
export async function reportNoShowAction(bookingId: string, playerId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error: bookingError } = await supabase.from("bookings").update({ status: "no_show" }).eq("id", bookingId);

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
