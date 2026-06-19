/** Partage ou copie un lien de paiement partagé pour une place réservée. */
export async function shareBookingInviteLink(
  url: string,
  sharePrice: number,
  clubName: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const text = `Rejoins mon créneau padel chez ${clubName} sur Kifpadel — ta part : ${sharePrice} DT`;
  const payload = `${text}\n${url}`;

  if (shouldTryNativeShare(url)) {
    try {
      await navigator.share({ title: "Kifpadel — Paiement partagé", text, url });
      return;
    } catch {
      /* annulé */
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

  window.prompt("Copie ce lien et envoie-le à ton partenaire :", url);
}

function shouldTryNativeShare(url: string): boolean {
  if (typeof navigator.share !== "function") return false;
  const ua = navigator.userAgent;
  if (!/Android|iPhone|iPad|iPod/i.test(ua)) return false;
  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({ url });
    } catch {
      return false;
    }
  }
  return true;
}
