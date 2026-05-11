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

          <div className="space-y-1">
            <label htmlFor="address" className="text-xs font-medium text-slate-700">
              {dictionary.club.createAddressLabel}
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              placeholder={dictionary.club.createAddressPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <p className="text-[11px] text-slate-500">{dictionary.club.createAddressHint}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="indoor_courts_count" className="text-xs font-medium text-slate-700">
                {dictionary.club.createIndoorCourtsLabel}
              </label>
              <input
                id="indoor_courts_count"
                name="indoor_courts_count"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="outdoor_courts_count" className="text-xs font-medium text-slate-700">
                {dictionary.club.createOutdoorCourtsLabel}
              </label>
              <input
                id="outdoor_courts_count"
                name="outdoor_courts_count"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">{dictionary.club.createCourtsHint}</p>

          <div className="space-y-1">
            <label htmlFor="contact_name" className="text-xs font-medium text-slate-700">
              {dictionary.club.createContactNameLabel}
            </label>
            <TextInput id="contact_name" name="contact_name" type="text" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="contact_phone" className="text-xs font-medium text-slate-700">
                {dictionary.club.createContactPhoneLabel}
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                autoComplete="tel"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact_email" className="text-xs font-medium text-slate-700">
                {dictionary.club.createContactEmailLabel}
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{dictionary.club.createContactHint}</p>

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
