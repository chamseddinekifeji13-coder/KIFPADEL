"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import { isParticipantPaymentPending } from "@/domain/rules/booking-participant";
import {
  deriveNoShowDebtAmountCents,
  parseClubFinancialPolicy,
  resolveNoShowTrustPenalty,
} from "@/domain/rules/club-financial-policy";
import { trustImpactFromEvent } from "@/domain/rules/trust";
import { createClubDebt } from "@/modules/club-debts/service";
import { assertClubStaffCanManage } from "@/modules/clubs/actions/club-staff-guard";
import { addTrustEvent } from "@/modules/players/repository";
import {
  notifyParticipantNoShow,
  notifyParticipantPaymentConfirmed,
} from "@/modules/notifications/participant-staff-events";

const CLUB_FINANCIAL_POLICY_SELECT =
  "no_show_debt_mode, no_show_debt_fixed_cents, no_show_debt_percent, no_show_trust_penalty, no_show_grace_minutes, no_show_auto_report, free_cancellation_hours, late_cancel_penalty_enabled, late_cancel_trust_penalty, allow_pay_on_site, min_trust_for_pay_on_site, require_phone_verification, require_profile_complete";

async function loadClubFinancialPolicy(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  clubId: string,
) {
  const { data } = await supabase
    .from("clubs")
    .select(CLUB_FINANCIAL_POLICY_SELECT)
    .eq("id", clubId)
    .maybeSingle();

  return parseClubFinancialPolicy(data);
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type ParticipantStaffContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>;
  participantId: string;
  status: string;
  paymentConfirmedAt: string | null;
  clubId: string;
};

async function requireStaffForTrustIncident(
  bookingId?: string,
  playerId?: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté." };
  }

  const { data: isSa } = await supabase.rpc("is_super_admin");
  if (isSa === true) {
    return { ok: true, supabase };
  }

  if (bookingId) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("club_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking?.club_id) {
      return { ok: false, error: "Réservation introuvable." };
    }

    const guard = await assertClubStaffCanManage(supabase, String(booking.club_id), user.id);
    if (!guard.ok) {
      return { ok: false, error: "Action non autorisée pour ce club." };
    }

    return { ok: true, supabase };
  }

  if (playerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("main_club_id")
      .eq("id", playerId)
      .maybeSingle();

    if (!profile?.main_club_id) {
      return { ok: false, error: "Joueur sans club principal — incident non autorisé." };
    }

    const guard = await assertClubStaffCanManage(
      supabase,
      String(profile.main_club_id),
      user.id,
    );
    if (!guard.ok) {
      return { ok: false, error: "Action non autorisée pour ce club." };
    }

    return { ok: true, supabase };
  }

  return { ok: false, error: "Contexte club requis pour cette action." };
}

async function resolveParticipantIdForStaff(
  supabase: Awaited<ReturnType<typeof createSupabaseServerActionClient>>,
  participantId: string,
): Promise<string> {
  if (!participantId.startsWith("legacy-")) {
    return participantId;
  }

  const bookingId = participantId.slice("legacy-".length);
  const { data } = await supabase
    .from("booking_participants")
    .select("id")
    .eq("booking_id", bookingId)
    .order("seat_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    return String(data.id);
  }

  return participantId;
}

async function loadParticipantForStaffAction(
  participantId: string,
): Promise<{ ok: true; ctx: ParticipantStaffContext } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté." };
  }

  const resolvedParticipantId = await resolveParticipantIdForStaff(supabase, participantId);

  if (resolvedParticipantId.startsWith("legacy-")) {
    const bookingId = resolvedParticipantId.slice("legacy-".length);
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, club_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return { ok: false, error: "Réservation introuvable." };
    }

    const clubId = String((booking as { club_id?: string }).club_id ?? "");
    const guard = await assertClubStaffCanManage(supabase, clubId, user.id);
    if (!guard.ok) {
      return { ok: false, error: "Action non autorisée pour ce club." };
    }

    return {
      ok: true,
      ctx: {
        supabase,
        participantId: resolvedParticipantId,
        status: String((booking as { status?: string }).status ?? ""),
        paymentConfirmedAt: null,
        clubId,
      },
    };
  }

  const { data: row, error: loadError } = await supabase
    .from("booking_participants")
    .select("id, status, payment_confirmed_at, bookings!inner(club_id)")
    .eq("id", resolvedParticipantId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "Place introuvable." };
  }

  const bookingRaw = (row as { bookings?: { club_id?: string } | { club_id?: string }[] | null }).bookings;
  const booking = Array.isArray(bookingRaw) ? bookingRaw[0] : bookingRaw;
  const clubId = String(booking?.club_id ?? "");

  if (!clubId) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const guard = await assertClubStaffCanManage(supabase, clubId, user.id);
  if (!guard.ok) {
    return { ok: false, error: "Action non autorisée pour ce club." };
  }

  return {
    ok: true,
    ctx: {
      supabase,
      participantId: resolvedParticipantId,
      status: String((row as { status?: string }).status ?? ""),
      paymentConfirmedAt: (row as { payment_confirmed_at?: string | null }).payment_confirmed_at ?? null,
      clubId,
    },
  };
}

/**
 * Valide l'encaissement d'une place (sur place ou en ligne).
 */
export async function confirmParticipantPaymentAction(participantId: string): Promise<ActionResult> {
  const loaded = await loadParticipantForStaffAction(participantId);
  if (!loaded.ok) {
    return loaded;
  }

  const { supabase, status, paymentConfirmedAt, participantId: resolvedId } = loaded.ctx;

  if (!isParticipantPaymentPending(status, paymentConfirmedAt)) {
    return { ok: false, error: "Encaissement déjà confirmé ou place non éligible." };
  }

  if (resolvedId.startsWith("legacy-")) {
    const bookingId = resolvedId.slice("legacy-".length);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (error) {
      return { ok: false, error: "Erreur lors de la confirmation de l'encaissement." };
    }

    return { ok: true };
  }

  const updates: { payment_confirmed_at: string; status?: string } = {
    payment_confirmed_at: new Date().toISOString(),
  };
  if (String(status).toLowerCase() === "pending") {
    updates.status = "confirmed";
  }

  const { error } = await supabase.from("booking_participants").update(updates).eq("id", resolvedId);

  if (error) {
    return { ok: false, error: "Erreur lors de la confirmation de l'encaissement." };
  }

  void notifyParticipantPaymentConfirmed(resolvedId).catch((err) =>
    console.error("[confirmParticipantPaymentAction] notify failed", err),
  );

  return { ok: true };
}

/**
 * Marque la présence d'un joueur (place individuelle).
 */
export async function confirmParticipantArrivalAction(participantId: string): Promise<ActionResult> {
  const loaded = await loadParticipantForStaffAction(participantId);
  if (!loaded.ok) {
    return loaded;
  }

  const { supabase, status, paymentConfirmedAt, participantId: resolvedId } = loaded.ctx;

  if (isParticipantPaymentPending(status, paymentConfirmedAt)) {
    return { ok: false, error: "Confirmez l'encaissement avant la présence." };
  }

  if (resolvedId.startsWith("legacy-")) {
    const bookingId = resolvedId.slice("legacy-".length);
    const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);
    if (error) {
      return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
    }
    return { ok: true };
  }

  const { data: row, error: loadError } = await supabase
    .from("booking_participants")
    .select("id, booking_id, status")
    .eq("id", resolvedId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "Place introuvable." };
  }

  const { error } = await supabase
    .from("booking_participants")
    .update({ status: "completed" })
    .eq("id", resolvedId);

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
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Vous devez être connecté." };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("club_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking?.club_id) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const guard = await assertClubStaffCanManage(supabase, String(booking.club_id), user.id);
  if (!guard.ok) {
    return { ok: false, error: "Action non autorisée pour ce club." };
  }

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
  const loaded = await loadParticipantForStaffAction(participantId);
  if (!loaded.ok) {
    return loaded;
  }

  const { supabase, participantId: resolvedId } = loaded.ctx;

  if (resolvedId.startsWith("legacy-")) {
    const bookingId = resolvedId.slice("legacy-".length);
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, created_by, player_id, total_price, status, club_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return { ok: false, error: "Réservation introuvable." };
    }

    const playerId = String(
      (booking as { created_by?: string; player_id?: string }).created_by ??
        (booking as { player_id?: string }).player_id ??
        "",
    );
    if (!playerId) {
      return { ok: false, error: "Joueur introuvable pour cette réservation." };
    }

    const { error } = await supabase.from("bookings").update({ status: "no_show" }).eq("id", bookingId);
    if (error) {
      return { ok: false, error: "Erreur lors du signalement no-show." };
    }

    const clubId = String((booking as { club_id?: string }).club_id ?? "");
    const totalPrice = (booking as { total_price?: number | null }).total_price;
    const policy = clubId ? await loadClubFinancialPolicy(supabase, clubId) : parseClubFinancialPolicy(null);
    const trustDelta = resolveNoShowTrustPenalty(policy);

    if (trustDelta !== 0) {
      try {
        await addTrustEvent({
          player_id: playerId,
          kind: "no_show",
          delta: trustDelta,
          booking_id: bookingId,
        });
      } catch {
        return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
      }
    }

    const debtAmountCents = deriveNoShowDebtAmountCents(totalPrice, policy);
    if (clubId && debtAmountCents != null && debtAmountCents > 0) {
      const debt = await createClubDebt(supabase, {
        clubId,
        playerId,
        bookingId,
        reason: "no_show",
        amountCents: debtAmountCents,
      });
      if (!debt.ok) {
        console.warn("[reportParticipantNoShowAction] legacy club_debt insert failed:", debt.error);
      }
    }

    return { ok: true };
  }

  const { data: participant, error: loadError } = await supabase
    .from("booking_participants")
    .select("id, booking_id, player_id, share_price, status")
    .eq("id", resolvedId)
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
  const policy = await loadClubFinancialPolicy(supabase, clubId);

  const { error: participantError } = await supabase
    .from("booking_participants")
    .update({ status: "no_show" })
    .eq("id", resolvedId);

  if (participantError) {
    return { ok: false, error: "Erreur lors de la mise à jour de la place." };
  }

  const trustDelta = resolveNoShowTrustPenalty(policy);

  if (trustDelta !== 0) {
    try {
      await addTrustEvent({
        player_id: playerId,
        kind: "no_show",
        delta: trustDelta,
        booking_id: bookingId,
      });
    } catch {
      return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
    }
  }

  const debtAmountCents = deriveNoShowDebtAmountCents(sharePrice, policy);
  if (debtAmountCents != null && debtAmountCents > 0) {
    const debt = await createClubDebt(supabase, {
      clubId,
      playerId,
      bookingId,
      participantId: resolvedId,
      reason: "no_show",
      amountCents: debtAmountCents,
    });

    if (!debt.ok) {
      console.warn("[reportParticipantNoShowAction] club_debt insert failed (non-blocking):", debt.error);
    }
  }

  void notifyParticipantNoShow(resolvedId).catch((err) =>
    console.error("[reportParticipantNoShowAction] notify failed", err),
  );

  return { ok: true };
}

/** Legacy : résout la place du joueur si possible. */
export async function reportNoShowAction(bookingId: string, playerId: string): Promise<ActionResult> {
  const staff = await requireStaffForTrustIncident(bookingId);
  if (!staff.ok) {
    return staff;
  }

  const supabase = staff.supabase;

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
  const policy = await loadClubFinancialPolicy(supabase, clubId);

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", bookingId);

  if (bookingError) {
    return { ok: false, error: "Erreur lors de la mise à jour de la réservation." };
  }

  const trustDelta = resolveNoShowTrustPenalty(policy);

  if (trustDelta !== 0) {
    try {
      await addTrustEvent({
        player_id: playerId,
        kind: "no_show",
        delta: trustDelta,
        booking_id: bookingId,
      });
    } catch {
      return { ok: false, error: "Erreur lors de l'enregistrement de l'incident." };
    }
  }

  const debtAmountCents = deriveNoShowDebtAmountCents(totalPrice, policy);
  if (debtAmountCents != null && debtAmountCents > 0) {
    const debt = await createClubDebt(supabase, {
      clubId,
      playerId,
      bookingId,
      reason: "no_show",
      amountCents: debtAmountCents,
    });

    if (!debt.ok) {
      console.warn("[reportNoShowAction] club_debt insert failed (non-blocking):", debt.error);
    }
  }

  return { ok: true };
}

export async function confirmIncidentAction(
  playerId: string,
  incidentType: "no_show" | "late_cancel" | "bad_behavior",
  bookingId?: string,
): Promise<ActionResult> {
  const staff = await requireStaffForTrustIncident(bookingId, bookingId ? undefined : playerId);
  if (!staff.ok) {
    return staff;
  }

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
  const staff = await requireStaffForTrustIncident(undefined, playerId);
  if (!staff.ok) {
    return staff;
  }

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
