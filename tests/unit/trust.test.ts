import { describe, expect, it } from "vitest";

import { decideSanction, reliabilityFromTrustScore, trustImpactFromEvent } from "../../src/domain/rules/trust";

describe("trust rules", () => {
  it("applies expected impact for no-show", () => {
    expect(trustImpactFromEvent("no_show").delta).toBeLessThan(0);
  });

  it("maps score to reliability status", () => {
    expect(reliabilityFromTrustScore(85)).toBe("healthy");
    expect(reliabilityFromTrustScore(60)).toBe("warning");
    expect(reliabilityFromTrustScore(30)).toBe("restricted");
  });

  it("blacklists on fraud", () => {
    const decision = decideSanction(90, true);
    expect(decision.action).toBe("blacklist");
  });
});
