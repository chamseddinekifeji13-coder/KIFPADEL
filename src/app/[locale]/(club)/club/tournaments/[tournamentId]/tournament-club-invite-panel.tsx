"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { respondTournamentClubInviteAction } from "@/modules/tournaments/actions";
import type { TournamentParticipatingClub } from "@/domain/rules/tournament-club-standings";

type Props = {
  locale: string;
  tournamentId: string;
  currentClubId: string;
  participatingClubs: TournamentParticipatingClub[];
};

export function TournamentClubInvitePanel({
  locale,
  tournamentId,
  currentClubId,
  participatingClubs,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const invite = participatingClubs.find(
    (p) => p.clubId === currentClubId && p.role === "invited" && p.status === "pending",
  );

  if (!invite) {
    return null;
  }

  const respond = async (decision: "accepted" | "declined") => {
    setError("");
    setPending(true);
    const res = await respondTournamentClubInviteAction({
      locale,
      tournamentId,
      clubId: currentClubId,
      decision,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 space-y-3">
      <p className="text-sm font-bold text-white">Invitation inter-clubs</p>
      <p className="text-xs text-[var(--foreground-muted)]">
        Un autre club vous invite à participer à ce tournoi. Acceptez pour que vos joueurs puissent
        s’inscrire.
      </p>
      {error ? <p className="text-xs font-semibold text-rose-400">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("accepted")}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold",
            pending ? "bg-white/10 text-white/40" : "bg-[var(--gold)] text-black",
          )}
        >
          Accepter
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("declined")}
          className="rounded-xl px-4 py-2 text-xs font-bold bg-white/10 text-white hover:bg-white/15"
        >
          Décliner
        </button>
      </div>
    </div>
  );
}
