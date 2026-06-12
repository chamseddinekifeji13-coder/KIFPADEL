const TUNIS_TZ = "Africa/Tunis";

export function formatBookingSchedule(
  startsAt: string,
  endsAt: string,
  locale: "fr" | "en" = "fr",
): { dateLine: string; timeRange: string } {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const loc = locale === "en" ? "en-GB" : "fr-FR";

  const dateLine = new Intl.DateTimeFormat(loc, {
    timeZone: TUNIS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat(loc, {
    timeZone: TUNIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    dateLine,
    timeRange: `${timeFmt.format(start)}–${timeFmt.format(end)}`,
  };
}

export function formatPaymentMethodLabel(
  paymentMethod: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const m = String(paymentMethod ?? "").toLowerCase();
  if (m === "online") {
    return locale === "en" ? "Online (pending)" : "En ligne (en attente)";
  }
  return locale === "en" ? "At the club" : "Sur place au club";
}

export function formatAmountDt(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
