import { sendTransactionalEmail } from "@/modules/notifications/email-resend";
import { loadParticipantNotificationContext } from "@/modules/notifications/participant-context";
import { getNotificationChannels, getWhatsAppTemplateLanguage } from "@/modules/notifications/shared";
import { sendWhatsAppTemplate } from "@/modules/notifications/whatsapp";
import {
  buildDetailListHtml,
  buildGreeting,
  buildKifpadelEmailHtml,
  escapeHtml,
} from "@/modules/notifications/kifpadel-email-template";
import { publicEnv } from "@/lib/config/env";

function paymentConfirmedTemplate(): string {
  return process.env.WHATSAPP_PAYMENT_CONFIRMED_TEMPLATE?.trim() ?? "kifpadel_payment_confirmed";
}

function noShowPlayerTemplate(): string {
  return process.env.WHATSAPP_NO_SHOW_PLAYER_TEMPLATE?.trim() ?? "kifpadel_no_show_player";
}

function bookingDetailsHtml(
  locale: "fr" | "en",
  ctx: {
    clubName: string;
    dateLine: string;
    timeRange: string;
    courtLabel: string;
    seat: string;
    amount: string;
  },
): string {
  return buildDetailListHtml([
    { label: locale === "en" ? "Club" : "Club", value: ctx.clubName },
    { label: locale === "en" ? "Schedule" : "Créneau", value: `${ctx.dateLine} · ${ctx.timeRange}` },
    { label: locale === "en" ? "Court" : "Terrain", value: ctx.courtLabel },
    { label: locale === "en" ? "Seat" : "Place", value: `${ctx.seat}/4` },
    { label: locale === "en" ? "Amount" : "Montant", value: `${ctx.amount} DT` },
  ]);
}

/**
 * Joueur : encaissement validé par le club.
 */
export async function notifyParticipantPaymentConfirmed(participantId: string): Promise<void> {
  const channels = getNotificationChannels();
  if (!channels.whatsapp && !channels.email) {
    return;
  }

  const ctx = await loadParticipantNotificationContext(participantId);
  if (!ctx) {
    console.warn("[notifyParticipantPaymentConfirmed] context missing", participantId);
    return;
  }

  const { locale, clubName, playerName, dateLine, timeRange, courtLabel, amount, seat, playerPhone, playerEmail } =
    ctx;

  const subject =
    locale === "en" ? `Payment received — ${clubName}` : `Encaissement confirmé — ${clubName}`;

  const details = bookingDetailsHtml(locale, { clubName, dateLine, timeRange, courtLabel, seat, amount });
  const html = buildKifpadelEmailHtml({
    locale,
    title: locale === "en" ? "Payment confirmed" : "Encaissement confirmé",
    preheader: `${clubName} · ${amount} DT`,
    greetingLine: buildGreeting(locale, playerName),
    bodyHtml:
      locale === "en"
        ? `<p style="margin:0 0 8px;"><strong style="color:#f5f5f5;">${escapeHtml(clubName)}</strong> confirmed your payment:</p>${details}<p style="margin:16px 0 0;">Enjoy your game!</p>`
        : `<p style="margin:0 0 8px;"><strong style="color:#f5f5f5;">${escapeHtml(clubName)}</strong> a confirmé votre encaissement :</p>${details}<p style="margin:16px 0 0;">Bon match !</p>`,
    cta: {
      label: locale === "en" ? "My bookings" : "Mes réservations",
      href: `${publicEnv.siteUrl}/${locale}/bookings`,
    },
  });

  if (channels.whatsapp && playerPhone) {
    const wa = await sendWhatsAppTemplate(
      playerPhone,
      paymentConfirmedTemplate(),
      getWhatsAppTemplateLanguage(),
      [clubName, dateLine, timeRange, courtLabel, amount],
    );
    if (!wa.ok) {
      console.warn("[notifyParticipantPaymentConfirmed] WhatsApp failed", wa.error);
    }
  }

  if (channels.email && playerEmail) {
    const em = await sendTransactionalEmail({ to: playerEmail, subject, html });
    if (!em.ok) {
      console.warn("[notifyParticipantPaymentConfirmed] email failed", em.error);
    }
  }
}

/**
 * Joueur : no-show enregistré par le club.
 */
export async function notifyParticipantNoShow(participantId: string): Promise<void> {
  const channels = getNotificationChannels();
  if (!channels.whatsapp && !channels.email) {
    return;
  }

  const ctx = await loadParticipantNotificationContext(participantId);
  if (!ctx) {
    console.warn("[notifyParticipantNoShow] context missing", participantId);
    return;
  }

  const { locale, clubName, playerName, dateLine, timeRange, courtLabel, amount, seat, playerPhone, playerEmail } =
    ctx;

  const subject =
    locale === "en" ? `No-show recorded — ${clubName}` : `No-show enregistré — ${clubName}`;

  const details = bookingDetailsHtml(locale, { clubName, dateLine, timeRange, courtLabel, seat, amount });
  const html = buildKifpadelEmailHtml({
    locale,
    title: locale === "en" ? "No-show recorded" : "No-show enregistré",
    preheader: `${clubName} · ${dateLine}`,
    greetingLine: buildGreeting(locale, playerName),
    bodyHtml:
      locale === "en"
        ? `<p style="margin:0 0 8px;"><strong style="color:#f5f5f5;">${escapeHtml(clubName)}</strong> recorded a no-show for your booking:</p>${details}<p style="margin:16px 0 0;">This may affect your trust score. Contact the club if you disagree.</p>`
        : `<p style="margin:0 0 8px;"><strong style="color:#f5f5f5;">${escapeHtml(clubName)}</strong> a enregistré un no-show pour votre réservation :</p>${details}<p style="margin:16px 0 0;">Cela peut impacter votre score de confiance. Contactez le club en cas d'erreur.</p>`,
    cta: {
      label: locale === "en" ? "Contact support" : "Contacter le support",
      href: `${publicEnv.siteUrl}/${locale}/support`,
    },
  });

  if (channels.whatsapp && playerPhone) {
    const wa = await sendWhatsAppTemplate(
      playerPhone,
      noShowPlayerTemplate(),
      getWhatsAppTemplateLanguage(),
      [clubName, dateLine, timeRange, courtLabel, amount],
    );
    if (!wa.ok) {
      console.warn("[notifyParticipantNoShow] WhatsApp failed", wa.error);
    }
  }

  if (channels.email && playerEmail) {
    const em = await sendTransactionalEmail({ to: playerEmail, subject, html });
    if (!em.ok) {
      console.warn("[notifyParticipantNoShow] email failed", em.error);
    }
  }
}
