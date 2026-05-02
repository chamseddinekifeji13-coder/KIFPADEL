import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { IntentCard } from "@/components/ui/intent-card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Trophy,
  Search,
  Calendar,
  Sparkles,
  User,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type LocaleHomeProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocaleHomeProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn
    ? "KIFPADEL — Book and play padel in Tunisia"
    : "KIFPADEL — Réservez et jouez au padel en Tunisie";
  const description = isEn
    ? "Book courts, find partners and join open padel matches in the best clubs across Tunisia."
    : "Réservez des terrains, trouvez des partenaires et rejoignez des matchs ouverts dans les meilleurs clubs de padel de Tunisie.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${locale}` },
    openGraph: {
      title,
      description,
      url: `/${locale}`,
      locale: isEn ? "en_US" : "fr_FR",
    },
  };
}

export default async function LocaleHomePage({ params }: LocaleHomeProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isEn = locale === "en";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 pb-20">
      {/* Header / Hero */}
      <header className="flex items-center justify-between py-2 sm:py-4">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-[var(--foreground-muted)]">
            {isEn ? "Welcome to" : "Bienvenue sur"}
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase sm:text-5xl">
            KIF<span className="text-[var(--gold)]">PADEL</span>
          </h1>
        </div>
        {user ? (
          <Link href={`/${locale}/profile`} aria-label="Mon profil">
            <Avatar src={null} alt="" size="lg" className="ring-2 ring-[var(--gold)]/20" />
          </Link>
        ) : (
          <Link
            href={`/${locale}/auth/sign-in`}
            aria-label="Se connecter"
            className="h-12 w-12 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-white transition-colors"
          >
            <User className="h-6 w-6" aria-hidden="true" />
          </Link>
        )}
      </header>

      {/* Main Section - Premium Dark */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
        {/* Gold accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--gold)] rounded-full blur-[100px] opacity-10 -mr-20 -mt-20" />
        
        <div className="relative mx-auto flex max-w-2xl flex-col items-center space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
            <Sparkles className="h-3 w-3" />
            {isEn ? "Premium Padel" : "Premium Padel"}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              {isEn
                ? "Enjoy your match, find your partners."
                : "Kiffe ta partie, trouve tes partenaires."}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--foreground-muted)]">
              {isEn
                ? "The #1 platform in Tunisia to book courts, join matches and grow your padel community."
                : "La plateforme n°1 en Tunisie pour réserver, rejoindre des matchs et faire grandir votre communauté padel."}
            </p>
          </div>

          <Link 
            href={`/${locale}/play-now`}
            className="group inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-6 font-bold text-black transition-all hover:bg-[var(--gold-dark)] active:scale-95"
          >
            {isEn ? "Start playing" : "Commencer à jouer"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Player / Club Spaces */}
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <article className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
              {isEn ? "Player Space" : "Espace Joueur"}
            </p>
            <h3 className="text-xl font-bold text-white">
              {isEn ? "Find games and book fast" : "Trouve tes parties et réserve vite"}
            </h3>
          </div>
          <div className="space-y-3">
            <IntentCard
              href={`/${locale}/dashboard`}
              title={isEn ? "Player Dashboard" : "Dashboard Joueur"}
              description={isEn ? "My matches, stats and level" : "Mes matchs, stats et niveau"}
              icon={User}
              variant="secondary"
            />
            <IntentCard
              href={`/${locale}/play-now`}
              title={dictionary.common.playNow}
              description={dictionary.common.playNowDescription}
              icon={Trophy}
              variant="secondary"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <IntentCard
                href={`/${locale}/find-players`}
                title={isEn ? "Partners" : "Partenaires"}
                description={isEn ? "Find players nearby" : "Trouve des joueurs"}
                icon={Search}
              />
              <IntentCard
                href={`/${locale}/book`}
                title={isEn ? "Book" : "Réserver"}
                description={isEn ? "Pick your club" : "Choisis ton club"}
                icon={Calendar}
              />
            </div>
          </div>
        </article>

        <article className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
              {isEn ? "Club Space" : "Espace Club"}
            </p>
            <h3 className="text-xl font-bold text-white">
              {isEn ? "Manage operations with clarity" : "Pilote ton activité club avec clarté"}
            </h3>
          </div>
          <div className="space-y-3">
            <IntentCard
              href={`/${locale}/club/dashboard`}
              title={isEn ? "Club Dashboard" : "Dashboard Club"}
              description={
                isEn
                  ? "Bookings, incidents, payments and operations."
                  : "Réservations, incidents, paiements et pilotage."
              }
              icon={Building2}
              variant="secondary"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href={`/${locale}/clubs/new`}
                className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/20 text-center"
              >
                {isEn ? "Create a club" : "Créer un club"}
              </Link>
              <Link
                href={`/${locale}/club/courts`}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-[var(--gold)]/30 text-center"
              >
                {isEn ? "Manage courts" : "Gérer les terrains"}
              </Link>
            </div>
          </div>
        </article>
      </section>

    </div>
  );
}
