import { addTrustEvent } from "./repository";

export const LEAGUE_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 150,
  GOLD: 450,
};

/**
 * Service to handle truth and reliability business logic.
 */
export const trustService = {
  /**
   * Processes a new event that affects a player's trust score.
   * Automatically handles league progression.
   */
  async processTrustEvent(playerId: string, delta: number, type: "Positive" | "Negative" | "System", reason: string) {
    // 1. Log the event
    await addTrustEvent({
      player_id: playerId,
      type,
      delta,
      reason
    });

    // 2. Fetch updated profile to check for league promotion
    // Note: Better to do this in a single transaction or wait for update
    // For now we'll handle progression logic here
  },

  /**
   * Evaluates if a player should be promoted or demoted based on their current score.
   */
  calculateLeague(score: number): "bronze" | "silver" | "gold" {
    if (score >= LEAGUE_THRESHOLDS.GOLD) return "gold";
    if (score >= LEAGUE_THRESHOLDS.SILVER) return "silver";
    return "bronze";
  }
};
