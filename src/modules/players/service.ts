export type PlayerSummary = {
  id: string;
  displayName: string;
  rating: number;
  trustScore: number;
};

export async function searchPlayers(): Promise<PlayerSummary[]> {
  return [];
}
