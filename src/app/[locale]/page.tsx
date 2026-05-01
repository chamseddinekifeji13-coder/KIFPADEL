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
  MapPin,
  ArrowRight,
  ChevronRight,
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

  return (
    <div className="space-y-8 pb-20">
      {/* Header / Hero */}
      <header className="flex items-center justify-between py-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--foreground-muted)]">Bienvenue sur</p>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
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
      <section className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-white">
        {/* Gold accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--gold)] rounded-full blur-[100px] opacity-10 -mr-20 -mt-20" />
        
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
            <Sparkles className="h-3 w-3" />
            Premium Padel
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-balance">
              Kiffe ta partie, trouve tes partenaires.
            </h2>
            <p className="text-[var(--foreground-muted)] text-sm max-w-[280px] leading-relaxed">
              La plateforme n°1 en Tunisie pour réserver et jouer au Padel.
            </p>
          </div>

          <Link 
            href={`/${locale}/play-now`}
            className="inline-flex items-center gap-2 bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-black rounded-xl h-12 px-6 font-bold transition-all active:scale-95 group"
          >
            Commencer à jouer
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Navigation Cards */}
      <div className="grid gap-4">
        <h3 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-widest px-1">
          Que veux-tu faire ?
        </h3>
        <IntentCard
          href={`/${locale}/play-now`}
          title={dictionary.common.playNow}
          description={dictionary.common.playNowDescription}
          icon={Trophy}
          variant="secondary"
        />
        <div className="grid grid-cols-2 gap-4">
          <IntentCard
            href={`/${locale}/find-players`}
            title="Partenaires"
            description="Trouve des joueurs"
            icon={Search}
          />
          <IntentCard
            href={`/${locale}/book`}
            title="Réserver"
            description="Choisis ton club"
            icon={Calendar}
          />
        </div>
      </div>

      {/* Local Info Card - Dark Theme */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center gap-4 group hover:border-[var(--gold)]/30 transition-colors">
        <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)]">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
            Clubs à proximité
          </p>
          <p className="text-sm font-bold text-white leading-tight">
            Découvre les 12 clubs ouverts à Tunis.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--foreground-muted)]" aria-hidden="true" />
      </div>
    </div>
  );
}
