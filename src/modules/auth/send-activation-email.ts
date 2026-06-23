import { publicEnv } from "@/lib/config/env";
import { sanitizeAuthNextPath } from "@/lib/booking-paths";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isResendConfigured, sendTransactionalEmail } from "@/modules/notifications/email-resend";
import { buildKifpadelEmailHtml, escapeHtml } from "@/modules/notifications/kifpadel-email-template";

export type SendActivationEmailResult = { ok: true } | { ok: false; error: string };

function buildConfirmEmailRedirect(locale: string, nextPath: string): string {
  return `${publicEnv.siteUrl}/${locale}/auth/confirm-email?next=${encodeURIComponent(nextPath)}`;
}

function buildActivationEmailHtml(locale: string, email: string, confirmUrl: string): string {
  const isEn = locale === "en";
  return buildKifpadelEmailHtml({
    locale: isEn ? "en" : "fr",
    title: isEn ? "Welcome to Kifpadel" : "Bienvenue sur Kifpadel",
    preheader: isEn ? "Confirm your email to get started" : "Confirmez votre e-mail pour commencer",
    bodyHtml: isEn
      ? `<p style="margin:0 0 16px;">Confirm your email address <strong style="color:#f5f5f5;">${escapeHtml(email)}</strong> to activate your account and book padel courts in Tunisia.</p>
         <p style="margin:0;font-size:13px;color:#666;">If you did not create an account, you can ignore this email.</p>`
      : `<p style="margin:0 0 16px;">Confirmez votre adresse e-mail <strong style="color:#f5f5f5;">${escapeHtml(email)}</strong> pour activer votre compte et réserver des terrains de padel en Tunisie.</p>
         <p style="margin:0;font-size:13px;color:#666;">Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>`,
    cta: {
      label: isEn ? "Confirm my email" : "Confirmer mon e-mail",
      href: confirmUrl,
    },
  });
}

/**
 * Envoie le lien d'activation via Resend (fiable en prod).
 * Supabase Auth génère le lien ; Resend assure la délivrabilité.
 */
export async function sendActivationEmailViaResend(input: {
  email: string;
  locale: string;
  next?: string;
}): Promise<SendActivationEmailResult> {
  const email = input.email.trim().toLowerCase();
  const locale = input.locale.trim() || "fr";
  const safeNext = sanitizeAuthNextPath(input.next, locale, `/${locale}/onboarding`);

  if (!email) {
    return { ok: false, error: "E-mail invalide." };
  }

  if (!isResendConfigured()) {
    console.error("[sendActivationEmailViaResend] Resend non configuré");
    return { ok: false, error: "E-mail transactionnel non configuré." };
  }

  const admin = createSupabaseAdminClient();
  const redirectTo = buildConfirmEmailRedirect(locale, safeNext);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[sendActivationEmailViaResend] generateLink failed", error?.message);
    return { ok: false, error: "Impossible de générer le lien d'activation." };
  }

  const confirmUrl = data.properties.action_link;
  const subject =
    locale === "en" ? "Confirm your Kifpadel account" : "Confirmez votre compte Kifpadel";
  const html = buildActivationEmailHtml(locale, email, confirmUrl);
  const text =
    locale === "en"
      ? `Confirm your Kifpadel account: ${confirmUrl}`
      : `Confirmez votre compte Kifpadel : ${confirmUrl}`;

  const sent = await sendTransactionalEmail({ to: email, subject, html, text });
  if (!sent.ok) {
    console.error("[sendActivationEmailViaResend] Resend failed", sent.error);
    return { ok: false, error: sent.error };
  }

  return { ok: true };
}
