/**
 * Deep links toward external maps apps — no API key needed.
 */

export type ClubDirectionsInput = {
  name: string;
  city: string;
  /** Full street address when available (more precise than name + city). */
  address?: string | null;
  country?: string;
};

/** Human-readable destination for map search / directions */
export function formatClubDirectionsQuery(input: ClubDirectionsInput): string {
  const country = input.country?.trim() || "Tunisie";
  const addr = input.address?.trim();
  if (addr) {
    return `${addr}, ${input.city}, ${country}`;
  }
  return `${input.name}, ${input.city}, ${country}`;
}

/** Google Maps: turn-by-turn from current location (mobile opens the app when installed). */
export function buildGoogleMapsDirectionsUrl(input: ClubDirectionsInput): string {
  const q = encodeURIComponent(formatClubDirectionsQuery(input));
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/** Apple Maps (handy on iOS). */
export function buildAppleMapsDirectionsUrl(input: ClubDirectionsInput): string {
  const q = encodeURIComponent(formatClubDirectionsQuery(input));
  return `https://maps.apple.com/?daddr=${q}`;
}
