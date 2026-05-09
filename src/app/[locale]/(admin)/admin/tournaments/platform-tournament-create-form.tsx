"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createPlatformTournamentAction } from "@/modules/admin/actions/platform-tournaments";
import { cn } from "@/lib/utils/cn";

type ClubOption = { id: string; name: string; city: string };

const SCOPES = [
  { value: "interclub" as const, label: "Inter-clubs" },
  { value: "inter_region" as const, label: "Inter-région" },
  { value: "platform" as const, label: "Plateforme (nationale)" },
];

type Props = Readonly<{
  locale: string;
  clubs: ClubOption[];
}>;

export function PlatformTournamentCreateForm({ locale, clubs }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostClubId, setHostClubId] = useState(clubs[0]?.id ?? "");
  const [tournamentScope, setTournamentScope] = useState<(typeof SCOPES)[number]["value"]>("interclub");
  const [regionsDisplay, setRegionsDisplay] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [fee, setFee] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const feeNum = fee.trim() === "" ? null : Math.round(Number(fee) * 100);
      if (fee.trim() !== "" && !Number.isFinite(feeNum as number)) {
        setError("Frais d'inscription invalides.");
        return;
      }
      if (!hostClubId) {
        setError("Choisis un club hôte.");
        return;
      }
      const res = await createPlatformTournamentAction({
        locale,
        title: title.trim(),
        hostClubId,
        tournamentScope,
        description: description.trim() || null,
        regionsDisplay: regionsDisplay.trim() || null,
        startsAtIso: startsAt ? new Date(startsAt).toISOString() : null,
        endsAtIso: endsAt ? new Date(endsAt).toISOString() : null,
        entryFeeCents: feeNum,
        initialStatus: openNow ? "registration_open" : "draft",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/${locale}/tournaments/${res.tournamentId}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">Nouveau tournoi plateforme</h2>
        <p className="mt-1 text-xs text-slate-600">
          Le <strong>club hôte</strong> fournit les terrains et la gestion opérationnelle (tableau, matchs). Les
          inscriptions restent ouvertes à tous les joueurs via la liste publique des tournois.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">Portée</label>
        <select
          value={tournamentScope}
          onChange={(e) => setTournamentScope(e.target.value as (typeof SCOPES)[number]["value"])}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">Club hôte *</label>
        <select
          required
          value={hostClubId}
          onChange={(e) => setHostClubId(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {clubs.length === 0 ? (
            <option value="">Aucun club actif</option>
          ) : (
            clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` · ${c.city}` : ""}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">Titre *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Ex. Coupe interclubs Sud"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">
          Zones / régions (affichage public, texte libre)
        </label>
        <input
          value={regionsDisplay}
          onChange={(e) => setRegionsDisplay(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Ex. Grand Tunis, Sahel, Sud"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Début</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">Fin</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-slate-500">Frais (TND, optionnel)</label>
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          inputMode="decimal"
          placeholder="0"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
        Ouvrir les inscriptions tout de suite
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || clubs.length === 0}
        className={cn(
          "w-full rounded-md py-2.5 text-sm font-bold text-white transition-colors",
          pending || clubs.length === 0 ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800",
        )}
      >
        {pending ? "Création…" : "Créer le tournoi"}
      </button>
    </form>
  );
}
