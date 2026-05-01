export type UUID = string;

export type League = "bronze" | "silver" | "gold" | "platinum";
export type VerificationLevel = 1 | 2 | 3;
export type ReliabilityStatus = "healthy" | "warning" | "restricted" | "blacklisted";

export type UserRole = "player" | "club_staff" | "club_manager" | "platform_admin";

export type User = {
  id: UUID;
  email: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export type PlayerProfile = {
  userId: UUID;
  displayName: string;
  photoUrl: string | null;
  city: string;
  mainClubId: UUID | null;
  sportRating: number;
  league: League;
  trustScore: number;
  reliabilityStatus: ReliabilityStatus;
  verificationLevel: VerificationLevel;
};

export type Club = {
  id: UUID;
  name: string;
  city: string;
  isActive: boolean;
};

export type ClubMembership = {
  id: UUID;
  clubId: UUID;
  playerId: UUID;
  isPrimary: boolean;
  joinedAt: string;
};

export type Court = {
  id: UUID;
  clubId: UUID;
  label: string;
  surface: "panoramic" | "standard";
  isIndoor: boolean;
};

export type TimeSlot = {
  id: UUID;
  clubId: UUID;
  courtId: UUID;
  startsAt: string;
  endsAt: string;
  capacity: number;
  isOpen: boolean;
};

export type PaymentMethod = "online" | "on_site";

export type Booking = {
  id: UUID;
  clubId: UUID;
  courtId: UUID;
  playerId: UUID;
  startsAt: string;
  endsAt: string;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
};

export type Match = {
  id: UUID;
  clubId: UUID | null;
  createdBy: UUID;
  startsAt: string;
  status: "open" | "locked" | "played" | "cancelled";
};

export type MatchParticipant = {
  matchId: UUID;
  playerId: UUID;
  team: "A" | "B";
  joinedAt: string;
};

export type MatchResult = {
  matchId: UUID;
  winnerTeam: "A" | "B";
  validatedAt: string;
  validatedBy: UUID;
};

export type TrustEvent = {
  id: UUID;
  playerId: UUID;
  kind: "no_show" | "late_cancel" | "bad_behavior" | "good_behavior";
  delta: number;
  createdAt: string;
};

export type Incident = {
  id: UUID;
  clubId: UUID;
  playerId: UUID;
  reason: "no_show" | "late_cancel" | "behavior" | "fraud";
  createdAt: string;
};

export type Sanction = {
  id: UUID;
  playerId: UUID;
  level: "warning" | "temporary_ban" | "blacklist";
  reason: string;
  createdAt: string;
};

export type MemberCard = {
  id: UUID;
  playerId: UUID;
  qrCodeValue: string;
  issuedAt: string;
};
