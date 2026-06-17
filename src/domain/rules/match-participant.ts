export type MatchParticipantStatus = "pending" | "confirmed" | "declined" | "cancelled";

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
  return "confirmed";
}

/** Place active sur le match (réservée ou confirmée). */
export function isActiveMatchParticipant(status: string | null | undefined): boolean {
  const s = normalizeMatchParticipantStatus(status);
  return s === "pending" || s === "confirmed";
}

export function countActiveMatchParticipants(rows: MatchParticipantRow[]): number {
  return rows.filter((row) => isActiveMatchParticipant(row.status)).length;
}
