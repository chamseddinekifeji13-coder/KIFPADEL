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
    <div className="mx-auto w-full max-w-5xl space-y-12 pb-32 animate-fade-in px-4 sm:px-0">
      {/* Header / Hero */}
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl glass-gold p-1.5 group">
            <img 
              src="/icons/icon.svg" 
              alt="Kifpadel Logo" 
              className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">Tunisia</p>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">
              KIF<span className="text-gold-gradient bg-gold-gradient bg-clip-text text-transparent">PADEL</span>
            </h1>
          </div>
        </div>
        {user ? (
          <Link href={`/${locale}/profile`} aria-label="Mon profil" className="active:scale-90 transition-transform">
            <Avatar src={null} alt="" size="lg" className="ring-2 ring-gold/20 shadow-gold" />
          </Link>
        ) : (
          <Link
            href={`/${locale}/auth/sign-in`}
            aria-label="Se connecter"
            className="h-12 w-12 rounded-2xl glass flex items-center justify-center text-foreground-muted hover:text-gold transition-all hover:bg-gold/10"
          >
            <User className="h-6 w-6" aria-hidden="true" />
          </Link>
        )}
      </header>

      {/* Main Section - Premium Dark */}
      <section className="relative overflow-hidden rounded-[2rem] bg-surface-elevated/40 p-8 text-white sm:p-16 group">
        {/* Subtle Gold accent */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold rounded-full blur-[120px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000" />
        
        <div className="relative flex max-w-2xl flex-col items-start space-y-10 text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-gold animate-slide-up">
            <Sparkles className="h-3 w-3" />
            {isEn ? "Elite Padel Platform" : "Plateforme Elite"}
          </div>
          
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-4xl font-black tracking-tight text-balance sm:text-5xl uppercase leading-[1.1]">
              {isEn
                ? "The ultimate Padel experience"
                : "L'expérience Padel ultime"}
            </h2>
            <p className="text-sm text-foreground-muted text-balance max-w-md font-medium leading-relaxed">
              {isEn
                ? "Join the largest community of padel players in Tunisia. Book courts in seconds and find the perfect match."
                : "Rejoignez l'élite du padel en Tunisie. Réservez vos terrains en quelques secondes et trouvez des partenaires à votre niveau."}
            </p>
          </div>

          {!user && (
            <Link
              href={`/${locale}/auth/sign-up`}
              className="group relative flex h-14 items-center justify-center gap-3 rounded-2xl bg-gold px-10 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-all hover:shadow-gold-strong active:scale-[0.98] animate-slide-up"
            >
              {isEn ? "Start Playing" : "Rejoindre l'aventure"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </section>

      {/* Intent Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        <IntentCard
          href={`/${locale}/book`}
          title={dictionary.common.bookCourt}
          description={dictionary.common.bookCourtDescription}
          icon={Calendar}
          variant="primary"
        />
        <IntentCard
          href={`/${locale}/play-now`}
          title={dictionary.common.playNow}
          description={dictionary.common.playNowDescription}
          icon={Trophy}
          variant="secondary"
        />
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-6">
        <Link
          href={`/${locale}/clubs`}
          className="flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-surface-elevated border border-white/5 p-8 transition-all hover:shadow-gold-strong hover:border-gold/30 group active:scale-95"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/5 text-gold group-hover:bg-gold group-hover:text-black transition-all">
            <Building2 className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {isEn ? "Clubs" : "Explorer"}
          </span>
        </Link>
        <Link
          href={`/${locale}/find-players`}
          className="flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-surface-elevated border border-white/5 p-8 transition-all hover:shadow-gold-strong hover:border-gold/30 group active:scale-95"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/5 text-gold group-hover:bg-gold group-hover:text-black transition-all">
            <Search className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {isEn ? "Players" : "Joueurs"}
          </span>
        </Link>
      </div>

      {/* Trust Indicator */}
      <div className="flex flex-col items-center justify-center space-y-6 pt-12 text-center opacity-80">
        <div className="flex -space-x-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-10 rounded-full border-4 border-background bg-surface-elevated overflow-hidden shadow-premium">
              <img src={`https://i.pravatar.cc/100?u=padel${i}`} alt="" className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
          ))}
        </div>
        <p className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em]">
          {isEn 
            ? "Trusted by 10,000+ elite players" 
            : "Communauté de 10,000+ joueurs"}
        </p>
      </div>
    </div>
  );
}
