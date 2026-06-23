export type AccountVerifiedCelebrationLabels = {
  title: string;
  body: string;
  ctaBook: string;
  ctaFindPlayers: string;
  ctaPlayNow: string;
  dismiss: string;
};

function interpolate(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

export function buildAccountVerifiedCelebrationLabels(
  labels: Record<string, string>,
  displayName: string,
): AccountVerifiedCelebrationLabels {
  const name =
    displayName.trim().charAt(0).toUpperCase() + displayName.trim().slice(1) || "Joueur";

  return {
    title: interpolate(labels.accountVerifiedTitle ?? "Félicitations, {name} !", name),
    body: labels.accountVerifiedBody ?? "",
    ctaBook: labels.accountVerifiedCtaBook ?? "Réserver un terrain",
    ctaFindPlayers: labels.accountVerifiedCtaFindPlayers ?? "Trouver des joueurs",
    ctaPlayNow: labels.accountVerifiedCtaPlayNow ?? "Jouer maintenant",
    dismiss: labels.accountVerifiedDismiss ?? "Continuer vers mon profil",
  };
}
