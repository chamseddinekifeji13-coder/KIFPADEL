import { fetchClubs, fetchClubById, fetchManagedClubForUser } from "./repository";

/**
 * Service to handle club related business logic.
 */
export const clubService = {
  /**
   * Retrieves a list of all active clubs.
   */
  async getClubs(city?: string) {
    return fetchClubs(city);
  },

  /**
   * Retrieves detail about a specific club.
   */
  async getClubDetails(id: string) {
    return fetchClubById(id);
  },

  async getManagedClub(userId: string) {
    return fetchManagedClubForUser(userId);
  },
};
