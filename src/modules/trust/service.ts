import { decideSanction, trustImpactFromEvent } from "@/domain/rules/trust";

export function previewTrustDecision(currentScore: number, event: "no_show" | "late_cancel" | "bad_behavior" | "good_behavior") {
  const impact = trustImpactFromEvent(event);
  const nextScore = Math.max(0, Math.min(100, currentScore + impact.delta));

  return {
    nextScore,
    decision: decideSanction(nextScore, false),
  };
}
