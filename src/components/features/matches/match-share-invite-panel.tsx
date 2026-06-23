"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Share2 } from "lucide-react";
import { shareMatchInviteLink } from "@/lib/matches/share-invite";

type Props = {
  locale: string;
  matchId: string;
  clubName: string;
  spotsLeft: number;
};

export function MatchShareInvitePanel({ locale, matchId, clubName, spotsLeft }: Props) {
  const isEn = locale === "en";
  const [pending, setPending] = useState(false);

  const onShare = async () => {
    if (pending) return;
    setPending(true);
    await shareMatchInviteLink(locale, matchId, "");
    setPending(false);
  };

  const findPlayersHref = `/${locale}/find-players?${new URLSearchParams({
    matchId,
    clubName,
  }).toString()}`;

  return (
    <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Users className="h-5 w-5 text-[var(--gold)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">
            {isEn ? "Complete your match" : "Complétez votre match"}
          </p>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 leading-relaxed">
            {isEn
              ? `${spotsLeft} spot(s) left at ${clubName}. Invite Kifpadel players or share the link.`
              : `${spotsLeft} place(s) restante(s) chez ${clubName}. Invitez des joueurs Kifpadel ou partagez le lien.`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href={findPlayersHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--gold)] text-[10px] font-black uppercase tracking-widest text-black"
        >
          {isEn ? "Find players" : "Trouver des joueurs"}
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onShare()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--gold)] text-[10px] font-black uppercase tracking-widest text-[var(--gold)] disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          {pending ? "…" : isEn ? "Share link" : "Partager le lien"}
        </button>
      </div>
    </div>
  );
}
