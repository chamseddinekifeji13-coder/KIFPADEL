import { PlaceholderScreen } from "@/components/features/placeholder-screen";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";

type MatchDetailsPageProps = {
  params: Promise<{ locale: string; matchId: string }>;
};

export default async function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const { locale, matchId } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <PlaceholderScreen
      title={`${dictionary.player.matchTitle} #${matchId}`}
      subtitle={dictionary.player.matchSubtitle}
    />
  );
}
