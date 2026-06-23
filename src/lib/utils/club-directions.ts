/**
 * Deep links toward external maps apps — no API key needed.
 */

export type ClubDirectionsInput = {
  name: string;
  city: string;
  /** Full street address, or `latitude, longitude` for GPS-precise directions. */
  address?: string | null;
  country?: string;
};

/** Parses `35.8256, 10.6084` style coordinates from the address field. */
export function parseLatLngFromAddress(raw: string | null | undefined): { lat: number; lng: number } | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/** Human-readable destination for map search / directions */
export function formatClubDirectionsQuery(input: ClubDirectionsInput): string {
  const coords = parseLatLngFromAddress(input.address);
  if (coords) {
    return `${coords.lat},${coords.lng}`;
  }

  const country = input.country?.trim() || "Tunisie";
  const addr = input.address?.trim();
  if (addr) {
    return `${addr}, ${input.city}, ${country}`;
  }
  return `${input.name}, ${input.city}, ${country}`;
}

/** Google Maps: turn-by-turn from current location (mobile opens the app when installed). */
export function buildGoogleMapsDirectionsUrl(input: ClubDirectionsInput): string {
  const coords = parseLatLngFromAddress(input.address);
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }

  const q = encodeURIComponent(formatClubDirectionsQuery(input));
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/** Apple Maps (handy on iOS). */
export function buildAppleMapsDirectionsUrl(input: ClubDirectionsInput): string {
  const coords = parseLatLngFromAddress(input.address);
  if (coords) {
    return `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}`;
  }

  const q = encodeURIComponent(formatClubDirectionsQuery(input));
  return `https://maps.apple.com/?daddr=${q}`;
}
