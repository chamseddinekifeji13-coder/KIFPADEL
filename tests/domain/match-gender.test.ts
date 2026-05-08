import { describe, it, expect } from "vitest";

import {
  matchGenderTypesVisibleToViewer,
  canJoinMatchByGenderRules,
  canCreatorUseMatchGenderType,
  isValidTeamCompositionAfterJoin,
} from "@/domain/rules/match-gender";

describe("matchGenderTypesVisibleToViewer", () => {
  it("profil sans genre : uniquement les matchs « all »", () => {
    expect(matchGenderTypesVisibleToViewer(null)).toEqual(["all"]);
  });

  it("homme : all, men_only, mixed", () => {
    expect(matchGenderTypesVisibleToViewer("male")).toEqual(["all", "men_only", "mixed"]);
  });

  it("femme : all, women_only, mixed", () => {
    expect(matchGenderTypesVisibleToViewer("female")).toEqual(["all", "women_only", "mixed"]);
  });
});

describe("canJoinMatchByGenderRules", () => {
  it("'all' : tout joueur avec profil valide peut rejoindre", () => {
    expect(canJoinMatchByGenderRules(null, "all")).toBe(true);
    expect(canJoinMatchByGenderRules("male", "all")).toBe(true);
    expect(canJoinMatchByGenderRules("female", "all")).toBe(true);
  });

  it("men_only : refuse NULL et femme", () => {
    expect(canJoinMatchByGenderRules(null, "men_only")).toBe(false);
    expect(canJoinMatchByGenderRules("female", "men_only")).toBe(false);
    expect(canJoinMatchByGenderRules("male", "men_only")).toBe(true);
  });

  it("women_only : refuse NULL et homme", () => {
    expect(canJoinMatchByGenderRules(null, "women_only")).toBe(false);
    expect(canJoinMatchByGenderRules("male", "women_only")).toBe(false);
    expect(canJoinMatchByGenderRules("female", "women_only")).toBe(true);
  });

  it("mixed : refuse NULL", () => {
    expect(canJoinMatchByGenderRules(null, "mixed")).toBe(false);
    expect(canJoinMatchByGenderRules("male", "mixed")).toBe(true);
    expect(canJoinMatchByGenderRules("female", "mixed")).toBe(true);
  });
});

describe("canCreatorUseMatchGenderType", () => {
  it("créateur sans genre : seulement type « all »", () => {
    expect(canCreatorUseMatchGenderType(null, "all")).toBe(true);
    expect(canCreatorUseMatchGenderType(null, "men_only")).toBe(false);
    expect(canCreatorUseMatchGenderType(null, "women_only")).toBe(false);
    expect(canCreatorUseMatchGenderType(null, "mixed")).toBe(false);
  });

  it("mixed exige un genre renseigné", () => {
    expect(canCreatorUseMatchGenderType("male", "mixed")).toBe(true);
    expect(canCreatorUseMatchGenderType("female", "mixed")).toBe(true);
  });
});

describe("isValidTeamCompositionAfterJoin", () => {
  it("mixte : équipe [M,F] valide après 2e place", () => {
    expect(
      isValidTeamCompositionAfterJoin({
        existingTeamGenders: ["male"],
        newPlayerGender: "female",
        matchType: "mixed",
      }),
    ).toBe(true);
  });

  it("mixte : refuse 2 hommes sur la même équipe", () => {
    expect(
      isValidTeamCompositionAfterJoin({
        existingTeamGenders: ["male"],
        newPlayerGender: "male",
        matchType: "mixed",
      }),
    ).toBe(false);
  });

  it("mixte : une seule place occupée reste autorisée", () => {
    expect(
      isValidTeamCompositionAfterJoin({
        existingTeamGenders: [],
        newPlayerGender: "male",
        matchType: "mixed",
      }),
    ).toBe(true);
  });

  it("men_only : refuse d'ajouter une femme à l'équipe", () => {
    expect(
      isValidTeamCompositionAfterJoin({
        existingTeamGenders: [],
        newPlayerGender: "female",
        matchType: "men_only",
      }),
    ).toBe(false);
  });

  it("women_only : refuse d'ajouter un homme", () => {
    expect(
      isValidTeamCompositionAfterJoin({
        existingTeamGenders: [],
        newPlayerGender: "male",
        matchType: "women_only",
      }),
    ).toBe(false);
  });
});
