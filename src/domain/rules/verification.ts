import { type VerificationLevel } from "@/domain/types/core";

export function canUpgradeVerification(
  currentLevel: VerificationLevel,
  hasPhone: boolean,
  hasEmail: boolean,
  identityVerified: boolean,
  riskFlagged: boolean,
): VerificationLevel {
  if (!hasPhone || !hasEmail) {
    return 1;
  }

  if (currentLevel >= 2 || identityVerified) {
    return riskFlagged ? 3 : 2;
  }

  return 1;
}
