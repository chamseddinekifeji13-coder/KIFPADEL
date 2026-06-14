"use server";

import { createSupabaseServerActionClient } from "@/lib/supabase/server-action";

export type PlayerNotificationPreferences = {
  tournamentsEnabled: boolean;
  clubEventsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  allClubsAlerts: boolean;
};

const DEFAULTS: PlayerNotificationPreferences = {
  tournamentsEnabled: true,
  clubEventsEnabled: true,
  whatsappEnabled: true,
  emailEnabled: true,
  allClubsAlerts: false,
};

export async function getPlayerNotificationPreferencesAction(): Promise<
  PlayerNotificationPreferences | null
> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("player_notification_preferences")
    .select(
      "tournaments_enabled, club_events_enabled, whatsapp_enabled, email_enabled, all_clubs_alerts",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return DEFAULTS;
  }

  return {
    tournamentsEnabled: Boolean(data.tournaments_enabled),
    clubEventsEnabled: Boolean(data.club_events_enabled),
    whatsappEnabled: Boolean(data.whatsapp_enabled),
    emailEnabled: Boolean(data.email_enabled),
    allClubsAlerts: Boolean(data.all_clubs_alerts),
  };
}

export async function updatePlayerNotificationPreferencesAction(
  prefs: PlayerNotificationPreferences,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  const { error } = await supabase.from("player_notification_preferences").upsert({
    user_id: user.id,
    tournaments_enabled: prefs.tournamentsEnabled,
    club_events_enabled: prefs.clubEventsEnabled,
    whatsapp_enabled: prefs.whatsappEnabled,
    email_enabled: prefs.emailEnabled,
    all_clubs_alerts: prefs.allClubsAlerts,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: "Impossible de sauvegarder les préférences." };
  }

  return { ok: true };
}

export async function subscribeClubAlertsAction(
  clubId: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Connexion requise." };
  }

  if (!enabled) {
    const { error } = await supabase
      .from("club_alert_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("club_id", clubId);
    if (error) {
      return { ok: false, error: "Impossible de désabonner." };
    }
    return { ok: true };
  }

  const { error } = await supabase.from("club_alert_subscriptions").upsert({
    user_id: user.id,
    club_id: clubId,
    tournaments_enabled: true,
    club_events_enabled: true,
  });

  if (error) {
    return { ok: false, error: "Impossible de s'abonner aux alertes du club." };
  }

  return { ok: true };
}

export async function getClubAlertSubscriptionAction(
  clubId: string,
): Promise<{ subscribed: boolean; allClubsAlerts: boolean } | null> {
  const supabase = await createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prefs } = await supabase
    .from("player_notification_preferences")
    .select("all_clubs_alerts")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("club_alert_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("club_id", clubId)
    .maybeSingle();

  return {
    subscribed: Boolean(sub),
    allClubsAlerts: Boolean(prefs?.all_clubs_alerts),
  };
}
