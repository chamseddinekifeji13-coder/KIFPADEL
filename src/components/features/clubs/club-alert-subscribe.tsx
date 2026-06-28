"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Loader2 } from "lucide-react";

import {
  subscribeClubAlertsAction,
} from "@/modules/notifications/preferences-actions";

export type ClubAlertSubscribeLabels = {
  title: string;
  description: string;
  subscribed: string;
  allClubsHint: string;
  subscribe: string;
  unsubscribe: string;
  manageLink: string;
  error: string;
};

type ClubAlertSubscribeProps = {
  clubId: string;
  locale: string;
  initialSubscribed: boolean;
  initialAllClubsAlerts: boolean;
  labels: ClubAlertSubscribeLabels;
};

export function ClubAlertSubscribe({
  clubId,
  locale,
  initialSubscribed,
  initialAllClubsAlerts,
  labels,
}: ClubAlertSubscribeProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const allClubsAlerts = initialAllClubsAlerts;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivelySubscribed = allClubsAlerts || subscribed;

  const handleToggle = async () => {
    if (pending) return;
    if (allClubsAlerts) return;

    setPending(true);
    setError(null);

    const next = !subscribed;
    const result = await subscribeClubAlertsAction(clubId, next);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSubscribed(next);
  };

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-bold text-white">{labels.title}</h2>
          <p className="text-xs leading-5 text-[var(--foreground-muted)]">{labels.description}</p>
        </div>
        {allClubsAlerts ? (
          <span className="mt-1 shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            {labels.subscribed}
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleToggle}
            className={[
              "mt-1 shrink-0 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors touch-manipulation",
              "focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/60 focus:ring-offset-2 focus:ring-offset-black",
              effectivelySubscribed
                ? "border border-[var(--border)] bg-[var(--surface-elevated)] text-white hover:bg-white/5"
                : "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)]",
              pending ? "opacity-70" : "",
            ].join(" ")}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : effectivelySubscribed ? (
              <BellOff className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {effectivelySubscribed ? labels.unsubscribe : labels.subscribe}
          </button>
        )}
      </div>

      {allClubsAlerts ? (
        <p className="text-xs leading-5 text-[var(--foreground-muted)]">{labels.allClubsHint}</p>
      ) : null}

      {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}

      <Link
        href={`/${locale}/profile/notifications`}
        className="text-xs font-bold text-[var(--gold)] hover:underline"
      >
        {labels.manageLink}
      </Link>
    </section>
  );
}
