/** Normalise un numéro tunisien (8 chiffres locaux) vers E.164 (+216…). */
export function normalizeTunisiaPhoneToE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("216") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 8) {
    return `+216${digits}`;
  }
  return null;
}

/** Affichage local : XX XXX XXX */
export function formatTunisiaLocalDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "").replace(/^216/, "");
  if (digits.length !== 8) return e164;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}
