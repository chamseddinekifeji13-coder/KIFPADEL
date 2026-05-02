import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { requireUser } from "@/modules/auth/guards/require-user";
import { completeSuperAdminOnboardingAction } from "@/modules/onboarding/super-admin-action";

type SuperAdminOnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({
  params,
}: SuperAdminOnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Super admin onboarding" : "Onboarding super admin",
    description: isEn
      ? "Securely configure your platform super admin account."
      : "Configurez en sécurité votre compte super admin plateforme.",
  };
}

export default async function SuperAdminOnboardingPage({
  params,
  searchParams,
}: SuperAdminOnboardingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser({ locale, redirectPath: "onboarding/super-admin" });

  const { error } = await searchParams;
  const isEn = locale === "en";

  const errorMessage =
    error === "feature_not_configured"
      ? isEn
        ? "Server key SUPER_ADMIN_ONBOARDING_KEY is missing."
        : "La clé serveur SUPER_ADMIN_ONBOARDING_KEY est manquante."
      : error === "invalid_secret"
        ? isEn
          ? "Invalid onboarding secret."
          : "Clé d'onboarding invalide."
        : error === "setup_failed"
          ? isEn
            ? "Unable to complete super admin setup."
            : "Impossible de finaliser la configuration super admin."
          : null;

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold)]">
          {isEn ? "Platform setup" : "Configuration plateforme"}
        </p>
        <h1 className="text-2xl font-black text-white">
          {isEn ? "Super Admin Onboarding" : "Onboarding Super Admin"}
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {isEn
            ? "Use your secret key to activate platform-level administration."
            : "Utilisez votre clé secrète pour activer l'administration plateforme."}
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={completeSuperAdminOnboardingAction}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-1">
          <label htmlFor="displayName" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "Display name (optional)" : "Nom d'affichage (optionnel)"}
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder={isEn ? "Platform Owner" : "Owner Plateforme"}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="secret" className="text-xs font-medium text-[var(--foreground-muted)]">
            {isEn ? "Onboarding secret" : "Clé secrète d'onboarding"}
          </label>
          <input
            id="secret"
            name="secret"
            type="password"
            placeholder="********"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
          />
        </div>

        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-[var(--gold)] text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          {isEn ? "Activate super admin" : "Activer super admin"}
        </button>
      </form>
    </section>
  );
}
