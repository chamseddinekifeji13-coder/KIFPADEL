export const USER_ROLES = [
  "player",
  "club_staff",
  "club_manager",
  "platform_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function hasClubAccess(role: UserRole): boolean {
  return role === "club_staff" || role === "club_manager" || role === "platform_admin";
}

export function canModerateIncidents(role: UserRole): boolean {
  return role === "club_manager" || role === "platform_admin";
}
