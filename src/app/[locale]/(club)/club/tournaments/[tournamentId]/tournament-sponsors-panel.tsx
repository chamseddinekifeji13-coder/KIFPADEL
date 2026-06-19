"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { updateTournamentSponsorsAction } from "@/modules/tournaments/actions";
import type { SponsorRow } from "@/modules/sponsors/repository";
import { TournamentDisplaySponsorsBar } from "@/components/features/tournaments/tournament-display-sponsors-bar";

type Props = {
  locale: string;
  tournamentId: string;
  sponsorOptions: SponsorRow[];
  linkedSponsors: SponsorRow[];
  isHost: boolean;
};

export function TournamentSponsorsPanel({
  locale,
  tournamentId,
  sponsorOptions,
  linkedSponsors,
  isHost,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedSponsors.map((s) => s.id));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setSelectedIds(linkedSponsors.map((s) => s.id));
    }
  }, [linkedSponsors, editing]);

  if (!isHost && linkedSponsors.length === 0) {
    return null;
  }

  const previewSponsors = sponsorOptions.filter((s) => selectedIds.includes(s.id));

  const onSave = async () => {
    setError("");
    setPending(true);
    const res = await updateTournamentSponsorsAction({
      locale,
      tournamentId,
      sponsorIds: selectedIds,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(false);
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Sponsors</h2>
        {isHost && sponsorOptions.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (editing) {
                setSelectedIds(linkedSponsors.map((s) => s.id));
                setError("");
              }
              setEditing((v) => !v);
            }}
            className="text-xs font-bold text-[var(--gold)] hover:underline"
          >
            {editing ? "Annuler" : "Modifier"}
          </button>
        ) : null}
      </div>

      {!editing ? (
        <>
          {linkedSponsors.length > 0 ? (
            <TournamentDisplaySponsorsBar
              sponsors={linkedSponsors}
              title="Sponsors du tournoi"
              variant="inline"
            />
          ) : (
          <p className="text-xs text-[var(--foreground-muted)]">
            {sponsorOptions.length === 0
              ? "Aucun sponsor disponible — le super admin peut en ajouter dans l’administration."
              : "Aucun sponsor spécifique — l’écran TV affiche les partenaires globaux de la plateforme."}
          </p>
        )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Cochez les partenaires à afficher sur l’écran TV. Laissez tout décoché pour revenir aux
            sponsors globaux.
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {sponsorOptions.map((sponsor) => {
              const checked = selectedIds.includes(sponsor.id);
              return (
                <label
                  key={sponsor.id}
                  className="flex items-center gap-3 text-xs text-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedIds((prev) =>
                        checked ? prev.filter((id) => id !== sponsor.id) : [...prev, sponsor.id],
                      );
                    }}
                  />
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt=""
                      className="h-8 w-16 object-contain rounded bg-white/5"
                    />
                  ) : null}
                  <span>{sponsor.name}</span>
                </label>
              );
            })}
          </div>

          {previewSponsors.length > 0 ? (
            <TournamentDisplaySponsorsBar
              sponsors={previewSponsors}
              title="Aperçu"
              variant="inline"
            />
          ) : null}

          {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}

          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold",
              pending ? "bg-white/10 text-white/40" : "bg-[var(--gold)] text-black",
            )}
          >
            {pending ? "Enregistrement…" : "Enregistrer les sponsors"}
          </button>
        </div>
      )}
    </section>
  );
}
