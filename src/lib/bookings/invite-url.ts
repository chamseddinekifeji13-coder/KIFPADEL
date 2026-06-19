export function buildBookingInviteUrl(
  origin: string,
  locale: string,
  inviteId: string,
  inviteToken: string,
): string {
  const params = new URLSearchParams({ t: inviteToken });
  return `${origin}/${locale}/bookings/invite/${inviteId}?${params.toString()}`;
}
