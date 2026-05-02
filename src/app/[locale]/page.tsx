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
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[var(--surface)] border border-[var(--gold)]/20 shadow-lg shadow-[var(--gold)]/5 p-1">
            <img 
              src="/icons/icon.svg" 
              alt="Kifpadel Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest">Tunisia</p>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
              KIF<span className="text-[var(--gold)]">PADEL</span>
            </h1>
          </div>
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
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {isEn
                ? "The ultimate Padel experience"
                : "L'expérience Padel ultime"}
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] text-balance sm:text-base">
              {isEn
                ? "Join the largest community of padel players in Tunisia. Book courts in seconds and find the perfect match."
                : "Rejoignez la plus grande communauté de joueurs de padel en Tunisie. Réservez vos terrains en quelques secondes."}
            </p>
          </div>

          {!user && (
            <Link
              href={`/${locale}/auth/sign-up`}
              className="group relative flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--gold)] px-8 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            >
              {isEn ? "Start Playing" : "Commencer à jouer"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </section>

      {/* Intent Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <IntentCard
          href={`/${locale}/book`}
          title={dictionary.common.bookCourt}
          description={dictionary.common.bookCourtDescription}
          icon={Calendar}
          variant="primary"
        />
        <IntentCard
          href={`/${locale}/matches`}
          title={dictionary.common.playNow}
          description={dictionary.common.playNowDescription}
          icon={Trophy}
          variant="secondary"
        />
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/${locale}/clubs`}
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-[var(--gold)]">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-white">
            {isEn ? "Browse Clubs" : "Explorer les clubs"}
          </span>
        </Link>
        <Link
          href={`/${locale}/search`}
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-[var(--gold)]">
            <Search className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-white">
            {isEn ? "Find Players" : "Trouver des joueurs"}
          </span>
        </Link>
      </div>

      {/* Trust Indicator */}
      <div className="flex flex-col items-center justify-center space-y-4 pt-10 text-center">
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-8 rounded-full border-2 border-[var(--background)] bg-[var(--surface)] overflow-hidden">
              <img src={`https://i.pravatar.cc/100?u=padel${i}`} alt="" className="h-full w-full object-cover opacity-80" />
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">
          {isEn 
            ? "Trusted by 10,000+ players in Tunisia" 
            : "Déjà 10,000+ joueurs nous font confiance"}
        </p>
      </div>
    </div>
  );
}
