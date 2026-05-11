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

        <div className="space-y-1">
          <label htmlFor="address" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "Full street address" : "Adresse exacte du club"}
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            placeholder={
              isEn
                ? "Street, number, area — for directions to the court"
                : "Rue, numéro, quartier — pour l’itinéraire jusqu’au terrain"
            }
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-white placeholder:text-[var(--foreground-muted)]"
          />
          <p className="text-[11px] text-[var(--foreground-muted)]">
            {isEn
              ? "Optional but recommended so players find the venue."
              : "Optionnel mais recommandé pour que les joueurs arrivent au bon endroit."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="indoor_courts_count"
              className="text-xs font-medium text-[var(--foreground-muted)]"
            >
              {isEn ? "Indoor courts (count)" : "Terrains couverts (nombre)"}
            </label>
            <input
              id="indoor_courts_count"
              name="indoor_courts_count"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="outdoor_courts_count"
              className="text-xs font-medium text-[var(--foreground-muted)]"
            >
              {isEn ? "Outdoor courts (count)" : "Terrains extérieurs (nombre)"}
            </label>
            <input
              id="outdoor_courts_count"
              name="outdoor_courts_count"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="contact_name" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "Manager name" : "Nom du responsable"}
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="contact_phone" className="text-xs font-medium text-[var(--foreground-muted)]">
              {isEn ? "Manager phone" : "Téléphone du responsable"}
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="contact_email" className="text-xs font-medium text-[var(--foreground-muted)]">
              {isEn ? "Manager email" : "E-mail du responsable"}
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
            />
          </div>
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
