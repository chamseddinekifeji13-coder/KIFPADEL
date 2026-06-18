/**
 * Valide une URL externe pour affichage (liens sponsors, logos).
 * Autorise uniquement http(s) — bloque javascript:, data:, etc.
 */
export function sanitizeHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.length) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  return parsed.toString();
}
