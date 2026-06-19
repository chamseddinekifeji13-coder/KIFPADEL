import type { Gender, MatchGenderType } from "@/domain/types/core";
import type { TournamentFormat } from "@/domain/types/tournaments";
import { isValidTeamCompositionAfterJoin } from "@/domain/rules/match-gender";
import { canGeneratePoolSchedule } from "@/domain/rules/tournament-pools";
import { isPowerOfTwoTeamCount } from "@/domain/rules/tournament-bracket";
import { isValidAmericanoPlayerCount } from "@/domain/rules/tournament-americano";

/** Catégories de tournoi (alignées sur match_gender_type, hors "all"). */
export type TournamentCategory = "men_only" | "women_only" | "mixed";

const CATEGORY_ORDER: TournamentCategory[] = ["men_only", "women_only", "mixed"];

const CATEGORY_VALUES = new Set<string>(CATEGORY_ORDER);

export function isTournamentCategory(value: string): value is TournamentCategory {
  return CATEGORY_VALUES.has(value);
}

export function normalizeTournamentCategories(input: unknown): TournamentCategory[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<TournamentCategory>();
  for (const raw of input) {
    if (typeof raw === "string" && isTournamentCategory(raw)) {
      seen.add(raw);
    }
  }
  return CATEGORY_ORDER.filter((c) => seen.has(c));
}

export function parseTournamentCategories(settings: Record<string, unknown>): TournamentCategory[] {
  return normalizeTournamentCategories(settings.categories);
}

export function tournamentCategoryToMatchGenderType(
  category: TournamentCategory | null,
): MatchGenderType {
  if (category === "men_only" || category === "women_only" || category === "mixed") {
    return category;
  }
  return "all";
}

export function tournamentCategoryLabel(category: TournamentCategory | null, locale: string): string {
  if (locale === "en") {
    if (category === "men_only") return "Men";
    if (category === "women_only") return "Women";
    if (category === "mixed") return "Mixed";
    return "Open";
  }
  if (category === "men_only") return "Masculin";
  if (category === "women_only") return "Féminin";
  if (category === "mixed") return "Mixte";
  return "Open";
}

export function tournamentCategoryStorageKey(category: TournamentCategory | null): string {
  return category ?? "open";
}

export function validateSoloPlayerForCategory(
  playerGender: Gender | null,
  category: TournamentCategory,
): boolean {
  if (playerGender === null) {
    return false;
  }
  if (category === "men_only") {
    return playerGender === "male";
  }
  if (category === "women_only") {
    return playerGender === "female";
  }
  return playerGender === "male" || playerGender === "female";
}

export function validateTeamForCategory(
  player1Gender: Gender | null,
  player2Gender: Gender | null,
  category: TournamentCategory,
): boolean {
  if (player1Gender === null || player2Gender === null) {
    return false;
  }
  if (category === "men_only") {
    return player1Gender === "male" && player2Gender === "male";
  }
  if (category === "women_only") {
    return player1Gender === "female" && player2Gender === "female";
  }
  return (
    isValidTeamCompositionAfterJoin({
      existingTeamGenders: [player1Gender],
      newPlayerGender: player2Gender,
      matchType: "mixed",
    }) &&
    isValidTeamCompositionAfterJoin({
      existingTeamGenders: [player2Gender],
      newPlayerGender: player1Gender,
      matchType: "mixed",
    })
  );
}

export function resolveRegistrationCategory(
  configured: TournamentCategory[],
  requested: TournamentCategory | null | undefined,
): { ok: true; category: TournamentCategory | null } | { ok: false; error: string } {
  if (configured.length === 0) {
    return { ok: true, category: null };
  }
  if (configured.length === 1) {
    return { ok: true, category: configured[0]! };
  }
  if (!requested || !configured.includes(requested)) {
    return { ok: false, error: "Choisis une catégorie pour t’inscrire." };
  }
  return { ok: true, category: requested };
}

type Categorized = { category: TournamentCategory | null; status?: string };

/** Catégories à planifier : configurées avec inscrits, ou open legacy. */
export function listCategoriesForSchedule(
  configured: TournamentCategory[],
  entries: Categorized[],
  soloEntries: Categorized[],
): (TournamentCategory | null)[] {
  const active = (rows: Categorized[]) =>
    rows.filter((r) => r.status !== "withdrawn");

  if (configured.length === 0) {
    const hasOpen =
      active(entries).some((e) => e.category == null) ||
      active(soloEntries).some((e) => e.category == null);
    return hasOpen ? [null] : [];
  }

  return configured.filter(
    (cat) =>
      active(entries).some((e) => e.category === cat) ||
      active(soloEntries).some((e) => e.category === cat),
  );
}

export function filterItemsByCategory<T extends { category: TournamentCategory | null }>(
  items: T[],
  category: TournamentCategory | null,
): T[] {
  return items.filter((item) => (item.category ?? null) === category);
}

/** Sections à afficher : une par catégorie active, ou open si legacy. */
export function listDisplayCategories(
  configured: TournamentCategory[],
  entries: Categorized[],
  matches: { category: TournamentCategory | null }[],
  soloEntries: Categorized[],
): (TournamentCategory | null)[] {
  const active = (rows: Categorized[]) =>
    rows.filter((r) => r.status !== "withdrawn");

  const fromData = new Set<TournamentCategory | null>();
  for (const e of active(entries)) {
    fromData.add(e.category ?? null);
  }
  for (const e of active(soloEntries)) {
    fromData.add(e.category ?? null);
  }
  for (const m of matches) {
    fromData.add(m.category ?? null);
  }

  if (configured.length > 0) {
    const ordered = configured.filter((c) => fromData.has(c));
    if (ordered.length > 0) {
      return ordered;
    }
  }

  if (fromData.size === 0) {
    return configured.length > 0 ? configured : [null];
  }

  const keys = [...fromData];
  keys.sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
  });
  return keys;
}

export function hasMultipleDisplayCategories(categories: (TournamentCategory | null)[]): boolean {
  return categories.length > 1;
}

export function canGenerateTournamentSchedule(
  format: TournamentFormat,
  configured: TournamentCategory[],
  entries: Categorized[],
  soloEntries: Categorized[],
): boolean {
  const categories = listCategoriesForSchedule(configured, entries, soloEntries);
  if (categories.length === 0) {
    return false;
  }

  return categories.every((category) => {
    const activeEntries = filterItemsByCategory(
      entries.filter((e) => e.status !== "withdrawn"),
      category,
    );
    const activeSolo = filterItemsByCategory(
      soloEntries.filter((e) => e.status !== "withdrawn"),
      category,
    );

    if (format === "americano") {
      return isValidAmericanoPlayerCount(activeSolo.length);
    }
    if (format === "pools") {
      return canGeneratePoolSchedule(activeEntries.length);
    }
    return isPowerOfTwoTeamCount(activeEntries.length);
  });
}
