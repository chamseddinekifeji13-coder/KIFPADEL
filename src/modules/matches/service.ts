import { fetchOpenMatches, fetchOpenMatchesByClub } from "./repository";

/**
 * Service to handle match business logic.
 */
export const matchService = {
  /**
   * Retrieves all currently open matches across all clubs.
   */
  async getOpenMatches() {
    return fetchOpenMatches();
  },

  /**
   * Retrieves open matches for a specific club.
   */
  async getOpenMatchesByClub(clubId: string) {
    return fetchOpenMatchesByClub(clubId);
  },
};
