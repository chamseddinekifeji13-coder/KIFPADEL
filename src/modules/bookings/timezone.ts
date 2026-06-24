import { DEFAULT_BOOKING_DURATION_MINUTES } from "@/modules/bookings/constants";

const TUNIS_TIME_ZONE = "Africa/Tunis";
const TUNIS_OFFSET_MINUTES = 60; // UTC+1 for Tunisia.

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${date}`);
  }
  return { year, month, day };
}

function parseTimeParts(time: string) {
  const trimmed = time.trim().replace(/\u202f/g, " ").replace(/\s+/g, " ");

  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute };
    }
  }

  const hMatch = trimmed.match(/^(\d{1,2})\s*h\s*(\d{1,2})$/i);
  if (hMatch) {
    const hour = Number(hMatch[1]);
    const minute = Number(hMatch[2]);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute };
    }
  }

  throw new Error(`Invalid time format: ${time}`);
}

/** Affichage / parsing stable (évite les variantes Intl selon l’appareil). */
export function normalizeTimeHm(raw: string): string {
  const { hour, minute } = parseTimeParts(raw);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function tunisLocalDateTimeToUtc(date: string, time: string) {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, 0, 0) -
    TUNIS_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMs);
}

export function tunisDayRangeUtc(date: string) {
  const dayStart = tunisLocalDateTimeToUtc(date, "00:00");
  const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, nextDayStart };
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function formatTunisHm(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TUNIS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/** Libellé court (barre de réservation). */
export function formatBookingDateShort(dateYmd: string, locale: string): string {
  const { year, month, day } = parseDateParts(dateYmd);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return utc.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Libellé date réservation sans parser ISO ambigu côté client (Safari). */
export function formatBookingDateLabel(dateYmd: string, locale: string): string {
  const { year, month, day } = parseDateParts(dateYmd);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return utc.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Date calendaire (YYYY-MM-DD) en fuseau Tunis — pour filtres club / réservation. */
export function formatTunisYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TUNIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Créneau réservation aligné sur la grille (heure Tunis → ISO UTC). */
export function buildTunisSlotTimestamps(
  dateYmd: string,
  timeHm: string,
  durationMinutes: number,
): { startsAtIso: string; endsAtIso: string } {
  const normalizedTime = normalizeTimeHm(timeHm);
  const startsAt = tunisLocalDateTimeToUtc(dateYmd, normalizedTime);
  const duration =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : DEFAULT_BOOKING_DURATION_MINUTES;
  const endsAt = addMinutes(startsAt, duration);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("INVALID_SLOT_RANGE");
  }

  return { startsAtIso: startsAt.toISOString(), endsAtIso: endsAt.toISOString() };
}
