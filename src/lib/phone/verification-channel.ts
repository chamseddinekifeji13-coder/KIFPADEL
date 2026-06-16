export type PhoneVerificationChannel = "instant" | "email" | "whatsapp";

/**
 * Vérification téléphone — par défaut `instant` (gratuit, sans OTP Meta).
 * `email` : OTP par e-mail (Resend, palier gratuit).
 * `whatsapp` : OTP WhatsApp Cloud (coût Meta par message).
 */
export function getPhoneVerificationChannel(): PhoneVerificationChannel {
  const raw = process.env.PHONE_VERIFICATION_CHANNEL?.trim().toLowerCase();
  if (raw === "email" || raw === "whatsapp") return raw;
  return "instant";
}

export function isOtpPhoneVerificationChannel(channel: PhoneVerificationChannel): boolean {
  return channel === "email" || channel === "whatsapp";
}
