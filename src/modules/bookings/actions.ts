"use server";

import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";
import {
  assertPlayerCanBook,
  isPlayerAccessError,
} from "@/modules/compliance/player-access";

export type BookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error: string;
      code:
        | "BLACKLISTED"
        | "RESTRICTED_REQUIRES_ONLINE"
        | "PAYMENT_UNAVAILABLE"
        | "SLOT_TAKEN"
        | "UNAUTHORIZED"
        | "SERVER_ERROR"
        | "PLAYER_SUSPENDED"
        | "PLAYER_HAS_PENDING_DEBT";
    };

export type CreateBookingInput = {
  clubId: string;
  courtId: string;
  startsAt: string; // ISO string
  endsAt: string;   // ISO string
  totalPrice: number;
  paymentMethod: "online" | "on_site";
};

/**
 * Server action to create a booking with trust enforcement.
 * - Blacklisted players are blocked entirely.
 * - Restricted players can only book with online payment.
 * - Checks for double-booking on the same court/time.
 */
export async function createBookingAction(input: CreateBookingInput): Promise<BookingResult> {
  const supabase = await createClient();

  // 1. Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Vous devez être connecté pour réserver.", code: "UNAUTHORIZED" };
  }

  if (input.paymentMethod === "online") {
    return {
      ok: false,
      error: "Le paiement en ligne n'est pas encore disponible. Choisissez le paiement sur place.",
      code: "PAYMENT_UNAVAILABLE",
    };
  }

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

  // 2. Fetch the player's profile to check trust score
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("trust_score, reliability_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Profil joueur introuvable.", code: "SERVER_ERROR" };
  }

  // 3. Server-side trust enforcement
  const reliability = reliabilityFromTrustScore(profile.trust_score ?? 70);

  // Block blacklisted players entirely
  if (reliability === "blacklisted") {
    return { 
      ok: false, 
      error: "Votre compte est suspendu. Vous ne pouvez pas effectuer de réservations.", 
      code: "BLACKLISTED" 
    };
  }

  // Restricted players require online payment, which is not integrated yet.
  if (reliability === "restricted" && input.paymentMethod === "on_site") {
    return { 
      ok: false, 
      error: "Votre score de confiance requiert le paiement en ligne, qui n'est pas encore disponible dans l'app.",
      code: "RESTRICTED_REQUIRES_ONLINE" 
    };
  }

  // 4. Fetch club policy and authoritative court price.
  const adminClient = createSupabaseAdminClient();
  const [{ data: club }, { data: court, error: courtError }] = await Promise.all([
    supabase
      .from("clubs")
      .select("min_trust_for_on_site, require_payment_for_restricted")
      .eq("id", input.clubId)
      .single(),
    adminClient
      .from("courts")
      .select("*")
      .eq("id", input.courtId)
      .eq("club_id", input.clubId)
      .single(),
  ]);

  if (courtError || !court) {
    return { ok: false, error: "Terrain introuvable pour ce club.", code: "SERVER_ERROR" };
  }

  const authoritativePrice = Number((court as { price_per_slot?: number | null }).price_per_slot ?? 40);

  if (club && input.paymentMethod === "on_site") {
    const minTrust = club.min_trust_for_on_site ?? 70;
    if ((profile.trust_score ?? 70) < minTrust) {
      return {
        ok: false,
        error: `Ce club exige un score de confiance minimum de ${minTrust} pour le paiement sur place.`,
        code: "RESTRICTED_REQUIRES_ONLINE"
      };
    }
  }

  // 5. Atomic DB booking. Online payment is disabled until a real checkout exists.
  const bookingStatus = "confirmed";
  const { data: bookingRows, error: rpcError } = await supabase.rpc("create_booking_atomic", {
    p_club_id: input.clubId,
    p_court_id: input.courtId,
    p_player_id: user.id,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_total_price: authoritativePrice,
    p_payment_method: input.paymentMethod,
    p_status: bookingStatus,
  });

  if (rpcError) {
    console.error("Booking RPC error:", rpcError);
    return { ok: false, error: "Erreur lors de la création de la réservation.", code: "SERVER_ERROR" };
  }

  const bookingResult = Array.isArray(bookingRows) ? bookingRows[0] : null;
  if (!bookingResult?.ok) {
    if (bookingResult?.error_code === "SLOT_TAKEN") {
      return {
        ok: false,
        error: "Ce créneau est déjà réservé. Veuillez en choisir un autre.",
        code: "SLOT_TAKEN",
      };
    }
    if (bookingResult?.error_code === "INVALID_RANGE") {
      return {
        ok: false,
        error: "Le créneau sélectionné est invalide.",
        code: "SERVER_ERROR",
      };
    }
    if (bookingResult?.error_code === "UNAUTHORIZED") {
      return {
        ok: false,
        error: "Vous devez être connecté pour réserver.",
        code: "UNAUTHORIZED",
      };
    }
    console.error("Booking RPC business error:", bookingResult?.error_message);
    return { ok: false, error: "Erreur lors de la création de la réservation.", code: "SERVER_ERROR" };
  }

  return { ok: true, bookingId: bookingResult.booking_id as string };
}

/**
 * Fetches the current user's trust info for client-side display.
 */
export async function getPlayerTrustInfo(): Promise<{
  trustScore: number;
  reliability: "healthy" | "warning" | "restricted" | "blacklisted";
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const trustScore = profile.trust_score ?? 70;
  return {
    trustScore,
    reliability: reliabilityFromTrustScore(trustScore),
  };
}
