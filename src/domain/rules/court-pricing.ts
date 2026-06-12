/** Nombre de joueurs standard sur un terrain de padel. */
export const PADEL_PLAYERS_PER_COURT = 4;

export const DEFAULT_COURT_SLOT_PRICE_DT = 40;
export const DEFAULT_COURT_PLAYER_PRICE_DT = 10;

function roundDt(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CourtPriceRow = {
  price_per_player?: number | null;
  price_per_slot?: number | null;
};

/** Part joueur pour un créneau (priorité `price_per_player`, sinon slot / 4). */
export function resolveCourtPlayerPrice(court: CourtPriceRow): number {
  const perPlayer = Number(court.price_per_player);
  if (Number.isFinite(perPlayer) && perPlayer > 0) {
    return roundDt(perPlayer);
  }

  const perSlot = Number(court.price_per_slot);
  if (Number.isFinite(perSlot) && perSlot > 0) {
    return roundDt(perSlot / PADEL_PLAYERS_PER_COURT);
  }

  return DEFAULT_COURT_PLAYER_PRICE_DT;
}

/** Tarif terrain complet pour affichage club (4 × joueur ou slot legacy). */
export function resolveCourtSlotReferencePrice(court: CourtPriceRow): number {
  const perSlot = Number(court.price_per_slot);
  if (Number.isFinite(perSlot) && perSlot > 0) {
    return roundDt(perSlot);
  }

  return roundDt(resolveCourtPlayerPrice(court) * PADEL_PLAYERS_PER_COURT);
}
