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
        <span className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">
          Progression {nextLeague}
        </span>
        <span className="text-sm font-bold text-white">
          {score} <span className="text-gold font-black">/ {nextThreshold} PTS</span>
        </span>
      </div>
      <div className="h-2 w-full bg-surface-elevated border border-white/5 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out shadow-gold",
            currentLeague.toLowerCase() === "gold" ? "bg-gold-gradient" : 
            currentLeague.toLowerCase() === "silver" ? "bg-slate-400" : "bg-orange-500",
            // Mapping progress to nearest 5% fixed classes to avoid inline styles
            progress >= 100 ? "w-full" :
            progress >= 95 ? "w-[95%]" :
            progress >= 90 ? "w-[90%]" :
            progress >= 85 ? "w-[85%]" :
            progress >= 80 ? "w-[80%]" :
            progress >= 75 ? "w-[75%]" :
            progress >= 70 ? "w-[70%]" :
            progress >= 65 ? "w-[65%]" :
            progress >= 60 ? "w-[60%]" :
            progress >= 55 ? "w-[55%]" :
            progress >= 50 ? "w-[50%]" :
            progress >= 45 ? "w-[45%]" :
            progress >= 40 ? "w-[40%]" :
            progress >= 35 ? "w-[35%]" :
            progress >= 30 ? "w-[30%]" :
            progress >= 25 ? "w-[25%]" :
            progress >= 20 ? "w-[20%]" :
            progress >= 15 ? "w-[15%]" :
            progress >= 10 ? "w-[10%]" :
            progress >= 5 ? "w-[5%]" : "w-0"
          )}
        />
      </div>
      
      <p className="text-[10px] text-foreground-muted font-medium italic">
        Plus que <span className="text-gold font-bold">{nextThreshold - score} points</span> pour atteindre la ligue {nextLeague} !
      </p>
    </div>
  );
}
