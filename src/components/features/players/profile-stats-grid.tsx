import { Trophy, Target, Percent, Calendar } from "lucide-react";

interface ProfileStatsGridProps {
  matchesPlayed: number;
  wins: number;
  winRate: number;
  weeklyMatches: number;
}

export function ProfileStatsGrid({
  matchesPlayed,
  wins,
  winRate,
  weeklyMatches,
}: ProfileStatsGridProps) {
  const stats = [
    {
      label: "Matchs",
      value: matchesPlayed,
      icon: Trophy,
    },
    {
      label: "Victoires",
      value: wins,
      icon: Target,
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: Percent,
    },
    {
      label: "Cette Semaine",
      value: weeklyMatches,
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center justify-center text-center"
        >
          <stat.icon className="h-4 w-4 text-[var(--gold)] mb-2" />
          <span className="text-xl font-black text-white">{stat.value}</span>
          <span className="text-[9px] uppercase tracking-wider text-[var(--foreground-muted)] font-medium mt-0.5">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
