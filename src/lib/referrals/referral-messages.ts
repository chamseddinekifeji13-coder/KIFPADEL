export type ReferralMessageVariant = "player" | "platform" | "club";

export type ReferralShareCopy = {
  title: string;
  text: string;
  payload: string;
};

type BuildReferralMessageInput = {
  locale: string;
  url: string;
  variant: ReferralMessageVariant;
  referrerName?: string;
  /** Lien connexion (variant club) pour les gestionnaires déjà inscrits. */
  secondaryUrl?: string;
};

export function buildReferralShareCopy(input: BuildReferralMessageInput): ReferralShareCopy {
  const isEn = input.locale === "en";
  const name = input.referrerName?.trim() || (isEn ? "A friend" : "Un ami");

  if (input.variant === "club") {
    const signInUrl = input.secondaryUrl?.trim() || input.url;
    const title = isEn ? "Kifpadel — free club profile" : "Kifpadel — profil club gratuit";
    const text = isEn
      ? `Hello,\n\nKifpadel invites your club to join Tunisia's padel network and create your club profile for free.\n\n✅ Free club account creation\n✅ No sign-up fees\n✅ No commitment\n\nStep 1 — Create your account:\n${input.url}\n\nStep 2 — Already registered? Sign in to create your club:\n${signInUrl}`
      : `Bonjour,\n\nKifpadel vous invite à rejoindre le réseau padel en Tunisie et à créer gratuitement le profil de votre club.\n\n✅ Création de compte club gratuite\n✅ Aucun frais à l'inscription\n✅ Sans engagement\n\nÉtape 1 — Créez votre compte :\n${input.url}\n\nÉtape 2 — Déjà inscrit ? Connectez-vous pour créer votre club :\n${signInUrl}`;
    const payload = `${text}`;
    return { title, text, payload };
  }

  if (input.variant === "platform") {
    const title = isEn ? "Join Kifpadel" : "Rejoignez Kifpadel";
    const text = isEn
      ? `Discover Kifpadel — Tunisia's padel network.\n\nBook courts, find partners at your level, join open matches and tournaments.\n\nFree sign-up:`
      : `Découvre Kifpadel — le réseau padel en Tunisie.\n\nRéserve un terrain, trouve des partenaires à ton niveau, rejoins des matchs ouverts et des tournois.\n\nInscription gratuite :`;
    const payload = `${text}\n${input.url}`;
    return { title, text, payload };
  }

  const title = isEn ? "Kifpadel invitation" : "Invitation Kifpadel";
  const text = isEn
    ? `Hi!\n\n${name} invites you to join Kifpadel — book courts, find players and play padel across Tunisia.\n\nFree sign-up:`
    : `Salut !\n\n${name} t'invite à rejoindre Kifpadel — réserve des terrains, trouve des partenaires et joue au padel partout en Tunisie.\n\nInscription gratuite :`;
  const payload = `${text}\n${input.url}`;
  return { title, text, payload };
}
