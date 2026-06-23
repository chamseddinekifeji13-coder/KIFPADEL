const activeInviteKey = (bookingId: string) => `booking-invites-active:${bookingId}`;

export { findPlayersBookingInvitePath as buildFindPlayersInviteHref } from "@/lib/booking-paths";
export function setActiveBookingInvite(bookingId: string, inviteId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(activeInviteKey(bookingId), inviteId);
}

export function getActiveBookingInviteId(bookingId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(activeInviteKey(bookingId));
}

/** Copie l'URL d'invitation dans le presse-papiers. */
export async function copyBookingInviteUrl(url: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      /* fallback */
    }
  }

  window.prompt("Copiez ce lien et envoyez-le à votre partenaire :", url);
  return true;
}

/** Partage ou copie un lien de paiement partagé pour une place réservée. */
export async function shareBookingInviteLink(
  url: string,
  sharePrice: number,
  clubName: string,
  partnerName?: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const greeting = partnerName?.trim();
  const text = greeting
    ? `Salut ${greeting}, rejoins mon créneau padel chez ${clubName} sur Kifpadel — ta part : ${sharePrice} DT`
    : `Rejoins mon créneau padel chez ${clubName} sur Kifpadel — ta part : ${sharePrice} DT`;
  const payload = `${text}\n${url}`;

  if (shouldTryNativeShare(url)) {
    try {
      await navigator.share({ title: "Kifpadel — Paiement partagé", text, url });
      return true;
    } catch {
      /* annulé */
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch {
      /* fallback */
    }
  }

  window.prompt("Copiez ce lien et envoyez-le à votre partenaire :", url);
  return true;
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
