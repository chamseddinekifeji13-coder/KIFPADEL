import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocumentLayout } from "@/components/features/legal/legal-document-layout";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = await getDictionary(locale);
  const l = dictionary.legal;
  return {
    title: l.clubCharterMetaTitle,
    description: l.clubCharterMetaDescription,
    robots: { index: true, follow: true },
  };
}

export default async function ClubCharterPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const l = dictionary.legal;

  return (
    <LegalDocumentLayout
      title={l.clubCharterTitle}
      subtitle={l.clubCharterSubtitle}
      versionLabel={l.clubCharterVersion}
      disclaimer={l.legalDisclaimer}
      backLabel={l.legalBackToClubCreate}
      backHref={`/${locale}/clubs/new`}
      sections={[
        { title: l.clubCharterS1Title, body: l.clubCharterS1Body },
        { title: l.clubCharterS2Title, body: l.clubCharterS2Body },
        { title: l.clubCharterS3Title, body: l.clubCharterS3Body },
        { title: l.clubCharterS4Title, body: l.clubCharterS4Body },
        { title: l.clubCharterS5Title, body: l.clubCharterS5Body },
        { title: l.clubCharterS6Title, body: l.clubCharterS6Body },
        { title: l.clubCharterS7Title, body: l.clubCharterS7Body },
        { title: l.clubCharterS8Title, body: l.clubCharterS8Body },
      ]}
    />
  );
}
