import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";

type SearchPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: SearchPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Find players" : "Trouver des joueurs",
    description: isEn
      ? "Search compatible padel players by name and join games faster."
      : "Recherchez des joueurs de padel compatibles par nom et trouvez des parties plus vite.",
    alternates: { canonical: `/${locale}/find-players` },
  };
}

export default async function SearchPlayersPage({ params, searchParams }: SearchPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { q } = await searchParams;

  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  redirect(`/${locale}/find-players${query}`);
}
