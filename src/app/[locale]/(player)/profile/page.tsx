import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { playerService } from "@/modules/players/service";
import { LeagueProgress } from "@/components/features/players/league-progress";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { 
  Trophy, 
  ShieldCheck, 
  CreditCard, 
  Settings, 
  ChevronRight, 
  History,
  Star
} from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await playerService.getPlayerProfile(user.id);
  if (!profile) notFound();

  return (
    <div className="flex-1 p-4 space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
        <button 
          aria-label="Paramètres du profil"
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>


      {/* Virtual Member Card */}
      <section className="relative overflow-hidden rounded-[2rem] aspect-[1.6/1] bg-slate-900 p-6 flex flex-col justify-between text-white shadow-2xl shadow-sky-900/20 group">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 group-hover:opacity-30 transition-opacity" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[60px] opacity-10 -ml-20 -mb-20" />
        
        <div className="relative flex justify-between items-start">
          <div className="space-y-4">
            <div className="h-8 w-8 bg-white/10 rounded-lg backdrop-blur-md flex items-center justify-center border border-white/10">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Padel Member</p>
              <h2 className="text-xl font-bold">{profile.display_name}</h2>
            </div>
          </div>
          <Badge variant={profile.league.toLowerCase() as any} className="border-white/20 backdrop-blur-sm px-4 py-1.5 uppercase tracking-wider">
            {profile.league}
          </Badge>
        </div>

        <div className="relative flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Reliability</p>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">{profile.reliability_status}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter">KIF-2026</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Player ID</p>
          </div>
        </div>
      </section>

      {/* Progression */}
      <Card className="p-6 space-y-6">
        <SectionTitle 
          title="Classement & Progression" 
          icon={<Trophy className="h-4 w-4" />}
          className="bg-transparent p-0"
        />
        <LeagueProgress 
          score={profile.trust_score} 
          currentLeague={profile.league} 
        />
      </Card>

      {/* Stats Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Star className="h-5 w-5 fill-amber-600" />
          </div>
          <span className="text-xs font-bold text-slate-900">Historique Points</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Mes Matchs</span>
        </Card>
      </div>

      {/* Account Settings List */}
      <section className="space-y-3">
        <SectionTitle title="Paramètres du compte" className="text-sm opacity-50 px-2" />
        <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 shadow-sm overflow-hidden">
          {[
            { label: "Informations personnelles", icon: "user" },
            { label: "Préférences de notifications", icon: "bell" },
            { label: "Assistance & Support", icon: "help" },
          ].map((item) => (
            <button key={item.label} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <span className="text-sm font-bold text-slate-700 group-hover:text-sky-600">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
