"use server";

import { createClient } from "@/lib/supabase/server";
import { trustImpactFromEvent } from "@/domain/rules/trust";
import { addTrustEvent } from "@/modules/players/repository";
import { createClubDebt, deriveNoShowDebtAmountCents } from "@/modules/club-debts/service";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Marque la présence d'un joueur (place individuelle).
 */
export async function confirmParticipantArrivalAction(participantId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: row, error: loadError } = await supabase
    .from("booking_participants")
    .select("id, booking_id, status")
    .eq("id", participantId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "Place introuvable." };
  }

  const { error } = await supabase
    .from("booking_participants")
    .update({ status: "completed" })
    .eq("id", participantId);

  if (error) {
    return { ok: false, error: "Erreur lors de la mise à jour de la place." };
  }

  const bookingId = String((row as { booking_id: string }).booking_id);
  const { data: siblings } = await supabase
    .from("booking_participants")
    .select("status")
    .eq("booking_id", bookingId);

  const allDone =
    (siblings ?? []).length > 0 &&
    (siblings ?? []).every((s) => String((s as { status?: string }).status ?? "") === "completed");

  if (allDone) {
    await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);
  }

  return { ok: true };
}

/** Legacy : confirme toute la réservation (première place). */
export async function confirmArrivalAction(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("booking_participants")
    .select("id")
    .eq("booking_id", bookingId)
    .order("seat_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (participant?.id) {
    return confirmParticipantArrivalAction(String(participant.id));
  }

  const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);

  if (error) {
    return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
  }

  return { ok: true };
}

/**
 * No-show sur un joueur uniquement (pas la session entière).
 */
export async function reportParticipantNoShowAction(participantId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: participant, error: loadError } = await supabase
    .from("booking_participants")
    .select("id, booking_id, player_id, share_price, status")
    .eq("id", participantId)
    .maybeSingle();

  if (loadError || !participant) {
    return { ok: false, error: "Place introuvable." };
  }

  const playerId = String((participant as { player_id: string }).player_id);
  const bookingId = String((participant as { booking_id: string }).booking_id);
  const sharePrice = (participant as { share_price?: number | null }).share_price;

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("club_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!bookingRow?.club_id) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const clubId = String(bookingRow.club_id);

  const { error: participantError } = await supabase
    .from("booking_participants")
    .update({ status: "no_show" })
    .eq("id", participantId);

  if (participantError) {
    return { ok: false, error: "Erreur lors de la mise à jour de la place." };
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
    participantId,
    reason: "no_show",
    amountCents: deriveNoShowDebtAmountCents(sharePrice),
  });

  if (!debt.ok) {
    console.warn("[reportParticipantNoShowAction] club_debt insert failed (non-blocking):", debt.error);
  }

  return { ok: true };
}

/** Legacy : résout la place du joueur si possible. */
export async function reportNoShowAction(bookingId: string, playerId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("booking_participants")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (participant?.id) {
    return reportParticipantNoShowAction(String(participant.id));
  }

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
