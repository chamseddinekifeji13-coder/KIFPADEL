export type ClubSummary = {
  id: string;
  name: string;
  city: string;
};

export async function listClubs(): Promise<ClubSummary[]> {
  return [];
}
