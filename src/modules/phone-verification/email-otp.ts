import { sendTransactionalEmail } from "@/modules/notifications/email-resend";
import { buildOtpEmailContent } from "@/modules/notifications/kifpadel-email-template";
import type { EmailLocale } from "@/modules/notifications/kifpadel-email-template";

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmailOtpMessage(
  email: string,
  code: string,
  options?: { recipientName?: string | null; locale?: EmailLocale },
): Promise<SendResult> {
  const { subject, html, text } = buildOtpEmailContent({
    code,
    locale: options?.locale,
    recipientName: options?.recipientName,
  });

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
