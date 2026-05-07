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
