/** Partage ou copie le lien d’un match pour inviter un joueur (Web Share API sur mobile). */
export async function shareMatchInviteLink(
  locale: string,
  matchId: string,
  inviteName: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const url = `${window.location.origin}/${locale}/matches/${matchId}`;
  const greeting = inviteName.trim() || "Joueur";
  const text = `Salut ${greeting}, viens jouer avec moi sur Kifpadel !`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Kifpadel", text, url });
      return;
    } catch {
      /* annulé ou non supporté */
    }
  }

  const payload = `${text} ${url}`;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return;
    } catch {
      /* fallback */
    }
  }

  window.prompt("Copie ce lien et envoie-le à ton partenaire :", url);
}
