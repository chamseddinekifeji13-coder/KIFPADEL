import { addTrustEvent } from "./repository";

function manualTrustEventKind(
  type: "Positive" | "Negative" | "System",
  reason: string,
): string {
  const safe = reason.replace(/\s+/g, " ").trim().slice(0, 120);
  return `manual_${type.toLowerCase()}:${safe || "unspecified"}`;
}

/**
 * Service for trust-score events (distinct from sport / ELO rating).
 */
export const trustService = {
  /**
   * @deprecated Unused in app flows; prefer club actions or addTrustEvent with a concrete `kind`.
   */
  async processTrustEvent(
    playerId: string,
    delta: number,
    type: "Positive" | "Negative" | "System",
    reason: string,
  ) {
    await addTrustEvent({
      player_id: playerId,
      kind: manualTrustEventKind(type, reason),
      delta,
    });
  },
};
