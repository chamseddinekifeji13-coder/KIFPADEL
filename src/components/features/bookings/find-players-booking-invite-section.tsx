"use client";

import { CheckCircle2 } from "lucide-react";
import { PlayerCard } from "@/components/features/players/player-card";
import { FindPlayersBookingInviteBanner } from "@/components/features/bookings/find-players-booking-invite-banner";
import { countSharedInvites } from "@/lib/bookings/invite-shared-storage";

type Player = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  league: string;
  leagueCategory?: string;
  sport_rating: number;
  trust_score: number;
  gender?: "male" | "female" | null;
  reliability: string;
};

type BookingInvite = {
  bookingId: string;
  clubName: string;
  sharePrice: number;
  inviteId?: string;
  pendingInviteIds: string[];
};

type Props = {
  locale: string;
  players: Player[];
  bookingInvite: BookingInvite;
  totalPendingInvites: number;
  showBanner?: boolean;
};

export function FindPlayersBookingInviteSection({
  locale,
  players,
  bookingInvite,
  totalPendingInvites,
  showBanner = true,
}: Props) {
  const quotaReached =
    totalPendingInvites > 0 &&
    countSharedInvites(bookingInvite.bookingId, bookingInvite.pendingInviteIds) >=
      totalPendingInvites;
  const inviteDisabled = quotaReached;

  return (
    <>
      {showBanner ? (
        <FindPlayersBookingInviteBanner
          locale={locale}
          bookingId={bookingInvite.bookingId}
          clubName={bookingInvite.clubName}
          sharePrice={bookingInvite.sharePrice}
          inviteId={bookingInvite.inviteId}
          totalPendingInvites={totalPendingInvites}
          pendingInviteIds={bookingInvite.pendingInviteIds}
        />
      ) : null}

      {quotaReached ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-200">
          <CheckCircle2 className="inline h-4 w-4 mr-1 -mt-0.5 text-emerald-400" />
          {locale === "en"
            ? "You have reached the number of partners to invite."
            : "Vous avez atteint le nombre de partenaires à inviter."}
        </div>
      ) : null}

      <div className="grid gap-3">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            locale={locale}
            player={player}
            bookingInvite={bookingInvite}
            bookingInviteDisabled={inviteDisabled}
          />
        ))}
      </div>
    </>
  );
}
