import { fetchPlayers, fetchPlayerById, fetchTopRivals } from "./repository";

/**
 * Service to handle player and profile related business logic.
 */
export const playerService = {
  /**
   * Retrieves a list of players, optionally filtered by a search query.
   */
  async getPlayers(query?: string, options?: { excludeUserId?: string }) {
    return fetchPlayers(query, options);
  },

  /**
   * Retrieves a single player profile by their user ID.
   */
  async getPlayerProfile(userId: string) {
    return fetchPlayerById(userId);
  },

  /**
   * Retrieves most encountered opponents for the player.
   */
  async getTopRivals(userId: string, limit = 3) {
    return fetchTopRivals(userId, limit);
  },
};
