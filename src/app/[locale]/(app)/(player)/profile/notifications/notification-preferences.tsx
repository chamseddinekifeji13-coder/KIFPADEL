"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  getPlayerNotificationPreferencesAction,
  updatePlayerNotificationPreferencesAction,
  type PlayerNotificationPreferences,
} from "@/modules/notifications/preferences-actions";

type NotificationPreferenceId = "bookings" | "trust" | "tournaments" | "club_events" | "whatsapp" | "email";

type NotificationPreferenceLabels = Record<string, string>;

type NotificationPreferencesProps = {
  labels: NotificationPreferenceLabels;
};

const STORAGE_KEY = "kifpadel.notification-preferences";

const DEFAULT_LOCAL: Record<"bookings" | "trust", boolean> = {
  bookings: true,
  trust: true,
};

const DEFAULT_SERVER: PlayerNotificationPreferences = {
  tournamentsEnabled: true,
  clubEventsEnabled: true,
  whatsappEnabled: true,
  emailEnabled: true,
  allClubsAlerts: false,
};

export function NotificationPreferences({ labels }: NotificationPreferencesProps) {
  const [localPrefs, setLocalPrefs] = useState(DEFAULT_LOCAL);
  const [serverPrefs, setServerPrefs] = useState<PlayerNotificationPreferences>(DEFAULT_SERVER);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<string, boolean>>;
        setLocalPrefs({
          bookings: parsed.bookings ?? DEFAULT_LOCAL.bookings,
          trust: parsed.trust ?? DEFAULT_LOCAL.trust,
        });
      }
    } catch (error) {
      console.warn("[NotificationPreferences] localStorage read failed", error);
    }

    getPlayerNotificationPreferencesAction()
      .then((prefs) => {
        if (prefs) setServerPrefs(prefs);
      })
      .finally(() => setHasLoaded(true));
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localPrefs));
    } catch (error) {
      console.warn("[NotificationPreferences] localStorage write failed", error);
    }
  }, [localPrefs, hasLoaded]);

  const persistServer = async (next: PlayerNotificationPreferences) => {
    setServerPrefs(next);
    const result = await updatePlayerNotificationPreferencesAction(next);
    if (!result.ok) {
      console.warn("[NotificationPreferences] server save failed", result.error);
    }
  };

  const preferences = [
    {
      id: "tournaments" as const,
      icon: Trophy,
      title: labels.notificationTournamentsTitle,
      description: labels.notificationTournamentsDescription,
      enabled: serverPrefs.tournamentsEnabled,
      onToggle: () =>
        persistServer({ ...serverPrefs, tournamentsEnabled: !serverPrefs.tournamentsEnabled }),
    },
    {
      id: "club_events" as const,
      icon: Bell,
      title: labels.notificationClubEventsTitle,
      description: labels.notificationClubEventsDescription,
      enabled: serverPrefs.clubEventsEnabled,
      onToggle: () =>
        persistServer({ ...serverPrefs, clubEventsEnabled: !serverPrefs.clubEventsEnabled }),
    },
    {
      id: "whatsapp" as const,
      icon: Bell,
      title: labels.notificationWhatsappTitle,
      description: labels.notificationWhatsappDescription,
      enabled: serverPrefs.whatsappEnabled,
      onToggle: () => persistServer({ ...serverPrefs, whatsappEnabled: !serverPrefs.whatsappEnabled }),
    },
    {
      id: "email" as const,
      icon: Mail,
      title: labels.notificationEmailTitle,
      description: labels.notificationEmailDescription,
      enabled: serverPrefs.emailEnabled,
      onToggle: () => persistServer({ ...serverPrefs, emailEnabled: !serverPrefs.emailEnabled }),
    },
    {
      id: "bookings" as const,
      icon: Bell,
      title: labels.notificationBookingTitle,
      description: labels.notificationBookingDescription,
      enabled: localPrefs.bookings,
      onToggle: () => setLocalPrefs((c) => ({ ...c, bookings: !c.bookings })),
    },
    {
      id: "trust" as const,
      icon: ShieldCheck,
      title: labels.notificationTrustTitle,
      description: labels.notificationTrustDescription,
      enabled: localPrefs.trust,
      onToggle: () => setLocalPrefs((c) => ({ ...c, trust: !c.trust })),
    },
  ] satisfies Array<{
    id: NotificationPreferenceId;
    icon: LucideIcon;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
  }>;

  return (
    <div className="space-y-3">
      <Card className="p-4 border-[var(--gold)]/20 bg-[var(--gold)]/5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white">{labels.notificationAllClubsTitle}</h2>
            <p className="text-xs leading-5 text-[var(--foreground-muted)]">
              {labels.notificationAllClubsDescription}
            </p>
          </div>
          <ToggleSwitch
            enabled={serverPrefs.allClubsAlerts}
            label={labels.notificationAllClubsTitle}
            enabledLabel={labels.notificationEnabled}
            disabledLabel={labels.notificationDisabled}
            onToggle={() =>
              persistServer({ ...serverPrefs, allClubsAlerts: !serverPrefs.allClubsAlerts })
            }
          />
        </div>
      </Card>

      {preferences.map(({ id, icon: Icon, title, description, enabled, onToggle }) => (
        <Card key={id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white">{title}</h2>
                <p className="text-xs leading-5 text-[var(--foreground-muted)]">{description}</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={enabled}
              label={title}
              enabledLabel={labels.notificationEnabled}
              disabledLabel={labels.notificationDisabled}
              onToggle={onToggle}
            />
          </div>
        </Card>
      ))}

      <p className="text-xs text-[var(--foreground-muted)]">{labels.notificationsServerSyncedHint}</p>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  label,
  enabledLabel,
  disabledLabel,
  onToggle,
}: {
  enabled: boolean;
  label: string;
  enabledLabel: string;
  disabledLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label} - ${enabled ? enabledLabel : disabledLabel}`}
      onClick={onToggle}
      className={[
        "mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/60 focus:ring-offset-2 focus:ring-offset-black",
        enabled ? "bg-[var(--gold)]" : "bg-slate-700",
      ].join(" ")}
    >
      <span
        className={[
          "h-6 w-6 rounded-full bg-black transition-transform",
          enabled ? "translate-x-6" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}
