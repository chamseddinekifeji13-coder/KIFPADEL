import { describe, expect, it } from "vitest";

import {
  DEFAULT_CLUB_FINANCIAL_POLICY,
  deriveNoShowDebtAmountCents,
  parseClubFinancialPolicy,
  resolveNoShowTrustPenalty,
} from "../../src/domain/rules/club-financial-policy";

describe("club financial policy", () => {
  it("defaults to full share debt", () => {
    expect(deriveNoShowDebtAmountCents(30, DEFAULT_CLUB_FINANCIAL_POLICY)).toBe(3000);
  });

  it("applies percent mode", () => {
    const policy = parseClubFinancialPolicy({
      no_show_debt_mode: "percent",
      no_show_debt_percent: 50,
    });
    expect(deriveNoShowDebtAmountCents(40, policy)).toBe(2000);
  });

  it("applies fixed mode", () => {
    const policy = parseClubFinancialPolicy({
      no_show_debt_mode: "fixed",
      no_show_debt_fixed_cents: 1500,
    });
    expect(deriveNoShowDebtAmountCents(40, policy)).toBe(1500);
  });

  it("skips debt when mode is none", () => {
    const policy = parseClubFinancialPolicy({ no_show_debt_mode: "none" });
    expect(deriveNoShowDebtAmountCents(40, policy)).toBeNull();
  });

  it("resolves trust penalty as negative delta", () => {
    const policy = parseClubFinancialPolicy({ no_show_trust_penalty: 12 });
    expect(resolveNoShowTrustPenalty(policy)).toBe(-12);
  });
});
