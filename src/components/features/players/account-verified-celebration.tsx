"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Search, Swords, Trophy, X } from "lucide-react";

import type { AccountVerifiedCelebrationLabels } from "./account-verified-celebration-labels";

type AccountVerifiedCelebrationProps = {
  locale: string;
  labels: AccountVerifiedCelebrationLabels;
};

export function AccountVerifiedCelebration({ locale, labels }: AccountVerifiedCelebrationProps) {
  const router = useRouter();

  const dismiss = () => {
    router.replace(`/${locale}/profile`);
  };

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold)]/15 via-[var(--surface)] to-[var(--success)]/10 p-5 shadow-xl shadow-black/20"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={labels.dismiss}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-white/10 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--gold)]/20 border border-[var(--gold)]/30">
          <Trophy className="h-6 w-6 text-[var(--gold)]" />
        </div>
        <div className="space-y-2 min-w-0">
          <p className="text-lg font-bold text-white leading-snug">{labels.title}</p>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">{labels.body}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={`/${locale}/book`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-black hover:bg-[var(--gold-dark)] transition-colors"
        >
          <Calendar className="h-4 w-4" />
          {labels.ctaBook}
        </Link>
        <Link
          href={`/${locale}/find-players`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 text-sm font-bold text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-colors"
        >
          <Search className="h-4 w-4" />
          {labels.ctaFindPlayers}
        </Link>
        <Link
          href={`/${locale}/play-now`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          <Swords className="h-4 w-4" />
          {labels.ctaPlayNow}
        </Link>
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full text-center text-xs font-medium text-[var(--foreground-muted)] hover:text-white transition-colors"
      >
        {labels.dismiss}
      </button>
    </div>
  );
}
