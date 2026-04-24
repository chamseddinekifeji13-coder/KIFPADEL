import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { SectionTitle } from "@/components/ui/section-title";
import { ArrowLeft, Sparkles, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { CreateMatchForm } from "./create-match-form";

type CreateMatchPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CreateMatchPage({ params }: CreateMatchPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const clubs = await clubService.getClubs();

  return (
    <div className="flex-1 space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <Link 
          href={`/${locale}/play-now`}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Créer un match</h1>
      </header>

      {/* Hero Tip */}
      <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2 text-sky-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Conseil d'expert</span>
          </div>
          <p className="text-sm font-medium leading-relaxed opacity-90">
            Les matchs ouverts entre 18h et 21h se remplissent <b>3x plus vite</b>. Choisissez un créneau prisé pour jouer à coup sûr !
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <CreateMatchForm clubs={clubs as any} locale={locale} />
      </section>
    </div>
  );
}
