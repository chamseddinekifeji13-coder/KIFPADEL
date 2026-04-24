type MemberCardPayload = {
  playerId: string;
  displayName: string;
  clubName: string;
  league: string;
  trustStatus: string;
  verificationLevel: number;
};

export function buildCardQrValue(payload: MemberCardPayload): string {
  return JSON.stringify({
    type: "kifpadel-member-card",
    ...payload,
  });
}
