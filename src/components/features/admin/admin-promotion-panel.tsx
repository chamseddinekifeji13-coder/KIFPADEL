"use client";

import {
  ReferralSharePanel,
  type ReferralPanelLabels,
} from "@/components/features/players/player-referral-panel";

type AdminPromotionPanelProps = {
  locale: string;
  signUpUrl: string;
  labels: ReferralPanelLabels;
};

export function AdminPromotionPanel({ locale, signUpUrl, labels }: AdminPromotionPanelProps) {
  return <ReferralSharePanel locale={locale} signUpUrl={signUpUrl} variant="platform" labels={labels} />;
}
