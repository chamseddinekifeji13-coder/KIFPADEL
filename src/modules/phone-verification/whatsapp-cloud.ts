type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Envoi OTP via WhatsApp Cloud API (Meta).
 * Coût typiquement inférieur au SMS en Tunisie ; nécessite un template d’authentification approuvé.
 *
 * Docs : https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export async function sendWhatsAppOtpMessage(phoneE164: string, code: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim() ?? "kifpadel_otp";
  const templateLanguage = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim() ?? "fr";

  const toDigits = phoneE164.replace(/\D/g, "");

  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[phone-verification:dev] WhatsApp OTP ${phoneE164}: ${code}`);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        "Vérification WhatsApp non configurée sur le serveur. Contactez le support Kifpadel.",
    };
  }

  const body = {
    messaging_product: "whatsapp",
    to: toDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[whatsapp-cloud] send failed", res.status, detail);
      return {
        ok: false,
        error: "Impossible d'envoyer le code WhatsApp. Réessayez dans quelques minutes.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[whatsapp-cloud] network error", err);
    return { ok: false, error: "Réseau indisponible pour WhatsApp. Réessayez." };
  }
}

export function isWhatsAppVerificationConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}
