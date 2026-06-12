import {
  isWhatsAppCloudConfigured,
  sendWhatsAppTemplate,
} from "@/modules/notifications/whatsapp";

type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Envoi OTP via WhatsApp Cloud API (Meta).
 */
export async function sendWhatsAppOtpMessage(phoneE164: string, code: string): Promise<SendResult> {
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim() ?? "kifpadel_otp";
  const templateLanguage = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim() ?? "fr";

  const result = await sendWhatsAppTemplate(phoneE164, templateName, templateLanguage, [code]);

  if (!result.ok && process.env.NODE_ENV !== "production") {
    console.info(`[phone-verification:dev] WhatsApp OTP ${phoneE164}: ${code}`);
    return { ok: true };
  }

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "WhatsApp non configuré sur le serveur."
          ? "Vérification WhatsApp non configurée sur le serveur. Contactez le support Kifpadel."
          : "Impossible d'envoyer le code WhatsApp. Réessayez dans quelques minutes.",
    };
  }

  return { ok: true };
}

export function isWhatsAppVerificationConfigured(): boolean {
  return isWhatsAppCloudConfigured();
}
