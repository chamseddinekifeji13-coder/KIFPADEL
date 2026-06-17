"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinOpenMatchAction } from "@/modules/matches/actions";
import { canJoinMatchByGenderRules } from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";

type Props = {
  locale: string;
  matchId: string;
  matchType: MatchGenderType;
  viewerGender: Gender | null;
  alreadyJoined: boolean;
  viewerTeam?: "A" | "B" | null;
  isOpen: boolean;
  teamACount: number;
  teamBCount: number;
  labels: {
    joinTitle: string;
    teamA: string;
    teamB: string;
    teamFull: string;
    alreadyJoined: string;
    viewerTeam: string;
    matchClosed: string;
    matchFull: string;
    genderRequired: string;
    joining: string;
  };
};

export function MatchJoinActions({
  locale,
  matchId,
  matchType,
  viewerGender,
  alreadyJoined,
  viewerTeam,
  isOpen,
  teamACount,
  teamBCount,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const canJoin = canJoinMatchByGenderRules(viewerGender, matchType);
  const teamAFull = teamACount >= 2;
  const teamBFull = teamBCount >= 2;
  const matchFull = teamACount + teamBCount >= 4;

  const onJoin = (team: "A" | "B") => {
    startTransition(async () => {
      const res = await joinOpenMatchAction({ locale, matchId, team });
      if (res.ok) {
        router.push(
          `/${locale}/matches/${matchId}?joined=1&team=${encodeURIComponent(res.team)}`,
        );
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  if (!isOpen) {
    return <p className="text-sm text-white/60">{labels.matchClosed}</p>;
  }

  if (alreadyJoined) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 space-y-1"
      >
        <p className="font-bold">{labels.alreadyJoined}</p>
        {viewerTeam ? (
          <p className="text-emerald-100/90">
            {labels.viewerTeam.replace("{team}", viewerTeam)}
          </p>
        ) : null}
      </div>
    );
  }

  if (matchFull) {
    return <p className="text-sm text-white/60">{labels.matchFull}</p>;
  }

  if (!canJoin) {
    return <p className="text-sm text-amber-200/90">{labels.genderRequired}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-white">{labels.joinTitle}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || teamAFull}
          onClick={() => onJoin("A")}
          className="flex-1 min-w-[120px] min-h-11 rounded-xl bg-gold text-black text-sm font-bold disabled:opacity-40 touch-manipulation"
        >
          {pending ? labels.joining : labels.teamA.replace("{count}", String(teamACount))}
          {teamAFull ? ` ${labels.teamFull}` : ""}
        </button>
        <button
          type="button"
          disabled={pending || teamBFull}
          onClick={() => onJoin("B")}
          className="flex-1 min-w-[120px] min-h-11 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-bold disabled:opacity-40 touch-manipulation"
        >
          {pending ? labels.joining : labels.teamB.replace("{count}", String(teamBCount))}
          {teamBFull ? ` ${labels.teamFull}` : ""}
        </button>
      </div>
    </div>
  );
}
