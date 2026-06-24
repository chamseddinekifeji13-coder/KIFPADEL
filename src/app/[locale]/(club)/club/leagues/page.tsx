import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/modules/auth/guards/require-user";
import { clubService } from "@/modules/clubs/service";
import { listChampionshipsForClub } from "@/modules/championships/repository";
import { ChampionshipCreateForm } from "@/app/[locale]/(club)/club/leagues/championship-create-form";
import type { ChampionshipStatus } from "@/domain/types/championships";

type Props = { params: Promise<{ locale: string }> };

function statusLabel(status: ChampionshipStatus, labels: Record<string, string>): string {
  const map: Record<ChampionshipStatus, string> = {
    draft: labels.leaguesStatusDraft,
    registration_open: labels.leaguesStatusRegistrationOpen,
    active: labels.leaguesStatusActive,
    completed: labels.leaguesStatusCompleted,
    cancelled: labels.leaguesStatusCancelled,
  };
  return map[status] ?? status;
}

export default async function ClubLeaguesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.championships;
  const clubLabels = dictionary.club;

  const user = await requireUser({ locale, redirectPath: "club/leagues" });
  const managed = await clubService.getManagedClub(user.id);
  if (!managed) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-6 text-white">
        <p>{clubLabels.noClubAccessSubtitle}</p>
      </div>
    );
  }

  const leagues = await listChampionshipsForClub(managed.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">{labels.leaguesPageTitle}</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">{labels.leaguesPageSubtitle}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <ChampionshipCreateForm locale={locale} labels={labels} />
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">{labels.leaguesListTitle}</h2>
          {leagues.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">{labels.leaguesEmpty}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {leagues.map((league) => (
                <li key={league.id} className="py-3">
                  <Link
                    href={`/${locale}/club/leagues/${league.id}`}
                    className="font-semibold text-[var(--gold)] hover:underline"
                  >
                    {league.title}
                  </Link>
                  <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wide">
                    {league.seasonLabel} · {statusLabel(league.status, labels)}
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
