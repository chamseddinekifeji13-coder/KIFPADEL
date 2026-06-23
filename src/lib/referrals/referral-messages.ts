export type ReferralMessageVariant = "player" | "platform";

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
};

export function buildReferralShareCopy(input: BuildReferralMessageInput): ReferralShareCopy {
  const isEn = input.locale === "en";
  const name = input.referrerName?.trim() || (isEn ? "A friend" : "Un ami");

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
