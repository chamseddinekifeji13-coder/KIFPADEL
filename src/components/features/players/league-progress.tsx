import { sportLeagueProgress } from "@/domain/rules/rating";
import { cn } from "@/lib/utils/cn";

interface LeagueProgressProps {
  /** Sport rating (ELO-like), not trust_score */
  sportRating: number;
  currentLeague: string;
}

export function LeagueProgress({ sportRating, currentLeague }: LeagueProgressProps) {
  const progress = sportLeagueProgress(sportRating);
  const barWidth = `${Math.min(100, Math.max(1, Math.round(progress.progressPercent)))}%`;

  const pointsToNext =
    progress.isMaxTier ? 0 : Math.max(0, Math.ceil(progress.nextFloor - sportRating));

  const leagueKey = currentLeague.toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">
          {progress.isMaxTier ? "Platine" : `Vers ${progress.nextTierLabel ?? "suivante"}`}
        </span>
        <span className="text-sm font-bold text-white">
          {sportRating} <span className="text-gold font-black">ELO sport</span>
        </span>
      </div>
      <div className="h-2 w-full bg-surface-elevated border border-white/5 rounded-full overflow-hidden shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out shadow-gold",
            leagueKey === "platinum"
              ? "bg-gold-gradient"
              : leagueKey === "gold"
                ? "bg-gold-gradient"
                : leagueKey === "silver"
                  ? "bg-slate-400"
                  : "bg-orange-500",
          )}
          style={{ width: barWidth }}
        />
      </div>

      {!progress.isMaxTier && pointsToNext > 0 && progress.nextTierLabel ? (
        <p className="text-[10px] text-foreground-muted font-medium italic">
          Encore environ{" "}
          <span className="text-gold font-bold">{pointsToNext}</span> points jusqu&apos;à la ligue{" "}
          {progress.nextTierLabel}.
        </p>
      ) : (
        <p className="text-[10px] text-foreground-muted font-medium italic">
          Tu es dans la division la plus élevée reconnue sur ce barème sport.
        </p>
      )}
    </div>
  );
}
