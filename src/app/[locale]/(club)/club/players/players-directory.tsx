"use client";

import { useState } from "react";
import {
  Search,
  Shield,
  Crown,
  Calendar,
  Phone,
  ChevronDown,
  Ban,
  Star,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { reliabilityFromTrustScore } from "@/domain/rules/trust";

type Player = {
  id: string;
  name: string;
  trustScore: number;
  league: string;
  bookingsCount: number;
  lastVisit: string;
  phone: string;
};

type PlayersDirectoryProps = {
  players: Player[];
  locale: string;
  labels: Record<string, string>;
};

export function PlayersDirectory({ players, locale, labels }: PlayersDirectoryProps) {
  const [search, setSearch] = useState("");
  const [filterTrust, setFilterTrust] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"trust" | "bookings" | "recent">("trust");

  const filtered = players
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTrust) {
        const reliability = reliabilityFromTrustScore(p.trustScore);
        if (filterTrust !== reliability) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "trust") return b.trustScore - a.trustScore;
      if (sortBy === "bookings") return b.bookingsCount - a.bookingsCount;
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
    });

  const trustStats = {
    healthy: players.filter((p) => reliabilityFromTrustScore(p.trustScore) === "healthy").length,
    warning: players.filter((p) => reliabilityFromTrustScore(p.trustScore) === "warning").length,
    restricted: players.filter((p) => reliabilityFromTrustScore(p.trustScore) === "restricted").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterTrust(filterTrust === "healthy" ? null : "healthy")}
          className={cn(
            "bg-[var(--surface)] border rounded-xl p-4 text-center transition-all",
            filterTrust === "healthy" ? "border-[var(--success)]" : "border-[var(--border)] hover:border-[var(--success)]/50"
          )}
        >
          <p className="text-2xl font-bold text-[var(--success)]">{trustStats.healthy}</p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">{labels.playersReliable}</p>
        </button>
        <button
          onClick={() => setFilterTrust(filterTrust === "warning" ? null : "warning")}
          className={cn(
            "bg-[var(--surface)] border rounded-xl p-4 text-center transition-all",
            filterTrust === "warning" ? "border-[var(--warning)]" : "border-[var(--border)] hover:border-[var(--warning)]/50"
          )}
        >
          <p className="text-2xl font-bold text-[var(--warning)]">{trustStats.warning}</p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">{labels.playersWarning}</p>
        </button>
        <button
          onClick={() => setFilterTrust(filterTrust === "restricted" ? null : "restricted")}
          className={cn(
            "bg-[var(--surface)] border rounded-xl p-4 text-center transition-all",
            filterTrust === "restricted" ? "border-[var(--danger)]" : "border-[var(--border)] hover:border-[var(--danger)]/50"
          )}
        >
          <p className="text-2xl font-bold text-[var(--danger)]">{trustStats.restricted}</p>
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mt-1">{labels.playersRestricted}</p>
        </button>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder={labels.playersSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-white text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)]"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "trust" | "bookings" | "recent")}
          className="h-10 px-3 pr-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-white text-sm appearance-none cursor-pointer"
        >
          <option value="trust">{labels.playersSortTrust}</option>
          <option value="bookings">{labels.playersSortBookings}</option>
          <option value="recent">{labels.playersSortRecent}</option>
        </select>
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {filtered.map((player) => (
          <PlayerRow key={player.id} player={player} labels={labels} locale={locale} />
        ))}

        {filtered.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <Search className="h-8 w-8 text-[var(--foreground-muted)] mx-auto mb-3" />
            <p className="text-white font-medium">{labels.playersNoResults}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  labels,
  locale,
}: {
  player: Player;
  labels: Record<string, string>;
  locale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const reliability = reliabilityFromTrustScore(player.trustScore);

  const trustColors: Record<string, string> = {
    healthy: "text-[var(--success)] bg-[var(--success)]/10",
    warning: "text-[var(--warning)] bg-[var(--warning)]/10",
    restricted: "text-[var(--danger)] bg-[var(--danger)]/10",
    blacklisted: "text-[var(--danger)] bg-[var(--danger)]/10",
  };

  const leagueColors: Record<string, string> = {
    bronze: "text-amber-600",
    silver: "text-slate-400",
    gold: "text-[var(--gold)]",
    platinum: "text-cyan-400",
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-[var(--surface-elevated)] transition-colors text-left"
      >
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-[var(--background)] flex items-center justify-center text-white font-bold text-lg">
          {player.name.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white truncate">{player.name}</p>
            <span className={cn("flex items-center gap-1", leagueColors[player.league])}>
              <Crown className="h-3 w-3" />
              <span className="text-[10px] uppercase font-bold">{player.league}</span>
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-muted)]">
            {player.bookingsCount} {labels.bookingsLabel}
          </p>
        </div>

        {/* Trust Score */}
        <div className="flex items-center gap-3">
          <div className={cn("px-2 py-1 rounded-full text-xs font-bold", trustColors[reliability])}>
            {player.trustScore}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-[var(--foreground-muted)] transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Phone className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">{labels.contactLabel}</p>
                <p className="text-sm font-medium text-white">{player.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--background)]">
              <Calendar className="h-4 w-4 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider">{labels.lastVisitLabel}</p>
                <p className="text-sm font-medium text-white">
                  {new Date(player.lastVisit).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 h-10 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] font-bold text-sm hover:bg-[var(--gold)]/20 transition-colors flex items-center justify-center gap-2">
              <Star className="h-4 w-4" />
              {labels.addBonusCta}
            </button>
            <button className="flex-1 h-10 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] font-bold text-sm hover:bg-[var(--danger)]/20 transition-colors flex items-center justify-center gap-2">
              <Ban className="h-4 w-4" />
              {labels.reportCta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
