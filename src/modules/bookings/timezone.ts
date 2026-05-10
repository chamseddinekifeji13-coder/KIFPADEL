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
  const [hourRaw, minuteRaw = "0"] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return { hour, minute };
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
  return new Intl.DateTimeFormat("fr-TN", {
    timeZone: TUNIS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTunisYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TUNIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format Tunis date.");
  }

  return `${year}-${month}-${day}`;
}
