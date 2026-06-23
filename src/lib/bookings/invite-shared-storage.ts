const sharedKey = (bookingId: string) => `booking-invites-shared:${bookingId}`;

export function readSharedInviteIds(bookingId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(sharedKey(bookingId)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Ne compte que les places encore en attente (ignore les anciens IDs en cache). */
export function getRelevantSharedInviteIds(
  bookingId: string,
  validInviteIds: readonly string[],
): Set<string> {
  const valid = new Set(validInviteIds.filter(Boolean));
  const shared = readSharedInviteIds(bookingId);
  const relevant = new Set([...shared].filter((id) => valid.has(id)));

  if (typeof window !== "undefined" && relevant.size !== shared.size) {
    sessionStorage.setItem(sharedKey(bookingId), JSON.stringify([...relevant]));
  }

  return relevant;
}

export function markBookingInviteShared(bookingId: string, inviteId: string): void {
  if (typeof window === "undefined" || !inviteId) return;
  const ids = [...readSharedInviteIds(bookingId), inviteId];
  sessionStorage.setItem(sharedKey(bookingId), JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(
    new CustomEvent("kifpadel:booking-invite-shared", {
      detail: { bookingId, inviteId },
    }),
  );
}

export function isBookingInviteShared(
  bookingId: string,
  inviteId: string,
  validInviteIds?: readonly string[],
): boolean {
  if (!inviteId) return false;
  const shared = validInviteIds
    ? getRelevantSharedInviteIds(bookingId, validInviteIds)
    : readSharedInviteIds(bookingId);
  return shared.has(inviteId);
}

export function countSharedInvites(
  bookingId: string,
  validInviteIds?: readonly string[],
): number {
  if (validInviteIds?.length) {
    return getRelevantSharedInviteIds(bookingId, validInviteIds).size;
  }
  return readSharedInviteIds(bookingId).size;
}
