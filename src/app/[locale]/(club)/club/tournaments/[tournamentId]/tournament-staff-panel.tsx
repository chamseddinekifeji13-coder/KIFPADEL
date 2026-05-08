"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  generateKnockoutBracketAction,
  setTournamentMatchWinnerAction,
  updateTournamentStatusAction,
} from "@/modules/tournaments/actions";
import type { TournamentStatus } from "@/domain/types/tournaments";
import type { TournamentMatchWithMeta, TournamentEntryWithNames } from "@/modules/tournaments/repository";

type Props = {
  locale: string;
  tournamentId: string;
  status: TournamentStatus;
  entries: TournamentEntryWithNames[];
  matches: TournamentMatchWithMeta[];
  canGenerateBracket: boolean;
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

export function TournamentStaffPanel({
  locale,
  tournamentId,
  status,
  entries,
  matches,
  canGenerateBracket,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const ns = nextStatus(status);

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
    const res = await generateKnockoutBracketAction({ locale, tournamentId });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const onWinner = async (matchId: string, winnerTeam: "A" | "B") => {
    setError("");
    setPending(matchId + winnerTeam);
    const res = await setTournamentMatchWinnerAction({ locale, tournamentId, matchId, winnerTeam });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {ns ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => onStatus(ns)}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold",
              "bg-white/10 text-white hover:bg-white/15",
            )}
          >
            Statut → {ns}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canGenerateBracket || pending !== null}
          onClick={onGenerate}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold",
            canGenerateBracket && !pending
              ? "bg-[var(--gold)] text-black"
              : "bg-white/5 text-white/40",
          )}
        >
          {pending === "gen" ? "…" : "Générer le tableau (phase 1)"}
        </button>
      </div>
      <p className="text-[10px] text-[var(--foreground-muted)]">
        V1 : nombre d’équipes = puissance de 2 (4, 8, 16…). Une seule phase de poules KO est créée ; phases
        suivantes : TODO.
      </p>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-[var(--foreground-muted)]">Équipes ({entries.length})</h3>
        <ul className="text-sm text-white space-y-1">
          {entries.map((e) => (
            <li key={e.id}>
              {e.player1Name} + {e.player2Name}
              {e.seed != null ? ` · seed ${e.seed}` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-[var(--foreground-muted)]">Matchs</h3>
        {matches.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">Aucun match généré.</p>
        ) : (
          <ul className="space-y-3">
            {matches.map((m) => {
              const e1 = entries.find((e) => e.id === m.team1EntryId);
              const e2 = entries.find((e) => e.id === m.team2EntryId);
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-[var(--border)] bg-black/20 p-3 text-sm text-white"
                >
                  <p className="text-[10px] font-bold uppercase text-[var(--gold)]">
                    {m.round} · #{m.position + 1}
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-400">A</span>{" "}
                    {e1 ? `${e1.player1Name} / ${e1.player2Name}` : "—"}
                  </p>
                  <p>
                    <span className="text-slate-400">B</span>{" "}
                    {e2 ? `${e2.player1Name} / ${e2.player2Name}` : "—"}
                  </p>
                  {m.winnerTeam ? (
                    <p className="mt-2 text-emerald-400 font-bold">Vainqueur : équipe {m.winnerTeam}</p>
                  ) : m.matchId ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => onWinner(m.matchId!, "A")}
                        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20"
                      >
                        Gagnant A
                      </button>
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => onWinner(m.matchId!, "B")}
                        className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20"
                      >
                        Gagnant B
                      </button>
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
