export type NoShowDebtMode = "full_share" | "percent" | "fixed" | "none";

export type ClubFinancialPolicy = {
  noShowDebtMode: NoShowDebtMode;
  noShowDebtFixedCents: number | null;
  noShowDebtPercent: number;
  noShowTrustPenalty: number;
  noShowGraceMinutes: number;
  noShowAutoReport: boolean;
  freeCancellationHours: number;
  lateCancelPenaltyEnabled: boolean;
  lateCancelTrustPenalty: number;
  allowPayOnSite: boolean;
  minTrustForPayOnSite: number;
  requirePhoneVerification: boolean;
  requireProfileComplete: boolean;
  /** 0 = règle désactivée. Minutes après réservation pour atteindre 4 joueurs. */
  bookingFillDeadlineMinutes: number;
};

export const DEFAULT_CLUB_FINANCIAL_POLICY: ClubFinancialPolicy = {
  noShowDebtMode: "full_share",
  noShowDebtFixedCents: null,
  noShowDebtPercent: 100,
  noShowTrustPenalty: 18,
  noShowGraceMinutes: 15,
  noShowAutoReport: false,
  freeCancellationHours: 24,
  lateCancelPenaltyEnabled: true,
  lateCancelTrustPenalty: 10,
  allowPayOnSite: true,
  minTrustForPayOnSite: 70,
  requirePhoneVerification: true,
  requireProfileComplete: true,
  bookingFillDeadlineMinutes: 30,
};

const NO_SHOW_DEBT_MODES = new Set<NoShowDebtMode>(["full_share", "percent", "fixed", "none"]);

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseNoShowDebtMode(raw: unknown): NoShowDebtMode {
  const s = String(raw ?? "").trim() as NoShowDebtMode;
  return NO_SHOW_DEBT_MODES.has(s) ? s : DEFAULT_CLUB_FINANCIAL_POLICY.noShowDebtMode;
}

export type ClubFinancialPolicyRow = {
  no_show_debt_mode?: string | null;
  no_show_debt_fixed_cents?: number | null;
  no_show_debt_percent?: number | null;
  no_show_trust_penalty?: number | null;
  no_show_grace_minutes?: number | null;
  no_show_auto_report?: boolean | null;
  free_cancellation_hours?: number | null;
  late_cancel_penalty_enabled?: boolean | null;
  late_cancel_trust_penalty?: number | null;
  allow_pay_on_site?: boolean | null;
  min_trust_for_pay_on_site?: number | null;
  require_phone_verification?: boolean | null;
  require_profile_complete?: boolean | null;
  booking_fill_deadline_minutes?: number | null;
};

export function parseClubFinancialPolicy(row: ClubFinancialPolicyRow | null | undefined): ClubFinancialPolicy {
  const defaults = DEFAULT_CLUB_FINANCIAL_POLICY;
  const fixedRaw = row?.no_show_debt_fixed_cents;
  const fixedCents =
    fixedRaw == null
      ? null
      : (() => {
          const n = Number(fixedRaw);
          return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
        })();

  return {
    noShowDebtMode: parseNoShowDebtMode(row?.no_show_debt_mode),
    noShowDebtFixedCents: fixedCents,
    noShowDebtPercent: clampInt(row?.no_show_debt_percent, 1, 100, defaults.noShowDebtPercent),
    noShowTrustPenalty: clampInt(row?.no_show_trust_penalty, 0, 50, defaults.noShowTrustPenalty),
    noShowGraceMinutes: clampInt(row?.no_show_grace_minutes, 5, 60, defaults.noShowGraceMinutes),
    noShowAutoReport: Boolean(row?.no_show_auto_report ?? defaults.noShowAutoReport),
    freeCancellationHours: clampInt(row?.free_cancellation_hours, 1, 72, defaults.freeCancellationHours),
    lateCancelPenaltyEnabled: Boolean(row?.late_cancel_penalty_enabled ?? defaults.lateCancelPenaltyEnabled),
    lateCancelTrustPenalty: clampInt(
      row?.late_cancel_trust_penalty,
      0,
      50,
      defaults.lateCancelTrustPenalty,
    ),
    allowPayOnSite: Boolean(row?.allow_pay_on_site ?? defaults.allowPayOnSite),
    minTrustForPayOnSite: clampInt(row?.min_trust_for_pay_on_site, 0, 100, defaults.minTrustForPayOnSite),
    requirePhoneVerification: Boolean(
      row?.require_phone_verification ?? defaults.requirePhoneVerification,
    ),
    requireProfileComplete: Boolean(row?.require_profile_complete ?? defaults.requireProfileComplete),
    bookingFillDeadlineMinutes: clampInt(
      row?.booking_fill_deadline_minutes,
      0,
      1440,
      defaults.bookingFillDeadlineMinutes,
    ),
  };
}

/** Montant de dette no-show en centimes TND, ou null si aucune dette. */
export function deriveNoShowDebtAmountCents(
  sharePrice: unknown,
  policy: ClubFinancialPolicy = DEFAULT_CLUB_FINANCIAL_POLICY,
): number | null {
  if (policy.noShowDebtMode === "none") {
    return null;
  }

  if (policy.noShowDebtMode === "fixed") {
    return policy.noShowDebtFixedCents && policy.noShowDebtFixedCents > 0
      ? policy.noShowDebtFixedCents
      : 5_000;
  }

  const shareDt = Number(sharePrice);
  const shareCents =
    Number.isFinite(shareDt) && shareDt > 0 ? Math.round(shareDt * 100) : 5_000;

  if (policy.noShowDebtMode === "percent") {
    return Math.max(0, Math.round((shareCents * policy.noShowDebtPercent) / 100));
  }

  return shareCents;
}

export function resolveNoShowTrustPenalty(policy: ClubFinancialPolicy = DEFAULT_CLUB_FINANCIAL_POLICY): number {
  return -Math.abs(policy.noShowTrustPenalty);
}
