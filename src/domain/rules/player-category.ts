/** Catégories padel Tunisie (barème P). */
export const PLAYER_CATEGORY_IDS = [
  "p25",
  "p50",
  "p100",
  "p250",
  "p500",
  "p1000",
] as const;

export type PlayerCategoryId = (typeof PLAYER_CATEGORY_IDS)[number];

export type PlayerCategoryOption = {
  id: PlayerCategoryId;
  label: string;
  description: string;
};

export const PLAYER_CATEGORIES: PlayerCategoryOption[] = [
  { id: "p25", label: "P25", description: "Débutant" },
  { id: "p50", label: "P50", description: "Débutant +" },
  { id: "p100", label: "P100", description: "Intermédiaire" },
  { id: "p250", label: "P250", description: "Semi Pro" },
  { id: "p500", label: "P500", description: "Pro" },
  { id: "p1000", label: "P1000", description: "Pro +" },
];

const LEGACY_TO_CATEGORY: Record<string, PlayerCategoryId> = {
  bronze: "p25",
  silver: "p100",
  gold: "p250",
  platinum: "p1000",
  beginner: "p25",
  intermediate: "p100",
  advanced: "p250",
  expert: "p1000",
};

/** Seuils ELO sport → catégorie P (progression automatique). */
export const CATEGORY_RATING_FLOORS: Record<PlayerCategoryId, number> = {
  p25: 0,
  p50: 1150,
  p100: 1250,
  p250: 1400,
  p500: 1600,
  p1000: 1750,
};

export function normalizePlayerCategoryId(raw: string | null | undefined): PlayerCategoryId {
  const v = String(raw ?? "").trim().toLowerCase();
  if (LEGACY_TO_CATEGORY[v]) return LEGACY_TO_CATEGORY[v];
  if (PLAYER_CATEGORY_IDS.includes(v as PlayerCategoryId)) return v as PlayerCategoryId;
  return "p25";
}

export function playerCategoryById(id: PlayerCategoryId): PlayerCategoryOption {
  return PLAYER_CATEGORIES.find((c) => c.id === id) ?? PLAYER_CATEGORIES[0];
}

export function playerCategoryLabel(raw: string | null | undefined): string {
  return playerCategoryById(normalizePlayerCategoryId(raw)).label;
}

export function playerCategoryFullLabel(raw: string | null | undefined): string {
  const cat = playerCategoryById(normalizePlayerCategoryId(raw));
  return `${cat.label} · ${cat.description}`;
}

export function categoryFromRating(rating: number): PlayerCategoryId {
  if (rating >= CATEGORY_RATING_FLOORS.p1000) return "p1000";
  if (rating >= CATEGORY_RATING_FLOORS.p500) return "p500";
  if (rating >= CATEGORY_RATING_FLOORS.p250) return "p250";
  if (rating >= CATEGORY_RATING_FLOORS.p100) return "p100";
  if (rating >= CATEGORY_RATING_FLOORS.p50) return "p50";
  return "p25";
}

export type SportCategoryProgress = {
  sportRating: number;
  prevFloor: number;
  nextFloor: number;
  nextTierLabel: string | null;
  progressPercent: number;
  isMaxTier: boolean;
};

export function sportCategoryProgress(sportRating: number): SportCategoryProgress {
  const r = sportRating;
  const tiers = PLAYER_CATEGORY_IDS;

  for (let i = tiers.length - 1; i >= 0; i -= 1) {
    const floor = CATEGORY_RATING_FLOORS[tiers[i]];
    if (r >= floor) {
      const nextId = tiers[i + 1];
      if (!nextId) {
        return {
          sportRating: r,
          prevFloor: floor,
          nextFloor: floor,
          nextTierLabel: null,
          progressPercent: 100,
          isMaxTier: true,
        };
      }
      const nextFloor = CATEGORY_RATING_FLOORS[nextId];
      const span = nextFloor - floor;
      return {
        sportRating: r,
        prevFloor: floor,
        nextFloor,
        nextTierLabel: playerCategoryLabel(nextId),
        progressPercent: span > 0 ? Math.min(100, ((r - floor) / span) * 100) : 100,
        isMaxTier: false,
      };
    }
  }

  const nextFloor = CATEGORY_RATING_FLOORS.p50;
  return {
    sportRating: r,
    prevFloor: 0,
    nextFloor,
    nextTierLabel: playerCategoryLabel("p50"),
    progressPercent: Math.min(100, (r / nextFloor) * 100),
    isMaxTier: false,
  };
}

export function playerCategoryBadgeVariant(raw: string | null | undefined): PlayerCategoryId {
  return normalizePlayerCategoryId(raw);
}
