import { publicEnv } from "@/lib/config/env";
import { OTP_EXPIRY_MINUTES } from "@/lib/phone/otp-crypto";

/** Couleurs fixes (compatibles clients mail — pas de oklch). */
const BRAND = {
  gold: "#D4AF37",
  goldDark: "#B8941F",
  bg: "#0a0a0a",
  surface: "#141414",
  text: "#f5f5f5",
  muted: "#9ca3af",
  border: "#2a2a2a",
} as const;

export type EmailLocale = "fr" | "en";

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function firstName(displayName?: string | null): string | null {
  const trimmed = displayName?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function buildGreeting(locale: EmailLocale, displayName?: string | null): string {
  const name = firstName(displayName);
  if (locale === "en") {
    return name ? `Hi ${escapeHtml(name)},` : "Hi,";
  }
  return name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";
}

export type KifpadelEmailInput = {
  locale?: EmailLocale;
  title: string;
  preheader?: string;
  greetingLine?: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
};

export function buildKifpadelEmailHtml(input: KifpadelEmailInput): string {
  const locale = input.locale ?? "fr";
  const siteUrl = publicEnv.siteUrl;
  const logoUrl = `${siteUrl}/logo.png`;
  const supportUrl = `${siteUrl}/${locale}/support`;
  const preheader = escapeHtml(input.preheader ?? input.title);
  const title = escapeHtml(input.title);
  const greeting = input.greetingLine ?? buildGreeting(locale);
  const footerTagline =
    locale === "en" ? "Book padel courts across Tunisia." : "Réservez des terrains de padel en Tunisie.";
  const supportLabel = locale === "en" ? "Help & support" : "Aide & support";
  const autoMsg =
    locale === "en"
      ? "This is an automated message from Kifpadel. Please do not reply to this email."
      : "Message automatique Kifpadel — merci de ne pas répondre à cet e-mail.";

  const ctaBlock = input.cta
    ? `
      <tr>
        <td style="padding:28px 32px 8px;text-align:center;">
          <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:linear-gradient(135deg,${BRAND.gold} 0%,${BRAND.goldDark} 100%);color:#000000;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;letter-spacing:0.04em;">
            ${escapeHtml(input.cta.label)}
          </a>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.gold} 0%,${BRAND.goldDark} 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid ${BRAND.border};">
              <img src="${logoUrl}" alt="Kifpadel" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;" />
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.gold};">Kifpadel</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${BRAND.text};">${title}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.text};">${greeting}</p>
              <div style="font-size:15px;line-height:1.65;color:${BRAND.muted};">${input.bodyHtml}</div>
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid ${BRAND.border};text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">${footerTagline}</p>
              <p style="margin:0 0 12px;font-size:13px;">
                <a href="${siteUrl}" style="color:${BRAND.gold};text-decoration:none;font-weight:600;">kifpadel.tn</a>
                &nbsp;·&nbsp;
                <a href="${supportUrl}" style="color:${BRAND.gold};text-decoration:none;">${supportLabel}</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#666666;">${autoMsg}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDetailListHtml(
  items: ReadonlyArray<{ label: string; value: string }>,
): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.muted};vertical-align:top;width:38%;">${escapeHtml(item.label)}</td>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.text};font-weight:600;vertical-align:top;">${escapeHtml(item.value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 8px;background-color:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:4px 16px;">${rows}</table>`;
}

export function buildOtpEmailContent(input: {
  code: string;
  locale?: EmailLocale;
  recipientName?: string | null;
  expiryMinutes?: number;
}): { subject: string; html: string; text: string } {
  const locale = input.locale ?? "fr";
  const expiry = input.expiryMinutes ?? OTP_EXPIRY_MINUTES;
  const code = escapeHtml(input.code);
  const greetingLine = buildGreeting(locale, input.recipientName);

  const subject =
    locale === "en" ? "Your Kifpadel verification code" : "Votre code de vérification Kifpadel";

  const bodyHtml =
    locale === "en"
      ? `<p style="margin:0 0 20px;">Use this code to verify your phone number and unlock court bookings:</p>
         <div style="text-align:center;margin:24px 0;">
           <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:0.35em;font-family:ui-monospace,Consolas,monospace;color:${BRAND.gold};background-color:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:16px 24px;">${code}</span>
         </div>
         <p style="margin:0 0 8px;">Valid for <strong style="color:${BRAND.text};">${expiry} minutes</strong>.</p>
         <p style="margin:0;font-size:13px;">Never share this code. Kifpadel will never ask for it by phone or message.</p>`
      : `<p style="margin:0 0 20px;">Utilisez ce code pour confirmer votre numéro et débloquer les réservations :</p>
         <div style="text-align:center;margin:24px 0;">
           <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:0.35em;font-family:ui-monospace,Consolas,monospace;color:${BRAND.gold};background-color:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:16px 24px;">${code}</span>
         </div>
         <p style="margin:0 0 8px;">Valable <strong style="color:${BRAND.text};">${expiry} minutes</strong>.</p>
         <p style="margin:0;font-size:13px;">Ne partagez jamais ce code. Kifpadel ne vous le demandera jamais par téléphone.</p>`;

  const html = buildKifpadelEmailHtml({
    locale,
    title: locale === "en" ? "Verification code" : "Code de vérification",
    preheader: locale === "en" ? `Your code: ${input.code}` : `Votre code : ${input.code}`,
    greetingLine,
    bodyHtml,
  });

  const text =
    locale === "en"
      ? `${greetingLine.replace(/<[^>]+>/g, "")}\n\nYour Kifpadel code: ${input.code}\nValid ${expiry} minutes.\n\nhttps://www.kifpadel.tn`
      : `${greetingLine.replace(/<[^>]+>/g, "")}\n\nVotre code Kifpadel : ${input.code}\nValable ${expiry} minutes.\n\nhttps://www.kifpadel.tn`;

  return { subject, html, text };
}
