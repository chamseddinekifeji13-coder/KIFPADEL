import { sendTransactionalEmail } from "@/modules/notifications/email-resend";
import { loadParticipantNotificationContext } from "@/modules/notifications/participant-context";
import { getNotificationChannels, getWhatsAppTemplateLanguage } from "@/modules/notifications/shared";
import { sendWhatsAppTemplate } from "@/modules/notifications/whatsapp";

function paymentConfirmedTemplate(): string {
  return process.env.WHATSAPP_PAYMENT_CONFIRMED_TEMPLATE?.trim() ?? "kifpadel_payment_confirmed";
}

function noShowPlayerTemplate(): string {
  return process.env.WHATSAPP_NO_SHOW_PLAYER_TEMPLATE?.trim() ?? "kifpadel_no_show_player";
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
  const html =
    locale === "en"
      ? `<p>Hi ${playerName},</p><p><strong>${clubName}</strong> confirmed your payment for:</p><ul><li>${dateLine} ${timeRange}</li><li>Court: ${courtLabel}</li><li>Seat ${seat}/4</li><li>${amount} DT</li></ul><p>Enjoy your game!<br/>Kifpadel</p>`
      : `<p>Bonjour ${playerName},</p><p><strong>${clubName}</strong> a confirmé votre encaissement pour :</p><ul><li>${dateLine} ${timeRange}</li><li>Terrain : ${courtLabel}</li><li>Place ${seat}/4</li><li>${amount} DT</li></ul><p>Bon match !<br/>Kifpadel</p>`;

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
  const html =
    locale === "en"
      ? `<p>Hi ${playerName},</p><p><strong>${clubName}</strong> recorded a no-show for your booking:</p><ul><li>${dateLine} ${timeRange}</li><li>Court: ${courtLabel}</li><li>Seat ${seat}/4</li><li>${amount} DT</li></ul><p>This may affect your trust score and club debt. Contact the club if you disagree.<br/>Kifpadel</p>`
      : `<p>Bonjour ${playerName},</p><p><strong>${clubName}</strong> a enregistré un no-show pour votre réservation :</p><ul><li>${dateLine} ${timeRange}</li><li>Terrain : ${courtLabel}</li><li>Place ${seat}/4</li><li>${amount} DT</li></ul><p>Cela peut impacter votre score de confiance et une dette club. Contactez le club en cas d'erreur.<br/>Kifpadel</p>`;

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
