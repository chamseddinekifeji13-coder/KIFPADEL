"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, ShieldCheck, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type NotificationPreferenceId = "bookings" | "trust" | "marketing";

type NotificationPreferenceLabels = Record<string, string>;

type NotificationPreferencesProps = {
  labels: NotificationPreferenceLabels;
};

const STORAGE_KEY = "kifpadel.notification-preferences";

const DEFAULT_ENABLED: Record<NotificationPreferenceId, boolean> = {
  bookings: true,
  trust: true,
  marketing: false,
};

export function NotificationPreferences({ labels }: NotificationPreferencesProps) {
  const [enabledById, setEnabledById] = useState(DEFAULT_ENABLED);
  const [hasLoadedStoredPreferences, setHasLoadedStoredPreferences] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<NotificationPreferenceId, boolean>>;
        setEnabledById({
          bookings: parsed.bookings ?? DEFAULT_ENABLED.bookings,
          trust: parsed.trust ?? DEFAULT_ENABLED.trust,
          marketing: parsed.marketing ?? DEFAULT_ENABLED.marketing,
        });
      }
    } catch (error) {
      console.warn("[NotificationPreferences] failed to read stored preferences", error);
    } finally {
      setHasLoadedStoredPreferences(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredPreferences) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledById));
    } catch (error) {
      console.warn("[NotificationPreferences] failed to store preferences", error);
    }
  }, [enabledById, hasLoadedStoredPreferences]);

  const preferences = [
    {
      id: "bookings",
      icon: Bell,
      title: labels.notificationBookingTitle,
      description: labels.notificationBookingDescription,
    },
    {
      id: "trust",
      icon: ShieldCheck,
      title: labels.notificationTrustTitle,
      description: labels.notificationTrustDescription,
    },
    {
      id: "marketing",
      icon: Mail,
      title: labels.notificationMarketingTitle,
      description: labels.notificationMarketingDescription,
    },
  ] satisfies Array<{
    id: NotificationPreferenceId;
    icon: LucideIcon;
    title: string;
    description: string;
  }>;

  return (
    <div className="space-y-3">
      {preferences.map(({ id, icon: Icon, title, description }) => {
        const enabled = enabledById[id];

        return (
          <Card key={id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white">{title}</h2>
                  <p className="text-xs leading-5 text-[var(--foreground-muted)]">
                    {description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${title} - ${
                  enabled ? labels.notificationEnabled : labels.notificationDisabled
                }`}
                onClick={() =>
                  setEnabledById((current) => ({
                    ...current,
                    [id]: !current[id],
                  }))
                }
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
            </div>
          </Card>
        );
      })}
    </div>
  );
}
