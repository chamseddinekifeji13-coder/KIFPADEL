import { fetchPlayers, fetchPlayerById } from "./repository";

/**
 * Service to handle player and profile related business logic.
 */
export const playerService = {
  /**
   * Retrieves a list of players, optionally filtered by a search query.
   */
  async getPlayers(query?: string) {
    return fetchPlayers(query);
  },

  /**
   * Retrieves a single player profile by their user ID.
   */
  async getPlayerProfile(userId: string) {
    return fetchPlayerById(userId);
  },
};
