import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayerCard } from "@/components/features/players/player-card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { playerService } from "@/modules/players/service";

type SearchPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: SearchPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Find players" : "Trouver des joueurs",
    description: isEn
      ? "Search compatible padel players by name and join games faster."
      : "Recherchez des joueurs de padel compatibles par nom et trouvez des parties plus vite.",
    alternates: { canonical: `/${locale}/search` },
  };
}

export default async function SearchPlayersPage({ params, searchParams }: SearchPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { q } = await searchParams;

  const dictionary = await getDictionary(locale as Locale);
  const players = await playerService.getPlayers(q);
  const isEn = locale === "en";

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-black text-white">
          {dictionary.player.findPlayersTitle}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {dictionary.player.findPlayersSubtitle}
        </p>
      </header>

      <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={isEn ? "Search player name..." : "Rechercher un joueur..."}
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white placeholder:text-[var(--foreground-muted)]"
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {isEn ? "Search" : "Rechercher"}
        </button>
      </form>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--foreground-muted)]">
          {q
            ? isEn
              ? `No player found for "${q}".`
              : `Aucun joueur trouvé pour "${q}".`
            : isEn
              ? "No players available for now."
              : "Aucun joueur disponible pour le moment."}
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </section>
  );
}
