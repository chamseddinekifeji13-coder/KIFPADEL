"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  parseSetScorePair,
  validateMatchSetScores,
} from "@/domain/rules/match-score";
import { previewTeamEloImpact } from "@/domain/rules/rating";
import { recordMatchResultAction } from "@/modules/matches/actions/record-match-result";

type SetDraft = { a: string; b: string };

type RatingPreview = {
  teamA: number;
  teamB: number;
};

type MatchScoreFormProps = {
  locale: string;
  matchId: string;
  tournamentId?: string;
  className?: string;
  teamRatings?: RatingPreview | null;
  trustPreviewLabel?: string;
};

const EMPTY_SET: SetDraft = { a: "", b: "" };

export function MatchScoreForm({
  locale,
  matchId,
  tournamentId,
  className,
  teamRatings,
  trustPreviewLabel,
}: MatchScoreFormProps) {
  const router = useRouter();
  const [sets, setSets] = useState<SetDraft[]>([{ ...EMPTY_SET }, { ...EMPTY_SET }]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const updateSet = (index: number, side: "a" | "b", value: string) => {
    setSets((prev) =>
      prev.map((set, i) => (i === index ? { ...set, [side]: value } : set)),
    );
  };

  const addSet = () => {
    if (sets.length >= 3) {
      return;
    }
    setSets((prev) => [...prev, { ...EMPTY_SET }]);
  };

  const parsedSets = useMemo(
    () =>
      sets
        .filter((set) => set.a.trim() !== "" || set.b.trim() !== "")
        .map((set) => parseSetScorePair(set.a, set.b))
        .filter((set): set is { a: number; b: number } => set !== null),
    [sets],
  );

  const scoreValidation = useMemo(() => {
    if (parsedSets.length === 0) {
      return null;
    }
    const result = validateMatchSetScores(parsedSets);
    return result.ok ? result : null;
  }, [parsedSets]);

  const eloPreview = useMemo(() => {
    if (!scoreValidation || !teamRatings) {
      return null;
    }
    return previewTeamEloImpact(
      teamRatings.teamA,
      teamRatings.teamB,
      scoreValidation.winnerTeam,
    );
  }, [scoreValidation, teamRatings]);

  const onSubmit = async () => {
    setError("");
    setPending(true);

    const result = await recordMatchResultAction({
      locale,
      matchId,
      tournamentId,
      sets: parsedSets,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
        Meilleur des 3 sets — saisissez les jeux par set (ex. 6-4, 7-5). Le vainqueur est calculé
        automatiquement.
      </p>

      {sets.map((set, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-12 text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
            Set {index + 1}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={7}
            placeholder="A"
            value={set.a}
            onChange={(e) => updateSet(index, "a", e.target.value)}
            className="h-10 w-14 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm text-white"
          />
          <span className="text-[var(--foreground-muted)]">-</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={7}
            placeholder="B"
            value={set.b}
            onChange={(e) => updateSet(index, "b", e.target.value)}
            className="h-10 w-14 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm text-white"
          />
        </div>
      ))}

      {sets.length < 3 ? (
        <button
          type="button"
          onClick={addSet}
          className="text-xs font-bold text-[var(--gold)] hover:underline"
        >
          + Ajouter un set
        </button>
      ) : null}

      {eloPreview && scoreValidation ? (
        <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
            Impact ELO estimé
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <EloDeltaChip
              team="A"
              isWinner={scoreValidation.winnerTeam === "A"}
              delta={eloPreview.teamADelta}
              avgRating={teamRatings?.teamA}
            />
            <EloDeltaChip
              team="B"
              isWinner={scoreValidation.winnerTeam === "B"}
              delta={eloPreview.teamBDelta}
              avgRating={teamRatings?.teamB}
            />
          </div>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Par joueur : l&apos;équipe gagnante gagne des points, l&apos;équipe perdante en perd.
          </p>
          {trustPreviewLabel ? (
            <p className="text-[10px] text-emerald-400/90 border-t border-white/10 pt-2">
              {trustPreviewLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}

      <button
        type="button"
        disabled={pending || parsedSets.length === 0}
        onClick={onSubmit}
        className={cn(
          "tap-target w-full min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold",
          pending || parsedSets.length === 0
            ? "bg-white/10 text-white/50"
            : "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)]",
        )}
      >
        {pending ? "Enregistrement…" : "Valider le score"}
      </button>
    </div>
  );
}

function EloDeltaChip({
  team,
  isWinner,
  delta,
  avgRating,
}: {
  team: "A" | "B";
  isWinner: boolean;
  delta: number;
  avgRating?: number;
}) {
  const formatted = delta > 0 ? `+${delta}` : String(delta);
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        isWinner ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/20 bg-rose-500/5",
      )}
    >
      <p className="text-[10px] font-bold text-white/70">Équipe {team}</p>
      {avgRating != null ? (
        <p className="text-[10px] text-white/50">Moy. {avgRating} ELO</p>
      ) : null}
      <p
        className={cn(
          "text-sm font-black font-mono",
          delta > 0 ? "text-emerald-300" : "text-rose-300",
        )}
      >
        {formatted} pts
      </p>
    </div>
  );
}
