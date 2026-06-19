import { describe, expect, it } from "vitest";

import { previewTeamEloImpact } from "../../src/domain/rules/rating";

describe("previewTeamEloImpact", () => {
  it("symmetric teams yield equal magnitude opposite deltas", () => {
    const impact = previewTeamEloImpact(1200, 1200, "A");
    expect(impact.teamADelta).toBe(16);
    expect(impact.teamBDelta).toBe(-16);
  });
});
