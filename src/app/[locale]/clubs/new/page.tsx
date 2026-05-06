import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { TextInput } from "@/components/ui/text-input";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { createClubAction } from "@/modules/clubs/actions/create-club";
 
export const dynamic = "force-dynamic";

type NewClubPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}>;

export async function generateMetadata({ params }: NewClubPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Create club" : "Créer un club",
    description: isEn
      ? "Create a new club and become its manager."
      : "Créez un nouveau club et devenez son gestionnaire.",
    alternates: { canonical: `/${locale}/clubs/new` },
    robots: { index: false, follow: false },
  };
}

export default async function NewClubPage({ params, searchParams }: NewClubPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error } = await searchParams;

  await requireUser({ locale, redirectPath: "clubs/new" });
  const dictionary = await getDictionary(locale as Locale);

  const errorMessage =
    error === "missing_fields"
      ? dictionary.club.createMissingFields
      : error === "membership_failed"
        ? dictionary.club.createMembershipFailed
        : error === "create_failed"
          ? dictionary.club.createFailed
          : null;

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          as="h1"
          title={dictionary.club.createTitle}
          subtitle={dictionary.club.createSubtitle}
        />
      </Card>

      {errorMessage ? (
        <Card className="bg-rose-50 ring-rose-100">
          <p className="text-sm text-rose-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card>
        <form action={createClubAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium text-slate-700">
              {dictionary.club.createNameLabel}
            </label>
            <TextInput id="name" name="name" type="text" placeholder="Kif Padel La Marsa" />
          </div>

          <div className="space-y-1">
            <label htmlFor="city" className="text-xs font-medium text-slate-700">
              {dictionary.club.createCityLabel}
            </label>
            <TextInput id="city" name="city" type="text" placeholder="Tunis" />
          </div>

          <Button type="submit" className="w-full">
            {dictionary.club.createCta}
          </Button>
        </form>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-slate-600">{dictionary.club.createHint}</p>
        <Link href={`/${locale}/club/dashboard`} className="mt-2 inline-block text-sm font-semibold text-sky-700">
          {dictionary.club.createBackToDashboard}
        </Link>
      </Card>
    </section>
  );
}
