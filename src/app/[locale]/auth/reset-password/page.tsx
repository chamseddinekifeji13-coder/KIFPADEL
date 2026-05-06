import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { isLocale } from "@/i18n/config";
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

  return (
    <section className="space-y-3">
      <Card>
        <SectionTitle
          as="h1"
          title={locale === "en" ? "Reset your password" : "Réinitialise ton mot de passe"}
          subtitle={locale === "en"
            ? "Use the recovery link from your email, then choose a new password."
            : "Utilise le lien reçu par email puis définis un nouveau mot de passe."}
        />
      </Card>

      <Card className="bg-[var(--surface)]">
        <ResetPasswordForm locale={locale} />
      </Card>
    </section>
  );
}
