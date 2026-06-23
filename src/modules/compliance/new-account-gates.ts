const NEW_ACCOUNT_DAYS = 7;
const NEW_ACCOUNT_TRUST_THRESHOLD = 55;

export type ProfileGateInput = {
  created_at?: string | null;
  trust_score?: number | null;
  phone_verified_at?: string | null;
};

export type BookingPaymentGateOptions = {
  /** Inviteur établi (téléphone vérifié, compte mature) → filleul peut payer sur place. */
  inviterIsConfirmed?: boolean;
  /** Lien émis par le gérant club (résa téléphone) → paiement sur place autorisé. */
  invitedByClub?: boolean;
};

export function isPhoneVerified(profile: ProfileGateInput): boolean {
  return Boolean(profile.phone_verified_at);
}

type EmailConfirmedUser = {
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: string } | null;
};

/** E-mail confirmé (lien d'activation) ou fournisseur OAuth vérifié (Google). */
export function isEmailConfirmed(user: EmailConfirmedUser): boolean {
  if (user.email_confirmed_at) return true;
  const provider = user.app_metadata?.provider;
  return provider === "google" || provider === "apple";
}

/** Compte récent ou score encore faible → restrictions anti-faux profil. */
export function isNewAccountForGates(profile: ProfileGateInput): boolean {
  const created = profile.created_at ? new Date(profile.created_at).getTime() : Date.now();
  const ageDays = (Date.now() - created) / (24 * 60 * 60 * 1000);
  const trust = profile.trust_score ?? 70;
  return ageDays < NEW_ACCOUNT_DAYS || trust < NEW_ACCOUNT_TRUST_THRESHOLD;
}

export function newAccountMustPayOnline(profile: ProfileGateInput): boolean {
  return isNewAccountForGates(profile);
}

/** Joueur « confirmé » : peut parrainer un paiement sur place pour un compte récent invité. */
export function isConfirmedPlayer(profile: ProfileGateInput): boolean {
  const trust = profile.trust_score ?? 70;
  if (trust < 45) return false;
  if (!isPhoneVerified(profile)) return false;
  return !isNewAccountForGates(profile);
}

/** Aligné avec createBookingAction / accept invite : wallet obligatoire sauf compte récent invité par un confirmé. */
export function mustUseWalletForBooking(
  profile: ProfileGateInput,
  options?: BookingPaymentGateOptions,
): boolean {
  const trust = profile.trust_score ?? 70;
  if (trust < 45) return true;
  if (newAccountMustPayOnline(profile)) {
    if (options?.invitedByClub || options?.inviterIsConfirmed) return false;
    return true;
  }
  return false;
}
