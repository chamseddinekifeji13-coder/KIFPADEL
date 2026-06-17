"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodSelector } from "@/components/features/bookings/payment-method-selector";
import {
  confirmMatchParticipationAction,
  declineMatchParticipationAction,
  joinOpenMatchAction,
} from "@/modules/matches/actions";
import { canJoinMatchByGenderRules } from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import type { MatchParticipantStatus } from "@/domain/rules/match-participant";

type Props = {
  locale: string;
  matchId: string;
  matchType: MatchGenderType;
  viewerGender: Gender | null;
  participationStatus: MatchParticipantStatus | null;
  viewerTeam?: "A" | "B" | null;
  sharePrice: number;
  clubName: string;
  isOpen: boolean;
  teamACount: number;
  teamBCount: number;
  labels: {
    joinTitle: string;
    teamA: string;
    teamB: string;
    teamFull: string;
    participationConfirmed: string;
    participationPendingTitle: string;
    participationPendingHint: string;
    viewerTeam: string;
    matchClosed: string;
    matchFull: string;
    genderRequired: string;
    joining: string;
    confirmParticipation: string;
    declineParticipation: string;
    confirming: string;
    declining: string;
    commitmentLabel: string;
    commitmentRequired: string;
    paymentRequired: string;
  };
};

export function MatchJoinActions({
  locale,
  matchId,
  matchType,
  viewerGender,
  participationStatus,
  viewerTeam,
  sharePrice,
  clubName,
  isOpen,
  teamACount,
  teamBCount,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<"online" | "on_site" | null>(null);
  const [commitmentChecked, setCommitmentChecked] = useState(false);

  const canJoin = canJoinMatchByGenderRules(viewerGender, matchType);
  const teamAFull = teamACount >= 2;
  const teamBFull = teamBCount >= 2;
  const matchFull = teamACount + teamBCount >= 4;
  const price = Number.isFinite(sharePrice) ? sharePrice : 0;

  const onJoin = (team: "A" | "B") => {
    startTransition(async () => {
      const res = await joinOpenMatchAction({ locale, matchId, team });
      if (res.ok) {
        router.push(
          `/${locale}/matches/${matchId}?reserved=1&team=${encodeURIComponent(res.team)}`,
        );
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const onConfirm = () => {
    if (!paymentMethod) {
      alert(labels.paymentRequired);
      return;
    }
    if (!commitmentChecked) {
      alert(labels.commitmentRequired);
      return;
    }

    startTransition(async () => {
      const res = await confirmMatchParticipationAction({
        locale,
        matchId,
        paymentMethod,
      });
      if (res.ok) {
        router.push(`/${locale}/matches/${matchId}?confirmed=1`);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const onDecline = () => {
    startTransition(async () => {
      const res = await declineMatchParticipationAction({ locale, matchId });
      if (res.ok) {
        router.push(`/${locale}/matches/${matchId}`);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  if (!isOpen) {
    return <p className="text-sm text-white/60">{labels.matchClosed}</p>;
  }

  if (participationStatus === "confirmed") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 space-y-1"
      >
        <p className="font-bold">{labels.participationConfirmed}</p>
        {viewerTeam ? (
          <p className="text-emerald-100/90">
            {labels.viewerTeam.replace("{team}", viewerTeam)}
          </p>
        ) : null}
        {price > 0 ? (
          <p className="text-emerald-100/80 text-xs">
            {labels.commitmentLabel
              .replace("{price}", String(price))
              .replace("{club}", clubName)}
          </p>
        ) : null}
      </div>
    );
  }

  if (participationStatus === "pending") {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-100">{labels.participationPendingTitle}</p>
          {viewerTeam ? (
            <p className="text-sm text-amber-100/90">
              {labels.viewerTeam.replace("{team}", viewerTeam)}
            </p>
          ) : null}
          <p className="text-xs text-amber-100/70">{labels.participationPendingHint}</p>
        </div>

        <PaymentMethodSelector
          selected={paymentMethod}
          onSelect={setPaymentMethod}
          isRestricted={false}
          price={price}
          priceLabel={locale === "en" ? "Your share" : "Votre part"}
        />

        <label className="flex items-start gap-3 text-sm text-white/90 cursor-pointer">
          <input
            type="checkbox"
            checked={commitmentChecked}
            onChange={(e) => setCommitmentChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/30 accent-[var(--gold)]"
          />
          <span>
            {labels.commitmentLabel
              .replace("{price}", String(price))
              .replace("{club}", clubName)}
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 min-w-[140px] min-h-11 rounded-xl bg-gold text-black text-sm font-bold disabled:opacity-40 touch-manipulation"
          >
            {pending ? labels.confirming : labels.confirmParticipation}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDecline}
            className="flex-1 min-w-[120px] min-h-11 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-bold disabled:opacity-40 touch-manipulation"
          >
            {pending ? labels.declining : labels.declineParticipation}
          </button>
        </div>
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
