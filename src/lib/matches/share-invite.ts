/** Partage ou copie le lien d’un match pour inviter un joueur. */
export async function shareMatchInviteLink(
  locale: string,
  matchId: string,
  inviteName: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const url = `${window.location.origin}/${locale}/matches/${matchId}`;
  const greeting = inviteName.trim() || "Joueur";
  const text = `Salut ${greeting}, viens jouer avec moi sur Kifpadel !`;
  const payload = `${text} ${url}`;

  if (shouldTryNativeShare(url)) {
    try {
      await navigator.share({ title: "Kifpadel", text, url });
      return;
    } catch {
      /* annulé, refusé ou picker OS défaillant (Windows desktop) */
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return;
    } catch {
      /* fallback */
    }
  }

  window.prompt("Copiez ce lien et envoyez-le à votre partenaire :", url);
}

function shouldTryNativeShare(url: string): boolean {
  if (typeof navigator.share !== "function") return false;

  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return false;

  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({ url });
    } catch {
      return false;
    }
  }

  return true;
}
