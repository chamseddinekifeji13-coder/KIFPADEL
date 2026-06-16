"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";
import {
  isBookingRpcSuccess,
  parseBookingRpcRow,
  type BookingRpcRow,
} from "@/lib/bookings/rpc-result";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";
import {
  assertPlayerCanBook,
  isPlayerAccessError,
} from "@/modules/compliance/player-access";
import {
  isPhoneVerified,
  newAccountMustPayOnline,
} from "@/modules/compliance/new-account-gates";
import { computeBookingTotals } from "@/modules/bookings/pricing-service";
import { isRacketRentalBookingPipelineReady } from "@/modules/bookings/racket-rental-pipeline";
import { notifyBookingCreated } from "@/modules/notifications/booking-created";

/** Erreur PostgREST / PG quand la RPC attendue (10 args + raquettes) n’est pas déployée. */
function isLikelyRpcSignatureMismatch(err: { message?: string; code?: string; details?: string; hint?: string } | null): boolean {
  if (!err?.message) return false;
  const blob = `${err.message} ${err.code ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return (
    blob.includes("could not find the function") ||
    blob.includes("does not exist") ||
    blob.includes("42883") ||
    blob.includes("pgrst202") ||
    (blob.includes("function") && blob.includes("create_booking_atomic") && blob.includes("no matches"))
  );
}

export type BookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error: string;
      code:
        | "BLACKLISTED"
        | "RESTRICTED_REQUIRES_ONLINE"
        | "SLOT_TAKEN"
        | "UNAUTHORIZED"
        | "SERVER_ERROR"
        | "PLAYER_SUSPENDED"
        | "PLAYER_HAS_PENDING_DEBT";
    };

export type CreateBookingInput = {
  clubId: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  paymentMethod: "online" | "on_site";
  /** Quantité demandée ; le serveur peut la ramener à 0 si l’offre n’est pas valide. */
  racketRentalQty?: number;
  /** Pour diagnostic uniquement — jamais utilisé comme montant facturé. */
  clientTotalHint?: number;
};

/**
 * Server action to create a booking with trust enforcement.
 * - Blacklisted players are blocked entirely.
 * - Restricted players can only book with online payment.
 * - Checks for double-booking on the same court/time.
 * - Prix total recalculé côté serveur (terrain + location raquettes).
 */
function mapBookingRpcFailure(row: BookingRpcRow | null): BookingResult {
  const code = row?.error_code?.toUpperCase() ?? "";

  if (code === "SLOT_TAKEN") {
    return {
      ok: false,
      error: "Ce créneau est complet (4 joueurs). Choisissez un autre horaire ou terrain.",
      code: "SLOT_TAKEN",
    };
  }
  if (code === "ALREADY_JOINED") {
    return {
      ok: false,
      error: "Vous avez déjà une place sur ce créneau.",
      code: "SERVER_ERROR",
    };
  }
  if (code === "INVALID_RANGE") {
    return {
      ok: false,
      error: "Le créneau sélectionné est invalide.",
      code: "SERVER_ERROR",
    };
  }
  if (code === "SCHEMA_ERROR") {
    console.error("Booking RPC schema error:", row?.error_message);
    return {
      ok: false,
      error:
        "Schéma base de données incompatible (réservation). L’administrateur doit appliquer les migrations Supabase récentes.",
      code: "SERVER_ERROR",
    };
  }
  if (code === "UNAUTHORIZED") {
    return {
      ok: false,
      error: "Vous devez être connecté pour réserver.",
      code: "UNAUTHORIZED",
    };
  }
  if (code === "INSERT_FAILED") {
    console.error("Booking RPC insert failed:", row?.error_message);
    return {
      ok: false,
      error:
        "Impossible d'enregistrer la réservation (contrainte base de données). Réessayez ou choisissez un autre créneau.",
      code: "SERVER_ERROR",
    };
  }

  if (row?.error_message?.trim()) {
    console.error("Booking RPC business error:", row.error_code, row.error_message);
    return { ok: false, error: row.error_message.trim(), code: "SERVER_ERROR" };
  }

  console.error("Booking RPC unknown failure:", row);
  if (code) {
    return {
      ok: false,
      error: `Réservation impossible (${code}). Réessayez ou contactez le support.`,
      code: "SERVER_ERROR",
    };
  }
  return { ok: false, error: "Erreur lors de la création de la réservation.", code: "SERVER_ERROR" };
}

export async function createBookingAction(input: CreateBookingInput): Promise<BookingResult> {
  const supabase = await createSupabaseServerActionClient();

  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  const { data: refreshData } = await supabase.auth.refreshSession();
  const session = refreshData.session ?? initialSession;

  if (sessionError || !session?.user) {
    return {
      ok: false,
      error: "Session expirée. Déconnectez-vous puis reconnectez-vous.",
      code: "UNAUTHORIZED",
    };
  }

  const user = session.user;

  try {
    await assertPlayerCanBook(supabase, { playerId: user.id, clubId: input.clubId });
  } catch (e) {
    if (isPlayerAccessError(e)) {
      return { ok: false, error: e.message, code: e.code };
    }
    console.error("[createBookingAction] eligibility check failed", e);
    return {
      ok: false,
      error: "Impossible de vérifier votre situation auprès du club. Réessayez dans un instant.",
      code: "SERVER_ERROR",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("trust_score, reliability_status, phone_verified_at, created_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Profil joueur introuvable.", code: "SERVER_ERROR" };
  }

  if (!isPhoneVerified(profile)) {
    return {
      ok: false,
      error:
        "Enregistrez et confirmez votre numéro de téléphone dans votre profil avant de réserver.",
      code: "SERVER_ERROR",
    };
  }

  const reliability = reliabilityFromTrustScore(profile.trust_score ?? 70);

  if (reliability === "blacklisted") {
    return {
      ok: false,
      error: "Votre compte est suspendu. Vous ne pouvez pas effectuer de réservations.",
      code: "BLACKLISTED",
    };
  }

  if (reliability === "restricted" && input.paymentMethod === "on_site") {
    return {
      ok: false,
      error: "Votre score de confiance ne permet pas le paiement sur place. Veuillez payer en ligne.",
      code: "RESTRICTED_REQUIRES_ONLINE",
    };
  }

  if (newAccountMustPayOnline(profile) && input.paymentMethod === "on_site") {
    return {
      ok: false,
      error:
        "Compte récent : le paiement sur place est disponible après quelques réservations honorées. Choisissez le paiement en ligne.",
      code: "RESTRICTED_REQUIRES_ONLINE",
    };
  }

  const { data: clubPolicy, error: clubErr } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", input.clubId)
    .maybeSingle();

  if (clubErr || !clubPolicy) {
    console.error("[createBookingAction] club read failed", clubErr?.message, clubErr);
    return { ok: false, error: "Club introuvable ou inaccessible.", code: "SERVER_ERROR" };
  }

  if (input.paymentMethod === "on_site") {
    const minTrustRaw = (clubPolicy as { min_trust_for_on_site?: number | null }).min_trust_for_on_site;
    const minTrust = minTrustRaw !== null && minTrustRaw !== undefined ? Number(minTrustRaw) : 70;
    if (Number.isFinite(minTrust) && (profile.trust_score ?? 70) < minTrust) {
      return {
        ok: false,
        error: `Ce club exige un score de confiance minimum de ${minTrust} pour le paiement sur place.`,
        code: "RESTRICTED_REQUIRES_ONLINE",
      };
    }
  }

  const { data: courtRow, error: courtErr } = await supabase
    .from("courts")
    .select("id, club_id, price_per_slot, price_per_player, is_active")
    .eq("club_id", input.clubId)
    .eq("id", input.courtId)
    .maybeSingle();

  if (courtErr) {
    console.error("[createBookingAction] court read failed", courtErr.message);
  }

  const court = courtRow as {
    id: string;
    club_id: string;
    price_per_slot: number | null;
    price_per_player: number | null;
    is_active: boolean | null;
  } | null;

  if (!court || court.is_active === false) {
    return {
      ok: false,
      error: "Terrain introuvable ou indisponible.",
      code: "SERVER_ERROR",
    };
  }

  const cp = clubPolicy as {
    racket_rental_enabled?: boolean | null;
    racket_rental_price_per_unit?: number | string | null;
  };

  const pipelineReady = isRacketRentalBookingPipelineReady();
  const racketQtySafe = pipelineReady ? (input.racketRentalQty ?? 0) : 0;

  let totals;
  try {
    totals = computeBookingTotals({
      club: {
        racket_rental_enabled: Boolean(cp.racket_rental_enabled),
        racket_rental_price_per_unit:
          cp.racket_rental_price_per_unit == null
            ? null
            : (() => {
                const n = Number(cp.racket_rental_price_per_unit);
                return Number.isFinite(n) ? n : null;
              })(),
      },
      court: {
        price_per_slot: court.price_per_slot == null ? null : Number(court.price_per_slot),
        price_per_player: court.price_per_player == null ? null : Number(court.price_per_player),
      },
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      racketRentalQtyRequested: racketQtySafe,
      clientTotalHint: input.clientTotalHint,
    });
  } catch (e) {
    console.error("[createBookingAction] pricing failed", e);
    return { ok: false, error: "Impossible de calculer le montant de la réservation.", code: "SERVER_ERROR" };
  }

  const bookingStatus = input.paymentMethod === "online" ? "pending" : "confirmed";

  const rpcWithRackets = {
    p_club_id: input.clubId,
    p_court_id: input.courtId,
    p_player_id: user.id,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_total_price: totals.totalPrice,
    p_payment_method: input.paymentMethod,
    p_status: bookingStatus,
    p_racket_rental_qty: totals.racketRentalQty,
    p_racket_rental_fee: totals.racketFee,
  };

  const rpcLegacy = {
    p_club_id: input.clubId,
    p_court_id: input.courtId,
    p_player_id: user.id,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_total_price: totals.totalPrice,
    p_payment_method: input.paymentMethod,
    p_status: bookingStatus,
  };

  const useRacketRpc = pipelineReady && totals.racketRentalQty > 0;

  let { data: bookingRows, error: rpcError } = useRacketRpc
    ? await supabase.rpc("create_booking_atomic", rpcWithRackets)
    : await supabase.rpc("create_booking_atomic", rpcLegacy);

  if (useRacketRpc && rpcError && isLikelyRpcSignatureMismatch(rpcError)) {
    console.warn("[createBookingAction] repli RPC sans raquettes", rpcError.message);
    const second = await supabase.rpc("create_booking_atomic", rpcLegacy);
    bookingRows = second.data;
    rpcError = second.error;
  }

  const bookingResult = parseBookingRpcRow(bookingRows);

  if (rpcError) {
    console.error("Booking RPC error:", rpcError.message, rpcError.code, rpcError.details, rpcError);
  }

  if (rpcError) {
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "development"
          ? `Réservation impossible (RPC). ${rpcError.message ?? ""}`.trim()
          : directFallbackPublicMessage(rpcError),
      code: "SERVER_ERROR",
    };
  }

  if (!isBookingRpcSuccess(bookingResult)) {
    if (!bookingResult) {
      console.error("Booking RPC empty or invalid payload:", bookingRows);
      return {
        ok: false,
        error: "Réponse serveur inattendue. Réessayez ou rechargez la page.",
        code: "SERVER_ERROR",
      };
    }
    return mapBookingRpcFailure(bookingResult);
  }

  const bookingId = bookingResult?.booking_id;
  if (!bookingId) {
    console.error("Booking RPC ok without booking_id:", bookingResult);
    return { ok: false, error: "Erreur lors de la création de la réservation.", code: "SERVER_ERROR" };
  }

  void notifyBookingCreated({ bookingId, playerId: user.id }).catch((err) =>
    console.error("[createBookingAction] notifyBookingCreated failed", err),
  );

  return { ok: true, bookingId };
}

function directFallbackPublicMessage(rpcError: { message?: string; code?: string }): string {
  const hint = rpcError.code ? ` (${rpcError.code})` : "";
  return `Réservation impossible${hint}. Réessayez ou contactez le support.`;
}

/**
 * Fetches the current user's trust info for client-side display.
 */
export async function getPlayerTrustInfo(): Promise<{
  trustScore: number;
  reliability: "healthy" | "warning" | "restricted" | "blacklisted";
} | null> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("trust_score").eq("id", user.id).single();

  if (!profile) return null;

  const trustScore = profile.trust_score ?? 70;
  return {
    trustScore,
    reliability: reliabilityFromTrustScore(trustScore),
  };
}
