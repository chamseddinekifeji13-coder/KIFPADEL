"use client";

import { useMemo, useState } from "react";
import { Copy, MessageCircle, Share2, Users } from "lucide-react";

import { buildReferralShareCopy } from "@/lib/referrals/referral-messages";
import {
  copyReferralPayload,
  openReferralWhatsApp,
  shareReferralLink,
} from "@/lib/referrals/share-referral";
import { cn } from "@/lib/utils/cn";

export type ReferralPanelLabels = {
  title: string;
  subtitle: string;
  previewTitle: string;
  copyCta: string;
  whatsappCta: string;
  shareCta: string;
  copiedToast: string;
};

type ReferralSharePanelProps = {
  locale: string;
  signUpUrl: string;
  variant: "player" | "platform" | "club";
  referrerName?: string;
  secondaryUrl?: string;
  charterUrl?: string;
  privacyUrl?: string;
  labels: ReferralPanelLabels;
  className?: string;
};

export function ReferralSharePanel({
  locale,
  signUpUrl,
  variant,
  referrerName,
  secondaryUrl,
  charterUrl,
  privacyUrl,
  labels,
  className,
}: ReferralSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  const copy = useMemo(
    () =>
      buildReferralShareCopy({
        locale,
        url: signUpUrl,
        variant,
        referrerName,
        secondaryUrl,
        charterUrl,
        privacyUrl,
      }),
    [locale, signUpUrl, variant, referrerName, secondaryUrl, charterUrl, privacyUrl],
  );

  const onCopy = async () => {
    const ok = await copyReferralPayload(copy.payload);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const onShare = async () => {
    setPending(true);
    await shareReferralLink(signUpUrl, copy);
    setPending(false);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--gold)]/25 bg-gradient-to-br from-[var(--gold)]/10 via-[var(--surface)] to-[var(--surface-elevated)] p-5 shadow-lg shadow-black/10",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 border border-[var(--gold)]/25">
          <Users className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-bold text-white">{labels.title}</h2>
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{labels.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold)] mb-2">
          {labels.previewTitle}
        </p>
        <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed">{copy.text}</p>
        {variant !== "club" ? (
          <p className="mt-3 text-xs text-[var(--gold)] break-all font-medium">{signUpUrl}</p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-xs font-black uppercase tracking-wider text-black hover:bg-[var(--gold-light)] transition-colors"
        >
          <Copy className="h-4 w-4" />
          {labels.copyCta}
        </button>
        <button
          type="button"
          onClick={() => openReferralWhatsApp(copy.payload)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 text-xs font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {labels.whatsappCta}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onShare()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          {pending ? "…" : labels.shareCta}
        </button>
      </div>

      {copied ? (
        <p role="status" className="mt-3 text-center text-xs font-bold text-emerald-400">
          {labels.copiedToast}
        </p>
      ) : null}
    </div>
  );
}

type PlayerReferralPanelProps = {
  locale: string;
  displayName: string;
  signUpUrl: string;
  labels: ReferralPanelLabels;
};

export function PlayerReferralPanel({ locale, displayName, signUpUrl, labels }: PlayerReferralPanelProps) {
  return (
    <ReferralSharePanel
      locale={locale}
      signUpUrl={signUpUrl}
      variant="player"
      referrerName={displayName}
      labels={labels}
    />
  );
}
