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
  isOpen: boolean;
  teamACount: number;
  teamBCount: number;
};

export function MatchJoinActions({
  locale,
  matchId,
  matchType,
  viewerGender,
  alreadyJoined,
  isOpen,
  teamACount,
  teamBCount,
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
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  if (!isOpen) {
    return <p className="text-sm text-slate-500">Ce match n&apos;est plus ouvert.</p>;
  }

  if (alreadyJoined) {
    return <p className="text-sm font-medium text-emerald-600">Tu es inscrit sur ce match.</p>;
  }

  if (matchFull) {
    return <p className="text-sm text-slate-500">Match complet.</p>;
  }

  if (!canJoin) {
    return (
      <p className="text-sm text-amber-700">
        Pour ce type de match, indique ton genre dans ton profil (ou choisis un match « Tous »).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-800">Rejoindre</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || teamAFull}
          onClick={() => onJoin("A")}
          className="flex-1 min-w-[120px] h-11 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40"
        >
          Équipe A {teamAFull ? "(pleine)" : `(${teamACount}/2)`}
        </button>
        <button
          type="button"
          disabled={pending || teamBFull}
          onClick={() => onJoin("B")}
          className="flex-1 min-w-[120px] h-11 rounded-xl border border-slate-300 text-slate-900 text-sm font-bold disabled:opacity-40"
        >
          Équipe B {teamBFull ? "(pleine)" : `(${teamBCount}/2)`}
        </button>
      </div>
    </div>
  );
}
