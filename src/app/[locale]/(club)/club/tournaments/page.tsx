import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { listTournamentsForClub } from "@/modules/tournaments/repository";
import { TournamentCreateForm } from "@/app/[locale]/(club)/club/tournaments/tournament-create-form";
import Link from "next/link";

type Props = { params: Promise<{ locale: string }> };

export default async function ClubTournamentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.club;

  const user = await requireUser({ locale, redirectPath: "club/tournaments" });
  const managed = await clubService.getManagedClub(user.id);
  if (!managed) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-6 text-white">
        <p>{labels.noClubAccessSubtitle}</p>
      </div>
    );
  }

  const tournaments = await listTournamentsForClub(managed.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">{labels.tournamentsPageTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">{labels.tournamentsPageSubtitle}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <TournamentCreateForm locale={locale} />
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">{labels.tournamentsListTitle}</h2>
          {tournaments.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">{labels.tournamentsEmpty}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {tournaments.map((t) => (
                <li key={t.id} className="py-3">
                  <Link
                    href={`/${locale}/club/tournaments/${t.id}`}
                    className="font-semibold text-[var(--gold)] hover:underline"
                  >
                    {t.title}
                  </Link>
                  <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wide">
                    {t.status}
                    {t.startsAt ? ` · ${new Date(t.startsAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
