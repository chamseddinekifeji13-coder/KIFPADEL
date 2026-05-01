"use server";

import { createClient } from "@/lib/supabase/server";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";

export type BookingResult = 
  | { ok: true; bookingId: string }
  | { ok: false; error: string; code: "BLACKLISTED" | "RESTRICTED_REQUIRES_ONLINE" | "SLOT_TAKEN" | "UNAUTHORIZED" | "SERVER_ERROR" };

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

  // Restricted players must pay online
  if (reliability === "restricted" && input.paymentMethod === "on_site") {
    return { 
      ok: false, 
      error: "Votre score de confiance ne permet pas le paiement sur place. Veuillez payer en ligne.", 
      code: "RESTRICTED_REQUIRES_ONLINE" 
    };
  }

  // 4. Fetch club policy for additional enforcement
  const { data: club } = await supabase
    .from("clubs")
    .select("min_trust_for_on_site, require_payment_for_restricted")
    .eq("id", input.clubId)
    .single();

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

  // 5. Check for double-booking (same court, overlapping time)
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("court_id", input.courtId)
    .neq("status", "cancelled")
    .lt("starts_at", input.endsAt)
    .gt("ends_at", input.startsAt);

  if (existingBookings && existingBookings.length > 0) {
    return { 
      ok: false, 
      error: "Ce créneau est déjà réservé. Veuillez en choisir un autre.", 
      code: "SLOT_TAKEN" 
    };
  }

  // 6. Create the booking
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      club_id: input.clubId,
      court_id: input.courtId,
      player_id: user.id,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      total_price: input.totalPrice,
      payment_method: input.paymentMethod,
      status: input.paymentMethod === "online" ? "pending" : "confirmed",
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    console.error("Booking insert error:", insertError);
    return { ok: false, error: "Erreur lors de la création de la réservation.", code: "SERVER_ERROR" };
  }

  return { ok: true, bookingId: booking.id };
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
