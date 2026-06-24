"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChampionshipStatus, LeagueDivision, LeagueEntry } from "@/domain/types/championships";
import { formatChampionshipEntryLabel } from "@/domain/types/championships";
import type { ProfilePick } from "@/modules/championships/repository";
import {
  registerChampionshipEntryAsStaffAction,
  withdrawChampionshipEntryAsStaffAction,
} from "@/modules/championships/actions";

type Props = {
  locale: string;
  leagueId: string;
  leagueStatus: ChampionshipStatus;
  divisions: LeagueDivision[];
  entries: LeagueEntry[];
  clubPlayers: ProfilePick[];
  labels: Record<string, string>;
};

export function ChampionshipEntriesPanel({
  locale,
  leagueId,
  leagueStatus,
  divisions,
  entries,
  clubPlayers,
  labels,
}: Props) {
  const router = useRouter();
  const [divisionId, setDivisionId] = useState(divisions[divisions.length - 1]?.id ?? "");
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const canManage =
    leagueStatus === "draft" ||
    leagueStatus === "registration_open" ||
    leagueStatus === "active";

  if (!canManage) {
    return null;
  }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await registerChampionshipEntryAsStaffAction({
        locale,
        leagueId,
        divisionId,
        player1Id,
        player2Id,
        teamName: teamName.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlayer1Id("");
      setPlayer2Id("");
      setTeamName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const onWithdraw = async (entryId: string) => {
    setError("");
    setPending(true);
    try {
      const res = await withdrawChampionshipEntryAsStaffAction({ locale, leagueId, entryId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const playerOptions = clubPlayers.length > 0 ? clubPlayers : [];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">{labels.leaguesDetailManageEntries}</h3>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{labels.leaguesDetailManageEntriesHint}</p>
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2 text-white"
            >
              <span>
                {formatChampionshipEntryLabel(entry)}
                <span className="ml-2 text-xs text-[var(--foreground-muted)]">
                  {divisions.find((d) => d.id === entry.divisionId)?.name}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => onWithdraw(entry.id)}
                className="text-xs font-bold text-red-400 hover:text-red-300"
              >
                {labels.leaguesDetailWithdrawEntry}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-amber-200/90 bg-amber-500/10 rounded-xl px-3 py-2">
          {labels.leaguesDetailNoTeamsYet}
        </p>
      )}

      <form onSubmit={onAdd} className="space-y-3 border-t border-[var(--border)]/60 pt-4">
        <p className="text-xs font-bold uppercase text-[var(--foreground-muted)]">
          {labels.leaguesDetailAddTeam}
        </p>
        <select
          required
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
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder={labels.leaguesDetailTeamNameOptional}
          className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            required
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{labels.leaguesDetailPlayer1}</option>
            {playerOptions.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                {p.displayName ?? p.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <select
            required
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{labels.leaguesDetailPlayer2}</option>
            {playerOptions.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                {p.displayName ?? p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        {playerOptions.length === 0 ? (
          <p className="text-xs text-[var(--foreground-muted)]">{labels.leaguesDetailNoClubPlayers}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending || playerOptions.length === 0}
          className="w-full rounded-xl bg-[var(--gold)] py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {pending ? labels.leaguesDetailAddTeamPending : labels.leaguesDetailAddTeamCta}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
