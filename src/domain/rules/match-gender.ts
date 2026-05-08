import type { Gender, MatchGenderType } from "@/domain/types/core";

/** Match types a viewer can see in listings (NULL profile = only `all`). */
export function matchGenderTypesVisibleToViewer(viewerGender: Gender | null): MatchGenderType[] {
  if (viewerGender === null) return ["all"];
  if (viewerGender === "male") return ["all", "men_only", "mixed"];
  return ["all", "women_only", "mixed"];
}

export function canJoinMatchByGenderRules(
  viewerGender: Gender | null,
  matchType: MatchGenderType,
): boolean {
  if (matchType === "all") return true;
  if (viewerGender === null) return false;
  if (matchType === "men_only") return viewerGender === "male";
  if (matchType === "women_only") return viewerGender === "female";
  if (matchType === "mixed") return viewerGender === "male" || viewerGender === "female";
  return false;
}

/** Creator compatibility with selected match mode. */
export function canCreatorUseMatchGenderType(
  creatorGender: Gender | null,
  matchType: MatchGenderType,
): boolean {
  if (matchType === "all") return true;
  if (matchType === "men_only") return creatorGender === "male";
  if (matchType === "women_only") return creatorGender === "female";
  if (matchType === "mixed") return creatorGender === "male" || creatorGender === "female";
  return false;
}

export type ParticipantGenderRow = { player_id: string; team: string; gender: Gender | null };

/**
 * After hypothetically adding `newGender` to `teamExistingGenders`, validate team vs match type.
 * Padel: 2 players per team max; mixed requires 1M+1F when size is 2.
 */
export function isValidTeamCompositionAfterJoin(args: {
  existingTeamGenders: (Gender | null)[];
  newPlayerGender: Gender | null;
  matchType: MatchGenderType;
}): boolean {
  const { existingTeamGenders, newPlayerGender, matchType } = args;
  if (existingTeamGenders.length >= 2) return false;

  const combined = [...existingTeamGenders, newPlayerGender];
  if (combined.length > 2) return false;

  const defined = combined.filter((g): g is Gender => g === "male" || g === "female");

  if (matchType === "all") {
    return true;
  }

  if (matchType === "men_only") {
    return defined.every((g) => g === "male");
  }

  if (matchType === "women_only") {
    return defined.every((g) => g === "female");
  }

  if (matchType === "mixed") {
    if (defined.length <= 1) return true;
    const males = defined.filter((g) => g === "male").length;
    const females = defined.filter((g) => g === "female").length;
    return males === 1 && females === 1;
  }

  return false;
}
