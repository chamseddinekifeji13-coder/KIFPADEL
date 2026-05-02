import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
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
  ChevronRight
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type LocaleHomeProps = {
  params: Promise<{ locale: string }>;
};

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
      {/* Premium Header / Hero */}
      <header className="flex flex-col items-center justify-center pt-8 pb-4 text-center relative">
        {user ? (
          <Link href={`/${locale}/profile`} className="absolute top-4 right-4">
            <Avatar src={null} alt="Me" size="sm" className="ring-2 ring-gold/20 shadow-sm" />
          </Link>
        ) : (
          <Link href={`/${locale}/auth/sign-in`} className="absolute top-4 right-4">
            <div className="h-8 w-8 rounded-full bg-surface border border-gold/20 flex items-center justify-center text-gold">
              <User className="h-4 w-4" />
            </div>
          </Link>
        )}
        
        <div className="mb-4 relative">
          <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full" />
          <Trophy className="h-16 w-16 text-gold relative z-10 drop-shadow-lg" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-black tracking-widest text-white uppercase mt-2">
          KIFPADEL
        </h1>
        <p className="text-xs font-medium tracking-[0.3em] text-gold uppercase mt-2 opacity-90">
          Social Padel Club
        </p>
      </header>

      {/* Main Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-surface border border-gold/10 p-8 text-white shadow-2xl shadow-gold/5">
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

          <Link
            href={`/${locale}/play-now`}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-12 px-6 font-bold shadow-xl shadow-white/5 group transition-colors"
          >
            Commencer à jouer
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
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
      <Card className="p-6 bg-surface border-gold/10 rounded-[2rem] flex items-center gap-4 group hover:border-gold/30 transition-all">
        <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shadow-sm transition-transform group-hover:rotate-12 group-hover:bg-gold group-hover:text-black">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gold/50">Clubs à proximité</p>
          <p className="text-sm font-bold text-white leading-tight">Découvre les 12 clubs ouverts à Tunis.</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gold/40 group-hover:text-gold transition-colors" />
      </Card>
    </div>
  );
}
