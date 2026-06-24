"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { computeChampionshipStandings } from "@/domain/rules/championship-standings";
import type { ChampionshipStatus } from "@/domain/types/championships";
import type { LeagueDivision, LeagueEntry, LeagueMovement, LeagueResult } from "@/domain/types/championships";
import type { ChampionshipSummary } from "@/domain/types/championships";
import { formatChampionshipEntryLabel } from "@/domain/types/championships";
import {
  applyPromotionRelegationAction,
  recordChampionshipResultAction,
  updateChampionshipStatusAction,
} from "@/modules/championships/actions";

type Props = {
  locale: string;
  labels: Record<string, string>;
  league: ChampionshipSummary;
  divisions: LeagueDivision[];
  entries: LeagueEntry[];
  results: LeagueResult[];
  movements: LeagueMovement[];
};

export function ChampionshipStaffPanel({
  locale,
  labels,
  league,
  divisions,
  entries,
  results,
  movements,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [homeEntryId, setHomeEntryId] = useState("");
  const [awayEntryId, setAwayEntryId] = useState("");
  const [homeSets, setHomeSets] = useState("2");
  const [awaySets, setAwaySets] = useState("0");

  const standingsByDivision = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeChampionshipStandings>>();
    for (const division of divisions) {
      const divisionEntries = entries
        .filter((e) => e.divisionId === division.id)
        .map((e) => ({ id: e.id, label: formatChampionshipEntryLabel(e) }));
      const divisionResults = results
        .filter((r) => r.divisionId === division.id)
        .map((r) => ({
          homeEntryId: r.homeEntryId,
          awayEntryId: r.awayEntryId,
          homeSetsWon: r.homeSetsWon,
          awaySetsWon: r.awaySetsWon,
          winnerEntryId: r.winnerEntryId,
        }));
      map.set(
        division.id,
        computeChampionshipStandings(
          divisionEntries,
          divisionResults,
          league.pointsPerWin,
          league.pointsPerLoss,
        ),
      );
    }
    return map;
  }, [divisions, entries, results, league.pointsPerWin, league.pointsPerLoss]);

  const divisionEntries = entries.filter((e) => e.divisionId === divisionId);

  const runStatus = async (status: ChampionshipStatus) => {
    setError("");
    setPending(true);
    try {
      const res = await updateChampionshipStatusAction({ locale, leagueId: league.id, status });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const onRecordResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await recordChampionshipResultAction({
        locale,
        leagueId: league.id,
        divisionId,
        homeEntryId,
        awayEntryId,
        homeSetsWon: Number(homeSets),
        awaySetsWon: Number(awaySets),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const onApplyPromotion = async () => {
    setError("");
    setPending(true);
    try {
      const res = await applyPromotionRelegationAction({ locale, leagueId: league.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {league.status === "draft" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => runStatus("registration_open")}
            className="rounded-xl bg-[var(--gold)] px-4 py-2 text-xs font-bold text-black"
          >
            {labels.leaguesDetailOpenRegistration}
          </button>
        ) : null}
        {league.status === "registration_open" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => runStatus("active")}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black"
          >
            {labels.leaguesDetailStartSeason}
          </button>
        ) : null}
        {league.status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={onApplyPromotion}
            className="rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200"
          >
            {labels.leaguesDetailApplyPromotion}
          </button>
        ) : null}
      </div>

      {league.status === "active" ? (
        <p className="text-xs text-[var(--foreground-muted)]">{labels.leaguesDetailApplyPromotionHint}</p>
      ) : null}

      {divisions.map((division) => {
        const standings = standingsByDivision.get(division.id) ?? [];
        return (
          <section
            key={division.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-white">{division.name}</h3>
              <p className="text-[10px] text-[var(--foreground-muted)] uppercase">
                {division.promotionSlots > 0 ? `${division.promotionSlots} ${labels.leaguesDetailPromotionSlots}` : ""}
                {division.promotionSlots > 0 && division.relegationSlots > 0 ? " · " : ""}
                {division.relegationSlots > 0 ? `${division.relegationSlots} ${labels.leaguesDetailRelegationSlots}` : ""}
              </p>
            </div>
            {standings.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">{labels.leaguesDetailNoEntries}</p>
            ) : (
              <table className="w-full text-sm text-white">
                <thead>
                  <tr className="text-[10px] uppercase text-[var(--foreground-muted)]">
                    <th className="text-left py-1">{labels.leaguesDetailRank}</th>
                    <th className="text-left py-1">{labels.leaguesDetailTeam}</th>
                    <th className="text-center py-1">{labels.leaguesDetailPlayed}</th>
                    <th className="text-center py-1">{labels.leaguesDetailWins}</th>
                    <th className="text-right py-1">{labels.leaguesDetailPoints}</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.entryId} className="border-t border-[var(--border)]/60">
                      <td className="py-2 font-bold text-[var(--gold)]">{row.rank}</td>
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-center">{row.played}</td>
                      <td className="py-2 text-center">{row.wins}</td>
                      <td className="py-2 text-right font-bold">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      {league.status === "active" ? (
        <form
          onSubmit={onRecordResult}
          className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 space-y-3"
        >
          <h3 className="text-sm font-bold text-white">{labels.leaguesDetailRecordResult}</h3>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              required
              value={homeEntryId}
              onChange={(e) => setHomeEntryId(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">{labels.leaguesRecordHome}</option>
              {divisionEntries.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatChampionshipEntryLabel(e)}
                </option>
              ))}
            </select>
            <select
              required
              value={awayEntryId}
              onChange={(e) => setAwayEntryId(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">{labels.leaguesRecordAway}</option>
              {divisionEntries.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatChampionshipEntryLabel(e)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={0}
              required
              value={homeSets}
              onChange={(e) => setHomeSets(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
              aria-label={labels.leaguesRecordSetsHome}
            />
            <input
              type="number"
              min={0}
              required
              value={awaySets}
              onChange={(e) => setAwaySets(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
              aria-label={labels.leaguesRecordSetsAway}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[var(--gold)] py-2 text-sm font-bold text-black"
          >
            {pending ? labels.leaguesRecordPending : labels.leaguesRecordCta}
          </button>
        </form>
      ) : null}

      {movements.length > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] p-4 space-y-2">
          <h3 className="text-sm font-bold text-white">{labels.leaguesDetailMovements}</h3>
          <ul className="space-y-2 text-sm text-white/80">
            {movements.map((m) => (
              <li key={m.id} className="rounded-xl bg-black/20 px-3 py-2">
                <span className="font-semibold text-white">{m.teamLabel}</span>{" "}
                <span
                  className={cn(
                    "text-xs font-bold uppercase",
                    m.movement === "promoted" && "text-emerald-400",
                    m.movement === "relegated" && "text-red-400",
                  )}
                >
                  {m.movement === "promoted"
                    ? labels.leaguesMovementPromoted
                    : m.movement === "relegated"
                      ? labels.leaguesMovementRelegated
                      : labels.leaguesMovementStayed}
                </span>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {m.fromDivisionName} → {m.toDivisionName} · {m.seasonLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
