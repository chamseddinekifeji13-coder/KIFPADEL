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
    title: l.clubPrivacyMetaTitle,
    description: l.clubPrivacyMetaDescription,
    robots: { index: true, follow: true },
  };
}

export default async function ClubPrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = await getDictionary(locale as Locale);
  const l = dictionary.legal;

  return (
    <LegalDocumentLayout
      title={l.clubPrivacyTitle}
      subtitle={l.clubPrivacySubtitle}
      versionLabel={l.clubPrivacyVersion}
      disclaimer={l.legalDisclaimer}
      backLabel={l.legalBackToClubCreate}
      backHref={`/${locale}/clubs/new`}
      sections={[
        { title: l.clubPrivacyS1Title, body: l.clubPrivacyS1Body },
        { title: l.clubPrivacyS2Title, body: l.clubPrivacyS2Body },
        { title: l.clubPrivacyS3Title, body: l.clubPrivacyS3Body },
        { title: l.clubPrivacyS4Title, body: l.clubPrivacyS4Body },
        { title: l.clubPrivacyS5Title, body: l.clubPrivacyS5Body },
        { title: l.clubPrivacyS6Title, body: l.clubPrivacyS6Body },
        { title: l.clubPrivacyS7Title, body: l.clubPrivacyS7Body },
      ]}
    />
  );
}
