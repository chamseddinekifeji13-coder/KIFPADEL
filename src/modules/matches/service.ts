export type OpenMatchSummary = {
  id: string;
  startsAt: string;
  clubName: string | null;
  openSlots: number;
};

export async function listOpenMatches(): Promise<OpenMatchSummary[]> {
  return [];
}
