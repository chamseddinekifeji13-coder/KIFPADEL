import { sendTransactionalEmail } from "@/modules/notifications/email-resend";

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmailOtpMessage(email: string, code: string): Promise<SendResult> {
  const subject = "Code de vérification Kifpadel";
  const text = `Votre code Kifpadel : ${code}\n\nValable ${process.env.PHONE_OTP_EXPIRY_MINUTES ?? "10"} minutes.`;
  const html = `
    <p>Votre code de vérification Kifpadel :</p>
    <p style="font-size:28px;font-weight:bold;font-family:monospace">${code}</p>
    <p style="color:#666;font-size:13px">Ne partagez ce code avec personne.</p>
  `;

  const result = await sendTransactionalEmail({ to: email, subject, html, text });

  if (!result.ok && process.env.NODE_ENV !== "production") {
    console.info(`[phone-verification:dev] email OTP → ${email}: ${code}`);
    return { ok: true };
  }

  if (!result.ok) {
    return {
      ok: false,
      error: "Impossible d'envoyer le code par e-mail. Réessayez ou contactez le support.",
    };
  }

  return { ok: true };
}
