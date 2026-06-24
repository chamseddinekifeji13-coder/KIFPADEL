/** Version courante de la charte club (incrémenter à chaque mise à jour substantielle). */
export const CURRENT_CLUB_TERMS_VERSION = "2026-06-01";

export function isAcceptedClubTermsVersion(version: string | null | undefined): boolean {
  return String(version ?? "").trim() === CURRENT_CLUB_TERMS_VERSION;
}
