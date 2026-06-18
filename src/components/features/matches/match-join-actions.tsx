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
import type { ViewerParticipationPhase } from "@/domain/rules/match-participant";

type Props = {
  locale: string;
  matchId: string;
  matchType: MatchGenderType;
  viewerGender: Gender | null;
  participationPhase: ViewerParticipationPhase;
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
  participationPhase,
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
  const readyToConfirm = paymentMethod !== null && commitmentChecked;
  const [formError, setFormError] = useState<string | null>(null);

  const commitmentText = labels.commitmentLabel
    .replace("{price}", String(price))
    .replace("{club}", clubName);

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
    setFormError(null);

    if (!paymentMethod) {
      setFormError(labels.paymentRequired);
      return;
    }
    if (!commitmentChecked) {
      setFormError(labels.commitmentRequired);
      return;
    }

    startTransition(async () => {
      const res = await confirmMatchParticipationAction({
        locale,
        matchId,
        paymentMethod,
        paymentCommitment: true,
      });
      if (res.ok) {
        router.push(`/${locale}/matches/${matchId}?confirmed=1`);
        router.refresh();
      } else {
        setFormError(res.error);
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

  if (participationPhase === "confirmed") {
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

  if (participationPhase === "pending") {
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
          onSelect={(method) => {
            setPaymentMethod(method);
            setFormError(null);
          }}
          isRestricted={false}
          price={price}
          priceLabel={locale === "en" ? "Your share" : "Votre part"}
        />

        <button
          type="button"
          onClick={() => {
            setCommitmentChecked((checked) => !checked);
            setFormError(null);
          }}
          className={`w-full rounded-xl border-2 p-4 text-left transition-colors touch-manipulation ${
            commitmentChecked
              ? "border-gold bg-gold/10"
              : "border-white/20 bg-white/5 hover:border-white/35"
          }`}
          aria-pressed={commitmentChecked}
        >
          <span className="flex items-start gap-3 text-sm text-white/90">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                commitmentChecked
                  ? "border-gold bg-gold text-black"
                  : "border-white/40 bg-transparent"
              }`}
              aria-hidden="true"
            >
              {commitmentChecked ? "✓" : ""}
            </span>
            <span>{commitmentText}</span>
          </span>
        </button>

        {!commitmentChecked ? (
          <p className="text-xs text-amber-100/80">
            {locale === "en"
              ? "Check the commitment above to enable confirmation."
              : "Coche l’engagement ci-dessus pour activer la confirmation."}
          </p>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm font-medium text-red-300">{formError}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !readyToConfirm}
            onClick={onConfirm}
            className="flex-1 min-w-[140px] min-h-11 rounded-xl bg-gold text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
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
