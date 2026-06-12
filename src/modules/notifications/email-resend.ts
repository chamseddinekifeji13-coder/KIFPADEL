export type EmailSendResult = { ok: true } | { ok: false; error: string };

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[notifications:dev] email → ${input.to}: ${input.subject}`);
      return { ok: true };
    }
    return { ok: false, error: "E-mail transactionnel non configuré." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[notifications/email] resend failed", res.status, detail);
      return { ok: false, error: "Échec envoi e-mail." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[notifications/email] network error", err);
    return { ok: false, error: "Réseau indisponible pour l'e-mail." };
  }
}
