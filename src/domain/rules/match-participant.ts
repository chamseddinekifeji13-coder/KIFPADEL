export type MatchParticipantStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type ViewerParticipationPhase = "none" | "pending" | "confirmed";

export type MatchParticipantRow = {
  player_id: string;
  team: string;
  status?: string | null;
  share_price?: number | string | null;
  payment_method?: string | null;
  payment_committed_at?: string | null;
};

export function normalizeMatchParticipantStatus(
  raw: string | null | undefined,
): MatchParticipantStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "pending" || s === "confirmed" || s === "declined" || s === "cancelled") {
    return s;
  }
  return "pending";
}

function hasPaymentMethod(method: string | null | undefined): boolean {
  const m = String(method ?? "").trim().toLowerCase();
  return m === "online" || m === "on_site";
}

/**
 * Phase UI : une inscription « confirmée » sans mode de paiement
 * reste en attente de confirmation joueur (engagement club).
 */
export function resolveViewerParticipationPhase(
  row: MatchParticipantRow | null | undefined,
): ViewerParticipationPhase {
  if (!row) return "none";

  const status = normalizeMatchParticipantStatus(row.status);
  if (status === "declined" || status === "cancelled") return "none";

  if (status === "pending") return "pending";

  if (status === "confirmed") {
    return hasPaymentMethod(row.payment_method) ? "confirmed" : "pending";
  }

  return "pending";
}

/** Place active sur le match (réservée ou confirmée avec engagement). */
export function isActiveMatchParticipantRow(row: MatchParticipantRow): boolean {
  return resolveViewerParticipationPhase(row) !== "none";
}

/** @deprecated Préférer isActiveMatchParticipantRow avec payment_method. */
export function isActiveMatchParticipant(status: string | null | undefined): boolean {
  const s = normalizeMatchParticipantStatus(status);
  return s === "pending" || s === "confirmed";
}

export function countActiveMatchParticipants(rows: MatchParticipantRow[]): number {
  return rows.filter((row) => isActiveMatchParticipantRow(row)).length;
}

export function resolveSharePrice(
  row: MatchParticipantRow | null | undefined,
  matchPricePerPlayer: number,
): number {
  const rowPrice = Number(row?.share_price);
  if (Number.isFinite(rowPrice) && rowPrice > 0) return rowPrice;
  const matchPrice = Number(matchPricePerPlayer);
  return Number.isFinite(matchPrice) && matchPrice > 0 ? matchPrice : 0;
}
