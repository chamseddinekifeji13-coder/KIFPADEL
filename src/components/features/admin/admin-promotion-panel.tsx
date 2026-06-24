"use client";

import {
  ReferralSharePanel,
  type ReferralPanelLabels,
} from "@/components/features/players/player-referral-panel";

type AdminPromotionPanelProps = {
  locale: string;
  signUpUrl: string;
  variant?: "platform" | "club";
  secondaryUrl?: string;
  charterUrl?: string;
  privacyUrl?: string;
  labels: ReferralPanelLabels;
};

export function AdminPromotionPanel({
  locale,
  signUpUrl,
  variant = "platform",
  secondaryUrl,
  charterUrl,
  privacyUrl,
  labels,
}: AdminPromotionPanelProps) {
  return (
    <ReferralSharePanel
      locale={locale}
      signUpUrl={signUpUrl}
      variant={variant}
      secondaryUrl={secondaryUrl}
      charterUrl={charterUrl}
      privacyUrl={privacyUrl}
      labels={labels}
    />
  );
}
