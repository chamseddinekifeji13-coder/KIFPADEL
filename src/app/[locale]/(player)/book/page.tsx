import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { clubService } from "@/modules/clubs/service";
import { ClubCard } from "@/components/features/clubs/club-card";
import { SectionTitle } from "@/components/ui/section-title";
import { LayoutGrid, MapPin } from "lucide-react";

type BookPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  // Fetch real clubs from Supabase
  const clubs = await clubService.getClubs();

  return (
    <div className="flex-1 p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {dictionary.player.bookTitle}
        </h1>
        <p className="text-sm text-slate-500">
          Réservez un terrain dans les meilleurs clubs de Padel.
        </p>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {["Tous", "Tunis", "Sousse", "Hammamet", "Sfax"].map((city, i) => (
          <button
            key={city}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              i === 0
                ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <SectionTitle
          title="Meilleurs Clubs"
          icon={<LayoutGrid className="h-4 w-4" />}
        />
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <MapPin className="h-3 w-3" />
          À proximité
        </div>
      </div>

      <div className="grid gap-6">
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club as any} />
        ))}
      </div>
    </div>
  );
}
