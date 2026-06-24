import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/config/env";
import { sendTransactionalEmail } from "@/modules/notifications/email-resend";
import { buildKifpadelEmailHtml, escapeHtml } from "@/modules/notifications/kifpadel-email-template";
import { getWhatsAppTemplateLanguage } from "@/modules/notifications/shared";
import { sendWhatsAppTemplate } from "@/modules/notifications/whatsapp";

export type OutboxRow = {
  id: string;
  user_id: string;
  channel: string;
  kind: string;
  title: string;
  body: string;
};

export async function processNotificationOutbox(limit = 50): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();

    const { data: rows, error } = await admin
      .from("notification_outbox")
      .select("id, user_id, channel, kind, title, body")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error || !rows?.length) {
      return;
    }

    for (const row of rows as OutboxRow[]) {
      await processOneOutboxRow(admin, row);
    }
  } catch (err) {
    console.error("[processNotificationOutbox] error", err);
  }
}

async function processOneOutboxRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: OutboxRow,
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("phone_e164")
    .eq("id", row.user_id)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
  const email = authUser?.user?.email?.trim() ?? "";
  const phone = profile?.phone_e164?.trim() ?? "";

  let ok = false;
  let errorMessage: string | null = null;

  if (row.channel === "whatsapp") {
    if (!phone) {
      errorMessage = "no_phone";
    } else {
      const parts = row.body.split("|").map((p) => p.trim());
      const template =
        row.kind === "booking_underfilled_cancelled"
          ? process.env.WHATSAPP_BOOKING_CANCELLED_TEMPLATE?.trim() ?? "kifpadel_booking_cancelled"
          : process.env.WHATSAPP_TOURNAMENT_ALERT_TEMPLATE?.trim() ?? "kifpadel_tournament_alert";
      const wa = await sendWhatsAppTemplate(
        phone,
        template,
        getWhatsAppTemplateLanguage(),
        parts.length >= 3 ? parts.slice(0, 5) : [row.title, row.body],
      );
      ok = wa.ok;
      if (!wa.ok) errorMessage = wa.error;
    }
  } else if (row.channel === "email") {
    if (!email) {
      errorMessage = "no_email";
    } else {
      const bodyParts = row.body.split("|").map((p) => p.trim()).filter(Boolean);
      const bodyHtml = bodyParts.map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`).join("");
      const em = await sendTransactionalEmail({
        to: email,
        subject: row.title,
        html: buildKifpadelEmailHtml({
          title: row.title,
          preheader: bodyParts[0] ?? row.title,
          bodyHtml: bodyHtml || `<p style="margin:0;">${escapeHtml(row.body)}</p>`,
        }),
      });
      ok = em.ok;
      if (!em.ok) errorMessage = em.error;
    }
  }

  const status = ok ? "sent" : errorMessage === "no_phone" || errorMessage === "no_email" ? "skipped" : "failed";

  await admin
    .from("notification_outbox")
    .update({
      status,
      error_message: errorMessage,
      sent_at: ok ? new Date().toISOString() : null,
    })
    .eq("id", row.id);
}

export async function enqueueTournamentAlerts(tournamentId: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const locale = publicEnv.defaultLocale;

    const { data: tournament, error: tournamentError } = await admin
      .from("tournaments")
      .select("id, club_id, title, starts_at, status")
      .eq("id", tournamentId)
      .maybeSingle();

    if (tournamentError || !tournament) {
      console.warn("[enqueueTournamentAlerts] tournament missing", tournamentId);
      return;
    }

    if (String(tournament.status) !== "registration_open") {
      return;
    }

    const { data: club } = await admin
      .from("clubs")
      .select("name")
      .eq("id", tournament.club_id)
      .maybeSingle();

    const clubName = club?.name?.trim() || "Club";
    const title =
      locale === "en" ? `New tournament — ${clubName}` : `Nouveau tournoi — ${clubName}`;
    const dateLine = tournament.starts_at
      ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
          timeZone: "Africa/Tunis",
          dateStyle: "long",
        }).format(new Date(tournament.starts_at))
      : locale === "en"
        ? "Date to be announced"
        : "Date à confirmer";

    const body = `${clubName}|${tournament.title}|${dateLine}|${publicEnv.siteUrl}/${locale}/tournaments/${tournamentId}`;

    const { data: prefsRows } = await admin
      .from("player_notification_preferences")
      .select("user_id, tournaments_enabled, whatsapp_enabled, email_enabled, all_clubs_alerts");

    const { data: clubSubs } = await admin
      .from("club_alert_subscriptions")
      .select("user_id, tournaments_enabled")
      .eq("club_id", tournament.club_id)
      .eq("tournaments_enabled", true);

    const clubSubUserIds = new Set((clubSubs ?? []).map((r) => String((r as { user_id: string }).user_id)));

    const recipientIds = new Set<string>();

    for (const pref of prefsRows ?? []) {
      const userId = String((pref as { user_id: string }).user_id);
      const tournamentsEnabled = Boolean((pref as { tournaments_enabled?: boolean }).tournaments_enabled);
      const allClubs = Boolean((pref as { all_clubs_alerts?: boolean }).all_clubs_alerts);
      if (!tournamentsEnabled) continue;
      if (allClubs || clubSubUserIds.has(userId)) {
        recipientIds.add(userId);
      }
    }

    const inserts: Array<{
      user_id: string;
      club_id: string;
      channel: string;
      kind: string;
      reference_id: string;
      title: string;
      body: string;
    }> = [];

    for (const userId of recipientIds) {
      const pref = (prefsRows ?? []).find((p) => String((p as { user_id: string }).user_id) === userId) as
        | { whatsapp_enabled?: boolean; email_enabled?: boolean }
        | undefined;

      if (pref?.whatsapp_enabled) {
        inserts.push({
          user_id: userId,
          club_id: String(tournament.club_id),
          channel: "whatsapp",
          kind: "tournament",
          reference_id: tournamentId,
          title,
          body,
        });
      }
      if (pref?.email_enabled) {
        inserts.push({
          user_id: userId,
          club_id: String(tournament.club_id),
          channel: "email",
          kind: "tournament",
          reference_id: tournamentId,
          title,
          body,
        });
      }
    }

    if (inserts.length === 0) {
      return;
    }

    const { error: insertError } = await admin.from("notification_outbox").insert(inserts);
    if (insertError) {
      console.error("[enqueueTournamentAlerts] insert failed", insertError.message);
      return;
    }

    void processNotificationOutbox(100);
  } catch (err) {
    console.error("[enqueueTournamentAlerts] unexpected", err);
  }
}

export async function enqueueClubEventAlerts(input: {
  clubId: string;
  eventId: string;
  title: string;
  summary: string;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const locale = publicEnv.defaultLocale;

    const { data: club } = await admin.from("clubs").select("name").eq("id", input.clubId).maybeSingle();
    const clubName = club?.name?.trim() || "Club";

    const notificationTitle =
      locale === "en" ? `Club event — ${clubName}` : `Événement — ${clubName}`;
    const body = `${clubName}|${input.title}|${input.summary}`;

    const { data: prefsRows } = await admin
      .from("player_notification_preferences")
      .select("user_id, club_events_enabled, whatsapp_enabled, email_enabled, all_clubs_alerts");

    const { data: clubSubs } = await admin
      .from("club_alert_subscriptions")
      .select("user_id")
      .eq("club_id", input.clubId)
      .eq("club_events_enabled", true);

    const clubSubUserIds = new Set((clubSubs ?? []).map((r) => String((r as { user_id: string }).user_id)));

    const recipientIds = new Set<string>();
    for (const pref of prefsRows ?? []) {
      const userId = String((pref as { user_id: string }).user_id);
      if (!Boolean((pref as { club_events_enabled?: boolean }).club_events_enabled)) continue;
      const allClubs = Boolean((pref as { all_clubs_alerts?: boolean }).all_clubs_alerts);
      if (allClubs || clubSubUserIds.has(userId)) {
        recipientIds.add(userId);
      }
    }

    const inserts: Array<Record<string, string>> = [];
    for (const userId of recipientIds) {
      const pref = (prefsRows ?? []).find((p) => String((p as { user_id: string }).user_id) === userId) as
        | { whatsapp_enabled?: boolean; email_enabled?: boolean }
        | undefined;
      if (pref?.whatsapp_enabled) {
        inserts.push({
          user_id: userId,
          club_id: input.clubId,
          channel: "whatsapp",
          kind: "club_event",
          reference_id: input.eventId,
          title: notificationTitle,
          body,
        });
      }
      if (pref?.email_enabled) {
        inserts.push({
          user_id: userId,
          club_id: input.clubId,
          channel: "email",
          kind: "club_event",
          reference_id: input.eventId,
          title: notificationTitle,
          body,
        });
      }
    }

    if (inserts.length === 0) return;

    await admin.from("notification_outbox").insert(inserts);
    void processNotificationOutbox(100);
  } catch (err) {
    console.error("[enqueueClubEventAlerts] unexpected", err);
  }
}
