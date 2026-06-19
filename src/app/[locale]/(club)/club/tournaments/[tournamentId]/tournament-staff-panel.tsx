"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { formatSetScores } from "@/domain/rules/match-score";
import {
  assignTeamsToPools,
  computePoolStandings,
  parsePoolLabelFromRound,
} from "@/domain/rules/tournament-pools";
import { formatTournamentFormatLabel } from "@/domain/rules/tournament-americano";
import { MatchScoreForm } from "@/components/features/matches/match-score-form";
import {
  generateTournamentScheduleAction,
  updateTournamentStatusAction,
} from "@/modules/tournaments/actions";
import type { TournamentFormat, TournamentStatus } from "@/domain/types/tournaments";
import type {
  TournamentMatchWithMeta,
  TournamentEntryWithNames,
  TournamentSoloEntryWithName,
} from "@/modules/tournaments/repository";

type Props = {
  locale: string;
  tournamentId: string;
  format: TournamentFormat;
  status: TournamentStatus;
  entries: TournamentEntryWithNames[];
  soloEntries: TournamentSoloEntryWithName[];
  matches: TournamentMatchWithMeta[];
  canGenerateSchedule: boolean;
};

const STATUS_FLOW: TournamentStatus[] = [
  "draft",
  "registration_open",
  "in_progress",
  "completed",
];

function nextStatus(s: TournamentStatus): TournamentStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  if (i < 0 || i >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1]!;
}

function generateButtonLabel(format: TournamentFormat): string {
  if (format === "pools") return "Générer les poules";
  if (format === "americano") return "Générer les rotations";
  return "Générer le tableau (KO)";
}

function scheduleHint(format: TournamentFormat): string {
  if (format === "pools") {
    return "Poules de 4 équipes max — chaque équipe affronte les autres de sa poule. Classement sur les victoires.";
  }
  if (format === "americano") {
    return "Inscription solo — 4, 8, 12 ou 16 joueurs. Partenaires rotatifs ; classement sur les points marqués.";
  }
  return "Élimination directe — nombre d’équipes = puissance de 2 (4, 8, 16…).";
}

export function TournamentStaffPanel({
  locale,
  tournamentId,
  format,
  status,
  entries,
  soloEntries,
  matches,
  canGenerateSchedule,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const ns = nextStatus(status);
  const activeEntries = entries.filter((e) => e.status !== "withdrawn");
  const activeSolo = soloEntries.filter((e) => e.status !== "withdrawn");

  const onStatus = async (s: TournamentStatus) => {
    setError("");
    setPending("status");
    const res = await updateTournamentStatusAction({ locale, tournamentId, status: s });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const onGenerate = async () => {
    setError("");
    setPending("gen");
    const res = await generateTournamentScheduleAction({ locale, tournamentId });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const poolLabels =
    format === "pools"
      ? assignTeamsToPools(activeEntries.length).map((p) => p.poolLabel)
      : [];

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--gold)]">
        Format : {formatTournamentFormatLabel(format, locale)}
      </p>

      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {ns ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => onStatus(ns)}
            className="rounded-xl px-4 py-2 text-xs font-bold bg-white/10 text-white hover:bg-white/15"
          >
            Statut → {ns}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canGenerateSchedule || pending !== null}
          onClick={onGenerate}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold",
            canGenerateSchedule && !pending
              ? "bg-[var(--gold)] text-black"
              : "bg-white/5 text-white/40",
          )}
        >
          {pending === "gen" ? "…" : generateButtonLabel(format)}
        </button>
      </div>
      <p className="text-[10px] text-[var(--foreground-muted)]">{scheduleHint(format)}</p>

      {format === "americano" ? (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-[var(--foreground-muted)]">
            Joueurs ({activeSolo.length})
          </h3>
          <ul className="text-sm text-white space-y-1">
            {activeSolo.map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>{e.playerName}</span>
                <span className="text-[var(--gold)] font-bold">{e.americanoPoints} pts</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-[var(--foreground-muted)]">
            Équipes ({activeEntries.length})
          </h3>
          <ul className="text-sm text-white space-y-1">
            {activeEntries.map((e) => (
              <li key={e.id}>
                {e.player1Name} + {e.player2Name}
                {e.seed != null ? ` · seed ${e.seed}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {format === "pools" && poolLabels.length > 0 ? (
        <div className="space-y-4">
          {poolLabels.map((poolLabel) => {
            const standings = computePoolStandings(
              activeEntries.map((e) => ({
                id: e.id,
                label: `${e.player1Name} / ${e.player2Name}`,
              })),
              matches.map((m) => ({
                poolLabel: parsePoolLabelFromRound(m.round) ?? "",
                team1EntryId: m.team1EntryId,
                team2EntryId: m.team2EntryId,
                winnerTeam: m.winnerTeam,
              })),
              poolLabel,
            );
            return (
              <div key={poolLabel} className="rounded-xl border border-[var(--border)] p-3">
                <h4 className="text-xs font-bold uppercase text-[var(--gold)] mb-2">
                  Poule {poolLabel}
                </h4>
                {standings.length === 0 ? (
                  <p className="text-xs text-[var(--foreground-muted)]">Pas encore de résultats.</p>
                ) : (
                  <ul className="text-xs text-white space-y-1">
                    {standings.map((row, index) => (
                      <li key={row.entryId} className="flex justify-between">
                        <span>
                          {index + 1}. {row.label}
                        </span>
                        <span className="text-[var(--foreground-muted)]">
                          {row.wins}V · {row.losses}D
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-[var(--foreground-muted)]">Matchs</h3>
        {matches.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">Aucun match généré.</p>
        ) : (
          <ul className="space-y-3">
            {matches.map((m) => {
              const e1 = entries.find((e) => e.id === m.team1EntryId);
              const e2 = entries.find((e) => e.id === m.team2EntryId);
              const poolLabel = parsePoolLabelFromRound(m.round);
              const americanoRound = m.round.startsWith("americano-r")
                ? m.round.replace("americano-r", "Rotation ")
                : null;

              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-[var(--border)] bg-black/20 p-3 text-sm text-white"
                >
                  <p className="text-[10px] font-bold uppercase text-[var(--gold)]">
                    {poolLabel ? `Poule ${poolLabel}` : americanoRound ?? m.round} · #{m.position + 1}
                  </p>
                  {format !== "americano" ? (
                    <>
                      <p className="mt-1">
                        <span className="text-slate-400">A</span>{" "}
                        {e1 ? `${e1.player1Name} / ${e1.player2Name}` : "—"}
                      </p>
                      <p>
                        <span className="text-slate-400">B</span>{" "}
                        {e2 ? `${e2.player1Name} / ${e2.player2Name}` : "—"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                      Match Américano — 4 joueurs (voir page match pour détail)
                    </p>
                  )}
                  {m.winnerTeam ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-emerald-400 font-bold">Vainqueur : équipe {m.winnerTeam}</p>
                      {m.setScores?.length ? (
                        <p className="text-xs text-[var(--foreground-muted)]">
                          Score : {formatSetScores(m.setScores)}
                        </p>
                      ) : null}
                    </div>
                  ) : m.matchId ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <MatchScoreForm locale={locale} matchId={m.matchId} tournamentId={tournamentId} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
