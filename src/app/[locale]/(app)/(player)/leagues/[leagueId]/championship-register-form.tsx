"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerChampionshipEntryAction } from "@/modules/championships/actions";
import type { LeagueDivision } from "@/domain/types/championships";
import type { ProfilePick } from "@/modules/championships/repository";

type Props = {
  locale: string;
  leagueId: string;
  divisions: LeagueDivision[];
  partners: ProfilePick[];
  canRegister: boolean;
  labels: Record<string, string>;
};

export function ChampionshipRegisterForm({
  locale,
  leagueId,
  divisions,
  partners,
  canRegister,
  labels,
}: Props) {
  const router = useRouter();
  const [divisionId, setDivisionId] = useState(divisions[divisions.length - 1]?.id ?? "");
  const [partnerId, setPartnerId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canRegister) return;
    setPending(true);
    try {
      const res = await registerChampionshipEntryAction({
        locale,
        leagueId,
        divisionId,
        partnerPlayerId: partnerId,
        teamName: teamName.trim() || null,
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
        {labels.leaguesStatusRegistrationOpen === "Inscriptions ouvertes"
          ? "Les inscriptions ne sont pas ouvertes pour ce championnat."
          : "Registration is not open for this championship."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">S&apos;inscrire en binôme</h3>
      <p className="text-xs text-slate-500">
        Choisis ta division de départ et ton partenaire. La montée / descente se joue en fin de saison.
      </p>
      <select
        required
        value={divisionId}
        onChange={(e) => setDivisionId(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
        placeholder="Nom d'équipe (optionnel)"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      <select
        required
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">— Partenaire —</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName ?? p.id.slice(0, 8)}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Inscription…" : "Valider l'inscription"}
      </button>
    </form>
  );
}
