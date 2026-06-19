import { describe, expect, it } from "vitest";

import {
  listCategoriesForSchedule,
  listDisplayCategories,
  normalizeTournamentCategories,
  parseTournamentCategories,
  resolveRegistrationCategory,
  validateTeamForCategory,
} from "@/domain/rules/tournament-categories";

describe("tournament categories", () => {
  it("normalise et ordonne les catégories", () => {
    expect(normalizeTournamentCategories(["mixed", "men_only", "invalid"])).toEqual([
      "men_only",
      "mixed",
    ]);
  });

  it("lit les catégories depuis settings", () => {
    expect(parseTournamentCategories({ categories: ["women_only", "men_only"] })).toEqual([
      "men_only",
      "women_only",
    ]);
  });

  it("résout l'inscription mono-catégorie", () => {
    const res = resolveRegistrationCategory(["men_only"], null);
    expect(res).toEqual({ ok: true, category: "men_only" });
  });

  it("exige le choix si plusieurs catégories", () => {
    const res = resolveRegistrationCategory(["men_only", "mixed"], null);
    expect(res.ok).toBe(false);
  });

  it("valide une équipe mixte", () => {
    expect(validateTeamForCategory("male", "female", "mixed")).toBe(true);
    expect(validateTeamForCategory("male", "male", "mixed")).toBe(false);
  });

  it("liste les catégories à planifier avec inscrits", () => {
    const cats = listCategoriesForSchedule(
      ["men_only", "women_only"],
      [
        { category: "men_only", status: "registered" },
        { category: "women_only", status: "withdrawn" },
      ],
      [],
    );
    expect(cats).toEqual(["men_only"]);
  });

  it("affiche seulement les catégories au programme", () => {
    const display = listDisplayCategories(
      ["men_only", "women_only", "mixed"],
      [{ category: "men_only", status: "registered" }],
      [],
      [],
    );
    expect(display).toEqual(["men_only"]);
  });
});
