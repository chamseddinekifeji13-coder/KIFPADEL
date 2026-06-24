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
  labels: ReferralPanelLabels;
};

export function AdminPromotionPanel({
  locale,
  signUpUrl,
  variant = "platform",
  secondaryUrl,
  labels,
}: AdminPromotionPanelProps) {
  return (
    <ReferralSharePanel
      locale={locale}
      signUpUrl={signUpUrl}
      variant={variant}
      secondaryUrl={secondaryUrl}
      labels={labels}
    />
  );
}
