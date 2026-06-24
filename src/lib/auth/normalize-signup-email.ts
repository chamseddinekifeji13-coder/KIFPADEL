/** Nettoie email saisi / autocomplété iOS (espaces insécables, zero-width). */
export function normalizeSignupEmail(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff\u00a0\u202f\u2060]/g, "")
    .replace(/\s+/g, "");
}
