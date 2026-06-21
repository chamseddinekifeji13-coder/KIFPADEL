export type EmailSendResult = { ok: true } | { ok: false; error: string };

/** Vercel CLI / PowerShell peuvent injecter des \\r\\n dans les secrets — casse l'auth Resend. */
function cleanEnvSecret(value: string | undefined): string {
  return value?.replace(/[\r\n\u0000-\u001F\u007F]+/g, "").trim() ?? "";
}

function cleanEnvLine(value: string | undefined): string {
  return value?.replace(/[\r\n]+/g, "").trim() ?? "";
}

export function isResendConfigured(): boolean {
  return Boolean(cleanEnvSecret(process.env.RESEND_API_KEY) && cleanEnvLine(process.env.RESEND_FROM_EMAIL));
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailSendResult> {
  const apiKey = cleanEnvSecret(process.env.RESEND_API_KEY);
  const fromRaw = cleanEnvLine(process.env.RESEND_FROM_EMAIL);
  const from =
    fromRaw && !fromRaw.includes("<") ? `Kifpadel <${fromRaw}>` : fromRaw;

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
