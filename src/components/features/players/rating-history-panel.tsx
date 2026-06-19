import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PlayerMatchStats, PlayerRatingEvent } from "@/modules/rating/repository";

type Props = {
  locale: string;
  events: PlayerRatingEvent[];
  stats: PlayerMatchStats | null;
};

function formatDelta(change: number): string {
  if (change > 0) return `+${change}`;
  return String(change);
}

export function RatingHistoryPanel({ locale, events, stats }: Props) {
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  return (
    <div className="space-y-4">
      {stats && stats.matchesPlayed > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Matchs" value={String(stats.matchesPlayed)} />
          <StatChip label="Victoires" value={String(stats.wins)} accent="gold" />
          <StatChip label="Win rate" value={`${stats.winRate.toFixed(0)}%`} />
          <StatChip
            label="Série"
            value={stats.currentStreak > 0 ? `+${stats.currentStreak}` : String(stats.currentStreak)}
            accent={stats.currentStreak > 0 ? "success" : stats.currentStreak < 0 ? "danger" : undefined}
          />
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          Aucun match classé pour l&apos;instant. Jouez un match ouvert ou un tournoi et saisissez le
          score pour faire évoluer votre ELO.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const positive = event.ratingChange > 0;
            return (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {new Date(event.createdAt).toLocaleString(dateLocale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-white">
                    {event.oldRating} → <span className="font-bold">{event.newRating}</span> ELO
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {event.matchId ? (
                    <Link
                      href={`/${locale}/matches/${event.matchId}`}
                      className="text-[10px] font-bold text-[var(--gold)] hover:underline"
                    >
                      Match
                    </Link>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-black font-mono",
                      positive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300",
                    )}
                  >
                    {positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatDelta(event.ratingChange)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "gold" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-black",
          accent === "gold" && "text-[var(--gold)]",
          accent === "success" && "text-emerald-300",
          accent === "danger" && "text-rose-300",
          !accent && "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}
