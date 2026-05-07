/**
 * Texte court pour les cartes club (liste, réserver…).
 */
export function formatClubCourtsSummary(
  indoor: number,
  outdoor: number,
  locale: string,
): string | null {
  const inC = Math.max(0, Math.floor(indoor));
  const outC = Math.max(0, Math.floor(outdoor));
  if (inC === 0 && outC === 0) return null;
  const en = locale === "en";
  const parts: string[] = [];
  if (inC > 0) {
    parts.push(
      en
        ? `${inC} indoor court${inC > 1 ? "s" : ""}`
        : `${inC} terrain${inC > 1 ? "s" : ""} couvert${inC > 1 ? "s" : ""}`,
    );
  }
  if (outC > 0) {
    parts.push(
      en
        ? `${outC} outdoor court${outC > 1 ? "s" : ""}`
        : `${outC} extérieur${outC > 1 ? "s" : ""}`,
    );
  }
  return parts.join(" · ");
}
