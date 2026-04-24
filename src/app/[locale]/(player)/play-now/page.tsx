import { PlaceholderScreen } from "@/components/features/placeholder-screen";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";

type PlayNowPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PlayNowPage({ params }: PlayNowPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <PlaceholderScreen
      title={dictionary.player.playNowTitle}
      subtitle={dictionary.player.playNowSubtitle}
    />
  );
}
