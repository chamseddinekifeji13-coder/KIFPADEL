"use client";

import { Crown } from "lucide-react";

interface PlayerProfileCardProps {
  displayName: string;
  league: string;
  eloRank: number;
  memberId: string;
}

export function PlayerProfileCard({
  displayName,
  league,
  eloRank,
  memberId,
}: PlayerProfileCardProps) {
  const leagueColors: Record<string, string> = {
    bronze: "text-amber-600",
    silver: "text-slate-400",
    gold: "text-[var(--gold)]",
    platinum: "text-cyan-400",
  };

  const leagueColor = leagueColors[league.toLowerCase()] ?? leagueColors.bronze;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
      {/* Subtle gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-60" />
      
      <div className="p-6 space-y-6">
        {/* Header with Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <span className="text-black font-black text-xs">KIF</span>
            </div>
            <span className="text-[var(--foreground-muted)] text-xs font-medium uppercase tracking-widest">
              Padel Tunisia
            </span>
          </div>
          <div className={`flex items-center gap-1.5 ${leagueColor}`}>
            <Crown className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{league}</span>
          </div>
        </div>

        {/* Player Name Block */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)] font-medium">
            Player
          </p>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            {displayName}
          </h1>
        </div>

        {/* ELO Rank */}
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--foreground-muted)] font-medium">
            ELO Rank
          </span>
          <span className="text-4xl font-black text-[var(--gold)] tracking-tighter font-mono">
            {eloRank.toString().padStart(4, "0")}
          </span>
        </div>

        {/* Footer with Member ID */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] font-medium">
              Member ID
            </p>
            <p className="text-sm font-mono font-bold text-white">
              KIF-{memberId}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] font-medium">
              Season
            </p>
            <p className="text-sm font-bold text-white">2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
