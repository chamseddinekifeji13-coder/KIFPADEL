import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { isUuidString } from "@/lib/uuid-utils";

/** Chemin liste des clubs pour réserver. */
export function bookListingPath(locale: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return `/${loc}/book`;
}

/** Lien vers la réservation d’un club ; retombe sur la liste si l’id est invalide. */
export function clubBookPath(locale: string, clubId: string | null | undefined): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const id = decodeURIComponent(String(clubId ?? "").trim());
  if (!isUuidString(id)) return bookListingPath(loc);
  return `/${loc}/book/${id}`;
}

/**
 * Nettoie le paramètre `next` après connexion : rejette les liens /book/… avec un faux UUID
 * (ex. texte de documentation &lt;uuid-club&gt;).
 */
export function sanitizeAuthNextPath(
  rawNext: string | null | undefined,
  locale: string,
  fallbackPath?: string,
): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const fallback = fallbackPath ?? `/${loc}/profile`;
  const next = String(rawNext ?? "").trim();

  if (!next.startsWith("/") || next.startsWith("//")) return fallback;

  const bookSegment = next.match(/^\/(fr|en)\/book\/([^/?#]+)/i);
  if (bookSegment) {
    const clubId = decodeURIComponent(bookSegment[2]);
    if (!isUuidString(clubId)) {
      return `/${bookSegment[1].toLowerCase()}/book?invalidClubLink=1`;
    }
  }

  return next;
}

/** Chemin invitations paiement partagé pour une réservation. */
export function bookingInvitesPath(locale: string, bookingId: string): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return `/${loc}/bookings/${bookingId}/invites`;
}

/** Chemin liste des réservations joueur. */
export function playerBookingsPath(locale: string, query?: Record<string, string>): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const base = `/${loc}/bookings`;
  if (!query || Object.keys(query).length === 0) return base;
  return `${base}?${new URLSearchParams(query).toString()}`;
}

/** Page joueurs avec contexte d'invitation créneau. */
export function findPlayersBookingInvitePath(
  locale: string,
  bookingId: string,
  clubName: string,
  sharePrice: number,
  inviteId?: string,
): string {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const params = new URLSearchParams({
    bookingId,
    clubName,
    sharePrice: String(sharePrice),
  });
  if (inviteId) params.set("inviteId", inviteId);
  return `/${loc}/find-players?${params.toString()}`;
}

/** Affichage prix réservation (devise unique). */
export function formatBookingPrice(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `${Number(amount).toFixed(0)} DT`;
}
