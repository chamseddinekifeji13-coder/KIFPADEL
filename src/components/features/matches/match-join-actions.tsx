"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  PaymentMethodSelector,
  type PlayerPaymentMethod,
} from "@/components/features/bookings/payment-method-selector";
import {
  confirmMatchParticipationAction,
  declineMatchParticipationAction,
  joinOpenMatchAction,
  switchMatchTeamAction,
} from "@/modules/matches/actions";
import { canJoinMatchByGenderRules } from "@/domain/rules/match-gender";
import type { Gender, MatchGenderType } from "@/domain/types/core";
import type { ViewerParticipationPhase } from "@/domain/rules/match-participant";
import type { MatchParticipantProfile } from "@/modules/matches/participant-profiles";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: string;
  matchId: string;
  matchType: MatchGenderType;
  viewerGender: Gender | null;
  viewerId?: string | null;
  participationPhase: ViewerParticipationPhase;
  viewerTeam?: "A" | "B" | null;
  sharePrice: number;
  clubName: string;
  walletBalance: number;
  walletHref: string;
  isOpen: boolean;
  matchStarted: boolean;
  teamACount: number;
  teamBCount: number;
  participants: MatchParticipantProfile[];
  racketUnitPrice?: number;
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
    matchStarted: string;
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

function teamPlayers(participants: MatchParticipantProfile[], team: "A" | "B") {
  return participants.filter((p) => p.team === team);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function TeamChoiceCard({
  team,
  title,
  players,
  count,
  full,
  selected,
  disabled,
  pending,
  onSelect,
  pickLabel,
  fullLabel,
  emptySlotLabel,
  isEn,
}: {
  team: "A" | "B";
  title: string;
  players: MatchParticipantProfile[];
  count: number;
  full: boolean;
  selected: boolean;
  disabled: boolean;
  pending: boolean;
  onSelect: (team: "A" | "B") => void;
  pickLabel: string;
  fullLabel: string;
  emptySlotLabel: string;
  isEn: boolean;
}) {
  const openSlots = Math.max(0, 2 - count);

  return (
    <button
      type="button"
      disabled={disabled || pending || full}
      onClick={() => onSelect(team)}
      className={cn(
        "min-h-[120px] rounded-xl border-2 p-3 text-left transition-all touch-manipulation",
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/10"
          : full
            ? "border-[var(--border)] bg-[var(--background)] opacity-50 cursor-not-allowed"
            : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--foreground-muted)] cursor-pointer",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            selected ? "text-[var(--gold)]" : "text-white",
          )}
        >
          {title}
        </span>
        <span className="text-[10px] font-bold text-[var(--foreground-muted)]">
          {count} / 2{full ? ` ${fullLabel}` : ""}
        </span>
      </div>
      <div className="space-y-1.5">
        {players.map((player) => (
          <div key={player.playerId} className="flex items-center gap-2 min-w-0">
            <Avatar
              src={player.avatarUrl}
              alt={player.displayName}
              fallback={initials(player.displayName)}
              size="sm"
              className="h-6 w-6 border-[var(--border)] bg-[var(--surface-elevated)] shrink-0"
            />
            <p className="text-xs font-medium text-white truncate flex-1">{player.displayName}</p>
            {player.participationPhase === "pending" ? (
              <span className="text-[9px] font-bold uppercase text-amber-300/90 shrink-0">
                {isEn ? "pending" : "attente"}
              </span>
            ) : null}
          </div>
        ))}
        {openSlots > 0
          ? Array.from({ length: openSlots }).map((_, index) => (
              <p key={`open-${team}-${index}`} className="text-xs text-[var(--foreground-muted)] italic pl-8">
                {emptySlotLabel}
              </p>
            ))
          : null}
      </div>
      {!full && !disabled ? (
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">
          {pending ? "…" : selected ? (isEn ? "Selected" : "Sélectionnée") : pickLabel}
        </p>
      ) : null}
    </button>
  );
}

function RacketSelector({
  locale,
  racketUnit,
  rentRacket,
  onRentChange,
}: {
  locale: string;
  racketUnit: number;
  rentRacket: boolean;
  onRentChange: (rent: boolean) => void;
}) {
  const isEn = locale === "en";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        {isEn ? `Racket · ${racketUnit} DT` : `Raquette · ${racketUnit} DT`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onRentChange(false)}
          className={cn(
            "min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
            !rentRacket
              ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
              : "border-[var(--border)] text-[var(--foreground-muted)]",
          )}
        >
          {isEn ? "I have my racket" : "J'ai ma raquette"}
        </button>
        <button
          type="button"
          onClick={() => onRentChange(true)}
          className={cn(
            "min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
            rentRacket
              ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
              : "border-[var(--border)] text-[var(--foreground-muted)]",
          )}
        >
          {isEn ? "I rent a racket" : "Je loue une raquette"}
        </button>
      </div>
      {rentRacket ? (
        <p className="text-[10px] text-[var(--foreground-muted)]">
          {isEn
            ? `+${racketUnit} DT to pay at the club desk.`
            : `+${racketUnit} DT à régler au comptoir du club.`}
        </p>
      ) : null}
    </div>
  );
}

export function MatchJoinActions({
  locale,
  matchId,
  matchType,
  viewerGender,
  participationPhase,
  viewerTeam,
  sharePrice,
  clubName,
  walletBalance,
  walletHref,
  isOpen,
  matchStarted,
  teamACount,
  teamBCount,
  participants,
  racketUnitPrice = 0,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PlayerPaymentMethod | null>(null);
  const [commitmentChecked, setCommitmentChecked] = useState(false);
  const [rentRacket, setRentRacket] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isEn = locale === "en";
  const isJoining = participationPhase === "none";
  const isPending = participationPhase === "pending";
  const canJoin = canJoinMatchByGenderRules(viewerGender, matchType);
  const teamAFull = teamACount >= 2;
  const teamBFull = teamBCount >= 2;
  const matchFull = teamACount + teamBCount >= 4;
  const price = Number.isFinite(sharePrice) ? sharePrice : 0;
  const balance = Number.isFinite(walletBalance) ? walletBalance : 0;
  const racketUnit = racketUnitPrice > 0 ? racketUnitPrice : 0;
  const racketFee = racketUnit > 0 && rentRacket ? racketUnit : 0;
  const totalCommitment = price + racketFee;

  const activeTeam = isPending ? viewerTeam ?? null : selectedTeam;
  const canSwitchToA =
    !matchStarted && (isPending ? !teamAFull || viewerTeam === "A" : !teamAFull);
  const canSwitchToB =
    !matchStarted && (isPending ? !teamBFull || viewerTeam === "B" : !teamBFull);

  const readyToConfirm =
    activeTeam !== null &&
    paymentMethod !== null &&
    commitmentChecked &&
    (paymentMethod === "on_site" || totalCommitment <= 0 || balance >= price);

  const commitmentText = labels.commitmentLabel
    .replace("{price}", String(totalCommitment))
    .replace("{club}", clubName);

  const teamAPlayers = teamPlayers(participants, "A");
  const teamBPlayers = teamPlayers(participants, "B");

  const onTeamSelect = (team: "A" | "B") => {
    setFormError(null);
    if (isPending) {
      if (viewerTeam === team) return;
      startTransition(async () => {
        const res = await switchMatchTeamAction({ locale, matchId, team });
        if (res.ok) {
          router.push(
            `/${locale}/matches/${matchId}?reserved=1&team=${encodeURIComponent(res.team)}`,
          );
          router.refresh();
        } else {
          setFormError(res.error);
        }
      });
      return;
    }

    setSelectedTeam(team);
  };

  const onConfirm = () => {
    setFormError(null);

    if (!activeTeam) {
      setFormError(isEn ? "Pick a team first." : "Choisis d'abord une équipe.");
      return;
    }
    if (!paymentMethod) {
      setFormError(labels.paymentRequired);
      return;
    }
    if (!commitmentChecked) {
      setFormError(labels.commitmentRequired);
      return;
    }
    if (paymentMethod === "wallet" && price > 0 && balance < price) {
      setFormError(
        isEn
          ? "Insufficient KIF balance. Top up your wallet."
          : "Solde Jetons KIF insuffisant. Recharge ton wallet.",
      );
      return;
    }

    startTransition(async () => {
      if (isJoining) {
        const joinRes = await joinOpenMatchAction({ locale, matchId, team: activeTeam });
        if (!joinRes.ok) {
          setFormError(joinRes.error);
          return;
        }
      }

      const confirmRes = await confirmMatchParticipationAction({
        locale,
        matchId,
        paymentMethod,
        paymentCommitment: true,
      });

      if (!confirmRes.ok) {
        if (isJoining) {
          router.push(
            `/${locale}/matches/${matchId}?reserved=1&team=${encodeURIComponent(activeTeam)}`,
          );
          router.refresh();
        }
        setFormError(confirmRes.error);
        return;
      }

      router.push(`/${locale}/matches/${matchId}?confirmed=1`);
      router.refresh();
    });
  };

  const onDecline = () => {
    startTransition(async () => {
      const res = await declineMatchParticipationAction({ locale, matchId });
      if (res.ok) {
        setSelectedTeam(null);
        router.push(`/${locale}/matches/${matchId}`);
        router.refresh();
      } else {
        setFormError(res.error);
      }
    });
  };

  if (!isOpen) {
    return <p className="text-sm text-white/60">{labels.matchClosed}</p>;
  }

  if (matchStarted && isJoining) {
    return <p className="text-sm text-white/60">{labels.matchStarted}</p>;
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
            {labels.commitmentLabel.replace("{price}", String(price)).replace("{club}", clubName)}
          </p>
        ) : null}
      </div>
    );
  }

  if (matchFull && isJoining) {
    return <p className="text-sm text-white/60">{labels.matchFull}</p>;
  }

  if (!canJoin) {
    return <p className="text-sm text-amber-200/90">{labels.genderRequired}</p>;
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border p-4",
        isPending ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--border)] bg-[var(--surface)]",
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-bold text-white">
          {isPending ? labels.participationPendingTitle : labels.joinTitle}
        </p>
        <p className="text-xs text-[var(--foreground-muted)]">
          {matchStarted && isPending
            ? labels.matchStarted
            : isPending
              ? labels.participationPendingHint
              : isEn
                ? "See who is on each team, pick yours, then confirm payment."
                : "Vois qui est sur chaque équipe, choisis la tienne, puis confirme ton paiement."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          {isEn ? "Choose your team" : "Choisis ton équipe"}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TeamChoiceCard
            team="A"
            title={isEn ? "Team A" : "Équipe A"}
            players={teamAPlayers}
            count={teamACount}
            full={teamAFull && viewerTeam !== "A" && selectedTeam !== "A"}
            selected={activeTeam === "A"}
            disabled={!canSwitchToA}
            pending={pending}
            onSelect={onTeamSelect}
            pickLabel={isEn ? "Pick team A" : "Choisir l'équipe A"}
            fullLabel={labels.teamFull}
            emptySlotLabel={isEn ? "Open slot" : "Place libre"}
            isEn={isEn}
          />
          <TeamChoiceCard
            team="B"
            title={isEn ? "Team B" : "Équipe B"}
            players={teamBPlayers}
            count={teamBCount}
            full={teamBFull && viewerTeam !== "B" && selectedTeam !== "B"}
            selected={activeTeam === "B"}
            disabled={!canSwitchToB}
            pending={pending}
            onSelect={onTeamSelect}
            pickLabel={isEn ? "Pick team B" : "Choisir l'équipe B"}
            fullLabel={labels.teamFull}
            emptySlotLabel={isEn ? "Open slot" : "Place libre"}
            isEn={isEn}
          />
        </div>
      </div>

      {activeTeam ? (
        <>
          {racketUnit > 0 ? (
            <RacketSelector
              locale={locale}
              racketUnit={racketUnit}
              rentRacket={rentRacket}
              onRentChange={setRentRacket}
            />
          ) : null}

          <PaymentMethodSelector
            selected={paymentMethod}
            onSelect={(method) => {
              setPaymentMethod(method);
              setFormError(null);
            }}
            isRestricted={false}
            price={price}
            priceLabel={isEn ? "Your share" : "Votre part"}
            walletBalance={balance}
            walletHref={walletHref}
            locale={locale}
          />

          <button
            type="button"
            onClick={() => {
              setCommitmentChecked((checked) => !checked);
              setFormError(null);
            }}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-colors touch-manipulation",
              commitmentChecked
                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                : "border-white/20 bg-white/5 hover:border-white/35",
            )}
            aria-pressed={commitmentChecked}
          >
            <span className="flex items-start gap-3 text-sm text-white/90">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  commitmentChecked
                    ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                    : "border-white/40 bg-transparent",
                )}
                aria-hidden="true"
              >
                {commitmentChecked ? "✓" : ""}
              </span>
              <span>{commitmentText}</span>
            </span>
          </button>

          {!commitmentChecked ? (
            <p className="text-xs text-[var(--foreground-muted)]">
              {isEn
                ? "Check the commitment above to enable confirmation."
                : "Coche l'engagement ci-dessus pour activer la confirmation."}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="text-sm font-medium text-red-300">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !readyToConfirm}
              onClick={onConfirm}
              className="flex-1 min-w-[140px] min-h-11 rounded-xl bg-[var(--gold)] text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
              {pending
                ? isJoining
                  ? labels.joining
                  : labels.confirming
                : isJoining
                  ? isEn
                    ? "Join this match"
                    : "Rejoindre ce match"
                  : labels.confirmParticipation}
            </button>
            {isPending ? (
              <button
                type="button"
                disabled={pending}
                onClick={onDecline}
                className="flex-1 min-w-[120px] min-h-11 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-bold disabled:opacity-40 touch-manipulation"
              >
                {pending ? labels.declining : labels.declineParticipation}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-xs text-[var(--foreground-muted)] rounded-xl border border-dashed border-[var(--border)] px-3 py-2">
          {isEn
            ? "Select a team above to continue with payment."
            : "Sélectionne une équipe ci-dessus pour continuer avec le paiement."}
        </p>
      )}
    </div>
  );
}
