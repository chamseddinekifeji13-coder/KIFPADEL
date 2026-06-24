"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createChampionshipAction } from "@/modules/championships/actions";

type Props = {
  locale: string;
  labels: Record<string, string>;
};

export function ChampionshipCreateForm({ locale, labels }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [divisionCount, setDivisionCount] = useState<2 | 3>(3);
  const [openNow, setOpenNow] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await createChampionshipAction({
        locale,
        title: title.trim(),
        description: description.trim() || null,
        seasonLabel: seasonLabel.trim(),
        openNow,
        divisionCount,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/${locale}/club/leagues/${res.data!.leagueId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-bold text-white">{labels.leaguesCreateTitle}</h2>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">Titre</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
          {labels.leaguesCreateSeasonLabel}
        </label>
        <input
          required
          value={seasonLabel}
          onChange={(e) => setSeasonLabel(e.target.value)}
          placeholder={labels.leaguesCreateSeasonHint}
          className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
          {labels.leaguesCreateDivisionCount}
        </p>
        <div className="grid gap-2">
          {(
            [
              { value: 3 as const, label: labels.leaguesCreateDivision3 },
              { value: 2 as const, label: labels.leaguesCreateDivision2 },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm text-white",
                divisionCount === option.value
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-[var(--border)] bg-black/20",
              )}
            >
              <input
                type="radio"
                name="divisionCount"
                checked={divisionCount === option.value}
                onChange={() => setDivisionCount(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
        {labels.leaguesCreateOpenNow}
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--gold)] py-3 text-sm font-bold text-black disabled:opacity-60"
      >
        {pending ? labels.leaguesCreatePending : labels.leaguesCreateCta}
      </button>
    </form>
  );
}
