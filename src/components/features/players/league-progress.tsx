import { LEAGUE_THRESHOLDS } from "@/modules/players/trust-service";
import { cn } from "@/lib/utils/cn";

interface LeagueProgressProps {
  score: number;
  currentLeague: string;
}

export function LeagueProgress({ score, currentLeague }: LeagueProgressProps) {
  let nextThreshold = LEAGUE_THRESHOLDS.SILVER;
  let prevThreshold = LEAGUE_THRESHOLDS.BRONZE;
  let nextLeague = "Silver";

  if (score >= LEAGUE_THRESHOLDS.SILVER) {
    prevThreshold = LEAGUE_THRESHOLDS.SILVER;
    nextThreshold = LEAGUE_THRESHOLDS.GOLD;
    nextLeague = "Gold";
  }

  const progress = Math.min(
    100,
    ((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Progression {nextLeague}
        </span>
        <span className="text-sm font-bold text-slate-900">
          {score} <span className="text-slate-400 font-medium">/ {nextThreshold} pts</span>
        </span>
      </div>
      
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",

            currentLeague.toLowerCase() === "gold" ? "bg-amber-400" : 
            currentLeague.toLowerCase() === "silver" ? "bg-slate-400" : "bg-orange-400"
          )}
          style={{ ["width" as string]: `${progress}%` }}

        />

      </div>
      
      <p className="text-[10px] text-slate-400 italic">
        Plus que {nextThreshold - score} points pour atteindre la ligue {nextLeague} !
      </p>
    </div>
  );
}
