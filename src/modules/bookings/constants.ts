/** Durée métier padel : 90 minutes par réservation. */
export const DEFAULT_BOOKING_DURATION_MINUTES = 90;

/** Valeur legacy (migration 60 min) — toujours normalisée vers 90 en V1. */
const LEGACY_SLOT_DURATION_MINUTES = 60;

/** Durée effective d’un créneau (grille + `ends_at` réservation). */
export function resolveBookingDurationMinutes(raw: number | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BOOKING_DURATION_MINUTES;
  if (n === LEGACY_SLOT_DURATION_MINUTES) return DEFAULT_BOOKING_DURATION_MINUTES;
  return n;
}
