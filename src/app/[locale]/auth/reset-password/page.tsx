import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Reset password" : "Réinitialiser le mot de passe",
    description: isEn
      ? "Choose a new password for your Kifpadel account."
      : "Choisissez un nouveau mot de passe pour votre compte Kifpadel.",
    alternates: { canonical: `/${locale}/auth/reset-password` },
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="space-y-3">
      <Card className="bg-[var(--surface)]">
        <ResetPasswordForm locale={locale} labels={dictionary.auth} />
      </Card>
    </section>
  );
}
