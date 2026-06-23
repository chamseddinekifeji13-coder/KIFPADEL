"use client";

import { useState } from "react";
import { shareMatchInviteLink } from "@/lib/matches/share-invite";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: string;
  matchId: string;
  playerDisplayName: string;
  label?: string;
  className?: string;
};

export function MatchPlayerInviteButton({
  locale,
  matchId,
  playerDisplayName,
  label,
  className,
}: Props) {
  const isEn = locale === "en";
  const [pending, setPending] = useState(false);

  const onShare = async () => {
    if (pending) return;
    setPending(true);
    await shareMatchInviteLink(locale, matchId, playerDisplayName);
    setPending(false);
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onShare()}
      className={cn(
        className ??
          "relative z-10 inline-flex min-h-[44px] shrink-0 items-center justify-center text-[10px] font-black uppercase tracking-widest text-black px-4 py-2 rounded-xl bg-gold hover:bg-gold-light active:scale-95 transition-all shadow-gold touch-manipulation select-none disabled:opacity-50",
      )}
    >
      {pending ? "…" : label ?? (isEn ? "Send" : "Envoyer")}
    </button>
  );
}
