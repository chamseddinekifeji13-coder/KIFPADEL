import Link from "next/link";

type InvitePlayerButtonProps = {
  locale: string;
  /** Identifiant profil (pour liens futurs / traçabilité). */
  playerId: string;
  playerDisplayName: string;
  label?: string;
};

/**
 * Lance le flux « invitation » : création de match avec le joueur en contexte.
 * Lien natif (plus fiable que `router.push` sur mobile Android Chrome).
 */
export function InvitePlayerButton({
  locale,
  playerId,
  playerDisplayName,
  label = "Inviter",
}: InvitePlayerButtonProps) {
  const q = new URLSearchParams({
    invitePlayer: playerId,
    inviteName: playerDisplayName.trim() || "Joueur",
  });

  return (
    <Link
      href={`/${locale}/matches/create?${q.toString()}`}
      prefetch={false}
      className="relative z-10 inline-flex min-h-[44px] shrink-0 items-center justify-center text-[10px] font-black uppercase tracking-widest text-black px-4 py-2 rounded-xl bg-gold hover:bg-gold-light active:scale-95 transition-all shadow-gold touch-manipulation select-none"
    >
      {label}
    </Link>
  );
}
