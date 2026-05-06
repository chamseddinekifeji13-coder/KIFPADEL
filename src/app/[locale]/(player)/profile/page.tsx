import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { playerService } from "@/modules/players/service";
import { fetchBookingsForPlayer } from "@/modules/bookings/repository";
import { Player } from "@/modules/players/repository";
import { LeagueProgress } from "@/components/features/players/league-progress";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
  const dictionary = await getDictionary(locale);
  const labels = dictionary.player;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  let profile: Player | null = null;
  try {
    profile = await playerService.getPlayerProfile(user.id);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
  }

  if (!profile) {
    redirect(`/${locale}/onboarding`);
  }

  const [topRivals, bookings] = await Promise.all([
    playerService.getTopRivals(user.id, 3),
    fetchBookingsForPlayer(user.id, 20),
  ]);
  const completedCount = bookings.filter((booking) => booking.status === "completed").length;
  const cancelledCount = bookings.filter((booking) => booking.status === "cancelled").length;

  return (
    <div className="flex-1 p-4 space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">{labels.profileTitle}</h1>
        <button 
          aria-label={labels.profileSettingsAria}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>


      {/* Virtual Member Card */}
      <section className="relative overflow-hidden rounded-[2rem] aspect-[1.6/1] bg-[var(--surface)] border border-[var(--gold)]/20 p-6 flex flex-col justify-between text-white shadow-2xl shadow-black/20 group">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)] rounded-full blur-[90px] opacity-10 -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-[70px] opacity-5 -ml-20 -mb-20" />
        
        <div className="relative flex justify-between items-start">
          <div className="space-y-4">
            <div className="h-8 w-8 bg-white/10 rounded-lg backdrop-blur-md flex items-center justify-center border border-white/10">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{labels.profileCardRoleLabel}</p>
              <h2 className="text-xl font-bold">{profile.display_name}</h2>
            </div>
          </div>
          <Badge variant={profile.league.toLowerCase() as BadgeProps["variant"]} className="border-white/20 backdrop-blur-sm px-4 py-1.5 uppercase tracking-wider">
            {profile.league}
          </Badge>
        </div>

        <div className="relative flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {labels.reliabilityLabel}
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">{profile.reliability_status}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter">KIF-2026</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">{labels.profileCardIdLabel}</p>
          </div>
        </div>
      </section>

      {/* Progression */}
      <Card className="p-6 space-y-6 bg-[var(--surface)] border-[var(--border)]">
        <SectionTitle 
          title={labels.rankingSectionTitle}
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
        <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border-[var(--border)]">
          <div className="h-10 w-10 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
            <Star className="h-5 w-5 fill-[var(--gold)]" />
          </div>
          <span className="text-xs font-bold text-white">{labels.completedSessionsLabel}</span>
          <span className="text-lg font-black text-[var(--gold)]">{completedCount}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border-[var(--border)]">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-300 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-white">{labels.cancelledBookingsLabel}</span>
          <span className="text-lg font-black text-rose-300">{cancelledCount}</span>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle title={labels.topRivalsTitle} className="text-sm opacity-80 px-2 text-white" />
        <div className="space-y-2">
          {topRivals.length === 0 ? (
            <Card className="p-4 bg-[var(--surface)] border-[var(--border)] text-sm text-[var(--foreground-muted)]">
              {labels.topRivalsEmpty}
            </Card>
          ) : (
            topRivals.map((rival) => (
              <Card key={rival.userId} className="p-4 bg-[var(--surface)] border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{rival.name}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {rival.encounters} {labels.rivalEncountersLabel}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                  {labels.eloViewLabel}
                </span>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Account Settings List */}
      <section className="space-y-3">
        <SectionTitle title={labels.accountSettingsTitle} className="text-sm opacity-50 px-2" />
        <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] divide-y divide-[var(--border)] shadow-sm overflow-hidden">
          {[
            { label: labels.accountPersonalInfo, icon: "user" },
            { label: labels.accountNotifications, icon: "bell" },
            { label: labels.accountSupport, icon: "help" },
          ].map((item) => (
            <button key={item.label} className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors group">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
