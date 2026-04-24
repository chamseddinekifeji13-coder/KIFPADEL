import { type ReliabilityStatus } from "@/domain/types/core";

export type TrustImpact = {
  event: "no_show" | "late_cancel" | "bad_behavior" | "good_behavior";
  delta: number;
};

export type SanctionDecision = {
  status: ReliabilityStatus;
  action: "none" | "warning" | "temporary_ban" | "blacklist";
};

const TRUST_IMPACTS: Record<TrustImpact["event"], number> = {
  no_show: -18,
  late_cancel: -10,
  bad_behavior: -25,
  good_behavior: 4,
};

export function trustImpactFromEvent(event: TrustImpact["event"]): TrustImpact {
  return {
    event,
    delta: TRUST_IMPACTS[event],
  };
}

export function reliabilityFromTrustScore(score: number): ReliabilityStatus {
  if (score < 25) return "blacklisted";
  if (score < 45) return "restricted";
  if (score < 70) return "warning";
  return "healthy";
}

export function decideSanction(score: number, fraudFlag: boolean): SanctionDecision {
  if (fraudFlag) {
    return { status: "blacklisted", action: "blacklist" };
  }

  const status = reliabilityFromTrustScore(score);

  if (status === "blacklisted") {
    return { status, action: "blacklist" };
  }

  if (status === "restricted") {
    return { status, action: "temporary_ban" };
  }

  if (status === "warning") {
    return { status, action: "warning" };
  }

  return { status, action: "none" };
}
