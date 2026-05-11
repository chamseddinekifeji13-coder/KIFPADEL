"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { createTournamentEntryAction } from "@/modules/tournaments/actions";
import type { ProfilePick } from "@/modules/tournaments/repository";

type Props = {
  locale: string;
  tournamentId: string;
  partners: ProfilePick[];
  canRegister: boolean;
};

export function TournamentRegisterForm({ locale, tournamentId, partners, canRegister }: Props) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canRegister) return;
    setPending(true);
    try {
      const res = await createTournamentEntryAction({
        locale,
        tournamentId,
        partnerPlayerId: partnerId,
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

  if (!canRegister) {
    return (
      <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
        Les inscriptions ne sont pas ouvertes pour ce tournoi.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">S&apos;inscrire en équipe</h3>
      <p className="text-xs text-slate-500">
        Tu seras enregistré comme joueur 1 ; choisis ton partenaire (joueur 2). V1 : sans confirmation du
        partenaire côté app.
      </p>
      <select
        required
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">— Partenaire —</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name ?? p.id.slice(0, 8)}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600 font-semibold">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || !partnerId}
        className={cn(
          "w-full rounded-xl py-2 text-sm font-bold",
          pending ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white",
        )}
      >
        {pending ? "…" : "Confirmer l’inscription"}
      </button>
    </form>
  );
}
