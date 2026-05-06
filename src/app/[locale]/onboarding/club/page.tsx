import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { requireUser } from "@/modules/auth/guards/require-user";
import { createClubAction } from "@/modules/clubs/actions/create-club";

type ClubOnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: ClubOnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Club onboarding" : "Onboarding club",
    description: isEn
      ? "Create your club profile and start managing courts."
      : "Créez votre profil club et commencez à gérer vos terrains.",
  };
}

export default async function ClubOnboardingPage({
  params,
  searchParams,
}: ClubOnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser({ locale, redirectPath: "onboarding/club" });

  const { error } = await searchParams;
  const isEn = locale === "en";

  const errorMessage =
    error === "missing_fields"
      ? isEn
        ? "Please fill in club name and city."
        : "Merci de renseigner le nom du club et la ville."
      : error === "membership_failed"
        ? isEn
          ? "Club was created then rolled back due to manager assignment failure."
          : "Le club a été créé puis annulé car l'assignation manager a échoué."
        : error === "create_failed"
          ? isEn
            ? "Unable to create club for now."
            : "Impossible de créer le club pour le moment."
          : null;

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold)]">
          {isEn ? "Club setup" : "Configuration club"}
        </p>
        <h1 className="text-2xl font-black text-white">
          {isEn ? "Club onboarding" : "Onboarding club"}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {isEn
            ? "Create your club and unlock the club dashboard."
            : "Créez votre club et débloquez le dashboard club."}
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={createClubAction}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "Club name" : "Nom du club"}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder={isEn ? "Kifpadel La Marsa" : "Kifpadel La Marsa"}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="city" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "City" : "Ville"}
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Tunis"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
          />
        </div>

        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-[var(--gold)] text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {isEn ? "Create my club" : "Créer mon club"}
        </button>
      </form>
    </section>
  );
}
