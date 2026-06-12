import { normalizeTunisiaPhoneToE164 } from "@/lib/phone/normalize-tunisia";

/** Numéro exploitable par WhatsApp Cloud API (E.164). */
export function resolveWhatsAppTarget(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const tunisia = normalizeTunisiaPhoneToE164(trimmed);
  if (tunisia) return tunisia;

  if (trimmed.startsWith("+")) {
    return trimmed.replace(/\s/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}
