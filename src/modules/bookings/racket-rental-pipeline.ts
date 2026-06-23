import type { Club } from "@/modules/clubs/repository";

/**
 * Pipeline « location de raquettes » : colonnes `bookings`/RPC `create_booking_atomic` à 10 arguments.
 *
 * En **production**, désactivé par défaut : définir `RACKET_RENTAL_ATOMIC_RPC_READY=true` sur l’hébergeur
 * après migration Supabase. `RACKET_RENTAL_ATOMIC_RPC_READY=false` force la désactivation explicite.
 * Hors production, activé par défaut pour le développement local.
 */
export function isRacketRentalBookingPipelineReady(): boolean {
  const flag = process.env.RACKET_RENTAL_ATOMIC_RPC_READY;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Affichage UI : le club propose la location (indépendant du flag RPC). */
export function isRacketRentalOfferedByClub(
  club: Pick<Club, "racket_rental_enabled" | "racket_rental_price_per_unit">,
): boolean {
  return (
    Boolean(club.racket_rental_enabled) &&
    club.racket_rental_price_per_unit != null &&
    Number(club.racket_rental_price_per_unit) > 0
  );
}

export function isRacketRentalShownInBookingFlow(
  club: Pick<Club, "racket_rental_enabled" | "racket_rental_price_per_unit">,
): boolean {
  if (!isRacketRentalBookingPipelineReady()) return false;
  return isRacketRentalOfferedByClub(club);
}
