import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveWhatsAppTarget } from "@/lib/phone/resolve-whatsapp-target";
import { publicEnv } from "@/lib/config/env";
import { sendTransactionalEmail } from "@/modules/notifications/email-resend";
import {
  formatAmountDt,
  formatBookingSchedule,
  formatPaymentMethodLabel,
} from "@/modules/notifications/booking-format";
import { sendWhatsAppTemplate } from "@/modules/notifications/whatsapp";

type NotifyBookingCreatedInput = {
  bookingId: string;
  playerId: string;
};

function notificationsEnabled(): { whatsapp: boolean; email: boolean } {
  const wa =
    process.env.NOTIFICATION_WHATSAPP_ENABLED !== "false" && process.env.NOTIFICATION_WHATSAPP_ENABLED !== "0";
  const em =
    process.env.NOTIFICATION_EMAIL_ENABLED !== "false" && process.env.NOTIFICATION_EMAIL_ENABLED !== "0";
  return { whatsapp: wa, email: em };
}

function playerWhatsAppTemplate(): string {
  return process.env.WHATSAPP_BOOKING_PLAYER_TEMPLATE?.trim() ?? "kifpadel_booking_player";
}

function clubWhatsAppTemplate(): string {
  return process.env.WHATSAPP_BOOKING_CLUB_TEMPLATE?.trim() ?? "kifpadel_booking_club";
}

function templateLanguage(): string {
  return process.env.WHATSAPP_BOOKING_TEMPLATE_LANGUAGE?.trim() ?? "fr";
}

/**
 * Notifications après réservation (non bloquant — erreurs loggées).
 * WhatsApp : joueur + contact club. E-mail : joueur + contact club si configuré.
 */
export async function notifyBookingCreated(input: NotifyBookingCreatedInput): Promise<void> {
  const channels = notificationsEnabled();
  if (!channels.whatsapp && !channels.email) {
    return;
  }

  try {
    const admin = createSupabaseAdminClient();
    const locale = publicEnv.defaultLocale;

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, club_id, court_id, starts_at, ends_at")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      console.warn("[notifyBookingCreated] booking not found", input.bookingId);
      return;
    }

    const { data: participant } = await admin
      .from("booking_participants")
      .select("seat_index, share_price, payment_method")
      .eq("booking_id", input.bookingId)
      .eq("player_id", input.playerId)
      .maybeSingle();

    const { data: club } = await admin
      .from("clubs")
      .select("name, contact_phone, contact_email")
      .eq("id", booking.club_id)
      .maybeSingle();

    const { data: court } = await admin
      .from("courts")
      .select("label")
      .eq("id", booking.court_id)
      .maybeSingle();

    const { data: playerProfile } = await admin
      .from("profiles")
      .select("display_name, phone_e164")
      .eq("id", input.playerId)
      .maybeSingle();

    const { data: authUser } = await admin.auth.admin.getUserById(input.playerId);

    const clubName = club?.name?.trim() || "Club";
    const courtLabel = court?.label?.trim() || "Terrain";
    const playerName = playerProfile?.display_name?.trim() || "Joueur";
    const amount = formatAmountDt(participant?.share_price);
    const paymentLabel = formatPaymentMethodLabel(participant?.payment_method, locale);
    const seat = String(participant?.seat_index ?? 1);
    const { dateLine, timeRange } = formatBookingSchedule(booking.starts_at, booking.ends_at, locale);

    const playerEmail = authUser?.user?.email?.trim() ?? "";
    const playerPhone = playerProfile?.phone_e164?.trim() ?? "";
    const clubEmail = club?.contact_email?.trim() ?? "";
    const clubPhoneE164 = resolveWhatsAppTarget(club?.contact_phone);

    const playerSubject =
      locale === "en"
        ? `Booking confirmed — ${clubName}`
        : `Réservation confirmée — ${clubName}`;
    const playerHtml =
      locale === "en"
        ? `<p>Hi ${playerName},</p><p>Your booking at <strong>${clubName}</strong> is registered.</p><ul><li>${dateLine}</li><li>${timeRange}</li><li>Court: ${courtLabel}</li><li>Seat ${seat}/4</li><li>${amount} DT — ${paymentLabel}</li></ul><p>See you on court!<br/>Kifpadel</p>`
        : `<p>Bonjour ${playerName},</p><p>Votre réservation à <strong>${clubName}</strong> est enregistrée.</p><ul><li>${dateLine}</li><li>${timeRange}</li><li>Terrain : ${courtLabel}</li><li>Place ${seat}/4</li><li>${amount} DT — ${paymentLabel}</li></ul><p>À bientôt sur le terrain !<br/>Kifpadel</p>`;

    const clubSubject =
      locale === "en"
        ? `New booking — ${playerName}`
        : `Nouvelle réservation — ${playerName}`;
    const clubHtml =
      locale === "en"
        ? `<p>New booking on Kifpadel:</p><ul><li>Player: ${playerName}</li><li>${dateLine} ${timeRange}</li><li>Court: ${courtLabel}</li><li>Seat ${seat}/4</li><li>${amount} DT (${paymentLabel})</li></ul><p>Manage slots in your club dashboard.</p>`
        : `<p>Nouvelle réservation Kifpadel :</p><ul><li>Joueur : ${playerName}</li><li>${dateLine} ${timeRange}</li><li>Terrain : ${courtLabel}</li><li>Place ${seat}/4</li><li>${amount} DT (${paymentLabel})</li></ul><p>Gérez les créneaux dans votre espace club.</p>`;

    if (channels.whatsapp && playerPhone) {
      const wa = await sendWhatsAppTemplate(
        playerPhone,
        playerWhatsAppTemplate(),
        templateLanguage(),
        [clubName, dateLine, timeRange, courtLabel, amount, paymentLabel],
      );
      if (!wa.ok) {
        console.warn("[notifyBookingCreated] player WhatsApp failed", wa.error);
      }
    }

    if (channels.whatsapp && clubPhoneE164) {
      const wa = await sendWhatsAppTemplate(
        clubPhoneE164,
        clubWhatsAppTemplate(),
        templateLanguage(),
        [playerName, dateLine, timeRange, seat, amount, paymentLabel],
      );
      if (!wa.ok) {
        console.warn("[notifyBookingCreated] club WhatsApp failed", wa.error);
      }
    }

    if (channels.email && playerEmail) {
      const em = await sendTransactionalEmail({ to: playerEmail, subject: playerSubject, html: playerHtml });
      if (!em.ok) {
        console.warn("[notifyBookingCreated] player email failed", em.error);
      }
    }

    if (channels.email && clubEmail) {
      const em = await sendTransactionalEmail({ to: clubEmail, subject: clubSubject, html: clubHtml });
      if (!em.ok) {
        console.warn("[notifyBookingCreated] club email failed", em.error);
      }
    }
  } catch (err) {
    console.error("[notifyBookingCreated] unexpected error", err);
  }
}
