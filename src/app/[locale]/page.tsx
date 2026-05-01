import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    ? "Kifpadel — Book and play padel in Tunisia"
    : "Kifpadel — Réservez et jouez au padel en Tunisie";
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
          <p className="text-sm font-medium text-slate-500">Bienvenue sur</p>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
            Kif<span className="text-sky-600">padel</span>
          </h1>
        </div>
        {user ? (
          <Link href={`/${locale}/profile`} aria-label="Mon profil">
            <Avatar src={null} alt="" size="lg" className="ring-4 ring-sky-50 shadow-sm" />
          </Link>
        ) : (
          <Link
            href={`/${locale}/auth/sign-in`}
            aria-label="Se connecter"
            className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400"
          >
            <User className="h-6 w-6" aria-hidden="true" />
          </Link>
        )}
      </header>

      {/* Main Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20" />
        
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-sky-300">
            <Sparkles className="h-3 w-3" />
            Vibrez padel
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">Kiffe ta partie, trouve tes partenaires.</h2>
            <p className="text-slate-400 text-sm max-w-[240px] leading-relaxed">
              La plateforme n°1 en Tunisie pour réserver et jouer au Padel.
            </p>
          </div>

          <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-12 px-6 font-bold shadow-xl shadow-white/5 group">
            Commencer à jouer
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      {/* Navigation Cards */}
      <div className="grid gap-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Que veux-tu faire ?</h3>
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

      {/* Local Info Card */}
      <Card className="p-6 bg-emerald-50 border-emerald-100/50 rounded-[2rem] flex items-center gap-4 group">
        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm transition-transform group-hover:rotate-12">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/50">Clubs à proximité</p>
          <p className="text-sm font-bold text-emerald-900 leading-tight">Découvre les 12 clubs ouverts à Tunis.</p>
        </div>
        <ChevronRight className="h-5 w-5 text-emerald-400" aria-hidden="true" />
      </Card>
    </div>
  );
}
