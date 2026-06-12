/** Entiers >= 0 depuis un champ formulaire (nombre de terrains). */
export function parseNonNegativeInt(raw: FormDataEntryValue | null | undefined): number {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (s === "") return 0;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Chaîne optionnelle trim, null si vide */
export function optionalTrimmedString(raw: FormDataEntryValue | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  return s.length > 0 ? s : null;
}

/** Montant strictement positif (DT) ou null si vide / invalide. */
export function parsePositiveMoneyOrNull(raw: FormDataEntryValue | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}
