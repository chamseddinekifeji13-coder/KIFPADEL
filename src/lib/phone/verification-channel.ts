export type PhoneVerificationChannel = "instant" | "email" | "whatsapp";

function isDeployedProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Vérification téléphone — `instant` uniquement en dev local.
 * `email` : OTP par e-mail (Resend).
 * `whatsapp` : OTP WhatsApp Cloud (Meta).
 */
export function getPhoneVerificationChannel(): PhoneVerificationChannel {
  const raw = process.env.PHONE_VERIFICATION_CHANNEL?.trim().toLowerCase();
  if (raw === "email" || raw === "whatsapp") return raw;
  if (isDeployedProduction()) {
    return "email";
  }
  if (raw === "instant") return "instant";
  return "instant";
}

/** Le mode instantané (sans OTP) est interdit en production déployée. */
export function isInstantPhoneVerificationAllowed(): boolean {
  return !isDeployedProduction();
}
export function isOtpPhoneVerificationChannel(channel: PhoneVerificationChannel): boolean {
  return channel === "email" || channel === "whatsapp";
}
