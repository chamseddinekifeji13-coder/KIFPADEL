import type { Gender } from "@/domain/types/core";
import { fetchOpenMatches, fetchOpenMatchesByClub } from "./repository";

/**
 * Service to handle match business logic.
 */
export const matchService = {
  /**
   * Retrieves currently open matches visible to this viewer (gender filters listing).
   */
  async getOpenMatches(viewerGender: Gender | null = null) {
    return fetchOpenMatches(viewerGender);
  },

  /**
   * Retrieves open matches for a specific club, visibility by viewer gender.
   */
  async getOpenMatchesByClub(clubId: string, viewerGender: Gender | null = null) {
    return fetchOpenMatchesByClub(clubId, viewerGender);
  },
};
