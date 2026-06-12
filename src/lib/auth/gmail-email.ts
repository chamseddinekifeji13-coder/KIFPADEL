/** Domaines Google consumer acceptés pour l'inscription (OAuth Gmail). */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isGmailAddress(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return false;
  return GMAIL_DOMAINS.has(normalized.slice(at + 1));
}
