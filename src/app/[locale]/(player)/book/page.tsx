import { PlaceholderScreen } from "@/components/features/placeholder-screen";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";

type BookCourtPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BookCourtPage({ params }: BookCourtPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);

  return (
    <PlaceholderScreen
      title={dictionary.player.bookTitle}
      subtitle={dictionary.player.bookSubtitle}
    />
  );
}
