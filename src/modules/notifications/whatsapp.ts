export type WhatsAppSendResult = { ok: true } | { ok: false; error: string };

function whatsAppCredentials(): { token: string; phoneNumberId: string } | null {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return null;
  }
  return { token, phoneNumberId };
}

export function isWhatsAppCloudConfigured(): boolean {
  return whatsAppCredentials() !== null;
}

/**
 * Envoi d'un template WhatsApp Cloud API (Meta).
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export async function sendWhatsAppTemplate(
  phoneE164: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[],
): Promise<WhatsAppSendResult> {
  const creds = whatsAppCredentials();
  const toDigits = phoneE164.replace(/\D/g, "");

  if (!creds) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[notifications:dev] WhatsApp template ${templateName} → ${phoneE164}: ${bodyParameters.join(" | ")}`,
      );
      return { ok: true };
    }
    return { ok: false, error: "WhatsApp non configuré sur le serveur." };
  }

  const body = {
    messaging_product: "whatsapp",
    to: toDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((text) => ({ type: "text", text: text.slice(0, 1024) })),
        },
      ],
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[notifications/whatsapp] send failed", res.status, templateName, detail);
      return { ok: false, error: "Échec envoi WhatsApp." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[notifications/whatsapp] network error", err);
    return { ok: false, error: "Réseau indisponible pour WhatsApp." };
  }
}
