const INVISIBLE_CHARS = /[\u200b-\u200d\ufeff\u00a0\u202f\u2060]/g;

/** Nettoie email saisi / autocomplété iOS (espaces insécables, zero-width). */
export function normalizeSignupEmail(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, "");
}

/** Nettoie mot de passe saisi / autocomplété iOS (retours ligne, zero-width). */
export function normalizeSignupPassword(raw: string): string {
  return raw.normalize("NFKC").replace(INVISIBLE_CHARS, "").trim();
}
