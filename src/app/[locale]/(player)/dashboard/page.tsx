import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";
import { Trophy, Star, Calendar, ShieldCheck, ChevronRight, User } from "lucide-react";
import Link from "next/link";

export default async function PlayerDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  
  const user = await requireUser({ locale, redirectPath: "dashboard" });
  const dictionary = await getDictionary(locale as Locale);
  const profile = await playerService.getPlayerProfile(user.id);

  if (!profile) redirect(`/${locale}/onboarding`);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-end py-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tableau de bord</p>
          <h1 className="text-2xl font-black text-slate-900">Salut, {profile.display_name} 👋</h1>
        </div>
        <Link 
          href={`/${locale}/profile`}
          className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold hover:text-black transition-all"
        >
          <User className="h-5 w-5" />
        </Link>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-slate-900 text-white border-0 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy className="h-12 w-12 text-gold" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Niveau</p>
          <p className="text-xl font-black text-gold">{profile.league}</p>
          <p className="text-[9px] mt-1 text-slate-500">Progression continue</p>
        </Card>

        <Card className="p-4 border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fiabilité</p>
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              <span className="text-sm font-bold uppercase">{profile.reliability_status}</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400">Confiance: {profile.trust_score}/100</p>
        </Card>
      </div>

      {/* Main Actions */}
      <section className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Que veux-tu faire ?</h3>
        <div className="grid gap-3">
          <Link href={`/${locale}/play-now`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-gold/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Rejoindre un match</p>
                <p className="text-xs text-slate-500">Trouve une partie ouverte</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href={`/${locale}/book`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-gold/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Réserver un terrain</p>
                <p className="text-xs text-slate-500">Choisis ton club préféré</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href={`/${locale}/find-players`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-gold/50 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Chercher des partenaires</p>
                <p className="text-xs text-slate-500">Complète ton équipe</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
