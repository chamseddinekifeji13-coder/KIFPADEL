"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { recordMatchResultAction } from "@/modules/matches/actions/record-match-result";

type SetDraft = { a: string; b: string };

type MatchScoreFormProps = {
  locale: string;
  matchId: string;
  tournamentId?: string;
  className?: string;
};

const EMPTY_SET: SetDraft = { a: "", b: "" };

export function MatchScoreForm({ locale, matchId, tournamentId, className }: MatchScoreFormProps) {
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

  const onSubmit = async () => {
    setError("");
    setPending(true);

    const parsedSets = sets
      .filter((set) => set.a.trim() !== "" || set.b.trim() !== "")
      .map((set) => ({ a: Number(set.a), b: Number(set.b) }));

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

      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={onSubmit}
        className={cn(
          "tap-target w-full min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold",
          pending ? "bg-white/10 text-white/50" : "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)]",
        )}
      >
        {pending ? "Enregistrement…" : "Valider le score"}
      </button>
    </div>
  );
}
