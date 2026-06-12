/** Données club nécessaires au calcul prix (réutilisable hors repository). */
export type ClubPricingInput = {
  racket_rental_enabled: boolean;
  racket_rental_price_per_unit: number | null;
};

export type CourtPricingInput = {
  price_per_slot: number | null;
};

const MAX_RACKET_QTY = 8;

/** Arrondit un montant en DT à 2 décimales (évite flottants bruyants). */
function roundDt(n: number): number {
  return Math.round(n * 100) / 100;
}

export type BookingTotalsInput = {
  club: ClubPricingInput;
  court: CourtPricingInput;
  startsAt: string | Date;
  endsAt: string | Date;
  racketRentalQtyRequested: number;
  /** Optionnel — log si écart notable avec le total serveur. */
  clientTotalHint?: number;
};

export type BookingTotals = {
  basePrice: number;
  racketFee: number;
  totalPrice: number;
  racketRentalQty: number;
};

/**
 * Source de vérité pour total_price + frais raquettes.
 * - Base = tarif officiel du terrain (`price_per_slot`) pour la durée métier standard (pas de prorata minute en V1).
 * - Durée peut servir ultérieurement : pour l’instant identique au modèle grille (un créneau = un prix).
 */
export function computeBookingTotals({
  club,
  court,
  startsAt: _startsAt,
  endsAt: _endsAt,
  racketRentalQtyRequested,
  clientTotalHint,
}: BookingTotalsInput): BookingTotals {
  const rawBase = Number(court.price_per_slot ?? 40);
  if (!Number.isFinite(rawBase) || rawBase < 0) {
    throw new Error("INVALID_COURT_PRICE");
  }
  const basePrice = roundDt(rawBase);

  let qty = Math.floor(Number(racketRentalQtyRequested) || 0);
  if (qty < 0) qty = 0;
  if (qty > MAX_RACKET_QTY) qty = MAX_RACKET_QTY;

  const enabled = Boolean(club.racket_rental_enabled);
  const unitRaw = club.racket_rental_price_per_unit;
  const unit =
    unitRaw !== null && unitRaw !== undefined && Number.isFinite(Number(unitRaw)) ? Number(unitRaw) : NaN;

  let racketFee = 0;
  if (enabled && qty > 0 && unit > 0) {
    racketFee = roundDt(qty * unit);
  } else {
    qty = 0;
    racketFee = 0;
  }

  const totalPrice = roundDt(basePrice + racketFee);

  if (
    clientTotalHint !== undefined &&
    Number.isFinite(clientTotalHint) &&
    Math.abs(roundDt(clientTotalHint) - totalPrice) > 0.051
  ) {
    console.warn("[computeBookingTotals] client/server total discrepancy", {
      client: clientTotalHint,
      server: totalPrice,
    });
  }

  void _startsAt;
  void _endsAt;

  return {
    basePrice,
    racketFee,
    totalPrice,
    racketRentalQty: qty,
  };
}
