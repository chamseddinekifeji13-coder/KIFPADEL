"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createTournamentAction } from "@/modules/tournaments/actions";

type Props = {
  locale: string;
};

export function TournamentCreateForm({ locale }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [fee, setFee] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const feeNum = fee.trim() === "" ? null : Math.round(Number(fee) * 100);
      if (fee.trim() !== "" && !Number.isFinite(feeNum as number)) {
        setError("Frais d’inscription invalides.");
        return;
      }
      const res = await createTournamentAction({
        locale,
        title: title.trim(),
        description: description.trim() || null,
        startsAtIso: startsAt ? new Date(startsAt).toISOString() : null,
        endsAtIso: endsAt ? new Date(endsAt).toISOString() : null,
        entryFeeCents: feeNum,
        initialStatus: openNow ? "registration_open" : "draft",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/${locale}/club/tournaments/${res.data!.tournamentId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-bold text-white">Nouveau tournoi</h2>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">Début</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">Fin</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
          Frais (TND, optionnel)
        </label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm text-white"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
        <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
        Ouvrir les inscriptions tout de suite
      </label>
      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-bold transition-colors",
          pending ? "bg-white/10 text-white/40" : "bg-[var(--gold)] text-black hover:bg-[var(--gold-dark)]",
        )}
      >
        {pending ? "Création…" : "Créer le tournoi"}
      </button>
    </form>
  );
}
