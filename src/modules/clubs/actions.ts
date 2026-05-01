"use server";

import { createClient } from "@/lib/supabase/server";
import { trustImpactFromEvent } from "@/domain/rules/trust";

export type ActionResult = 
  | { ok: true }
  | { ok: false; error: string };

/**
 * Marks a booking as completed (player arrived).
 */
export async function confirmArrivalAction(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId);

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

  // 1. Update booking status
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", bookingId);

  if (bookingError) {
    return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
  }

  // 2. Calculate trust impact
  const impact = trustImpactFromEvent("no_show");

  // 3. Insert trust event
  const { error: eventError } = await supabase
    .from("trust_events")
    .insert({
      player_id: playerId,
      kind: "no_show",
      delta: impact.delta,
      booking_id: bookingId,
    });

  if (eventError) {
    return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
  }

  // 4. Update player's trust score
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", playerId)
    .single();

  if (profile) {
    const currentScore = profile.trust_score ?? 70;
    const newScore = Math.max(0, Math.min(100, currentScore + impact.delta));
    
    // Determine new reliability status
    let newStatus = "healthy";
    if (newScore < 25) newStatus = "blacklisted";
    else if (newScore < 45) newStatus = "restricted";
    else if (newScore < 70) newStatus = "warning";

    await supabase
      .from("profiles")
      .update({ 
        trust_score: newScore,
        reliability_status: newStatus,
      })
      .eq("id", playerId);
  }

  return { ok: true };
}

/**
 * Confirms an incident and applies trust penalty.
 */
export async function confirmIncidentAction(
  playerId: string, 
  incidentType: "no_show" | "late_cancel" | "bad_behavior",
  bookingId?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const impact = trustImpactFromEvent(incidentType);

  // 1. Insert trust event
  const { error: eventError } = await supabase
    .from("trust_events")
    .insert({
      player_id: playerId,
      kind: incidentType,
      delta: impact.delta,
      booking_id: bookingId ?? null,
    });

  if (eventError) {
    return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
  }

  // 2. Update player's trust score
  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", playerId)
    .single();

  if (profile) {
    const currentScore = profile.trust_score ?? 70;
    const newScore = Math.max(0, Math.min(100, currentScore + impact.delta));
    
    let newStatus = "healthy";
    if (newScore < 25) newStatus = "blacklisted";
    else if (newScore < 45) newStatus = "restricted";
    else if (newScore < 70) newStatus = "warning";

    await supabase
      .from("profiles")
      .update({ 
        trust_score: newScore,
        reliability_status: newStatus,
      })
      .eq("id", playerId);
  }

  return { ok: true };
}

/**
 * Records good behavior and gives trust boost.
 */
export async function recordGoodBehaviorAction(playerId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const impact = trustImpactFromEvent("good_behavior");

  const { error: eventError } = await supabase
    .from("trust_events")
    .insert({
      player_id: playerId,
      kind: "good_behavior",
      delta: impact.delta,
    });

  if (eventError) {
    return { ok: false, error: "Erreur lors de l'enregistrement." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", playerId)
    .single();

  if (profile) {
    const currentScore = profile.trust_score ?? 70;
    const newScore = Math.min(100, currentScore + impact.delta);
    
    let newStatus = "healthy";
    if (newScore < 25) newStatus = "blacklisted";
    else if (newScore < 45) newStatus = "restricted";
    else if (newScore < 70) newStatus = "warning";

    await supabase
      .from("profiles")
      .update({ 
        trust_score: newScore,
        reliability_status: newStatus,
      })
      .eq("id", playerId);
  }

  return { ok: true };
}
