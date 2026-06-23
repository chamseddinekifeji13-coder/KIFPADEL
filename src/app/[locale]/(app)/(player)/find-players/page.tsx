import type { Metadata } from "next";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards/require-user";
import { playerService } from "@/modules/players/service";
import { Player } from "@/modules/players/repository";
import { FindPlayersBookingInviteSection } from "@/components/features/bookings/find-players-booking-invite-section";
import { FindPlayersBookingInviteBanner } from "@/components/features/bookings/find-players-booking-invite-banner";
import { fetchBookingSplitInvites } from "@/modules/bookings/split-payment-repository";
import { PlayerCard } from "@/components/features/players/player-card";
import { playerCategoryBadgeVariant } from "@/domain/rules/player-category";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";

import { Search, Filter, Users, ArrowLeft } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { rethrowFrameworkError } from "@/lib/utils/safe-rsc";
import { cn } from "@/lib/utils/cn";
import { bookingInvitesPath } from "@/lib/booking-paths";
import Link from "next/link";

type FindPlayersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: FindPlayersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const title = dictionary.player.findPlayersMetaTitle;
  const description = dictionary.player.findPlayersMetaDescription;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/find-players` },
    openGraph: { title, description, url: `/${locale}/find-players` },
  };
}

export default async function FindPlayersPage({
  params,
  searchParams,
}: FindPlayersPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const bookingId = typeof sp.bookingId === "string" ? sp.bookingId.trim() : "";
  const matchId = typeof sp.matchId === "string" ? sp.matchId.trim() : "";
  const clubName = typeof sp.clubName === "string" ? sp.clubName.trim() : "";
  const sharePriceRaw = typeof sp.sharePrice === "string" ? Number(sp.sharePrice) : 0;
  const sharePrice = Number.isFinite(sharePriceRaw) && sharePriceRaw > 0 ? sharePriceRaw : 0;
  const inviteId = typeof sp.inviteId === "string" ? sp.inviteId.trim() : "";
  let bookingInvite =
    bookingId && clubName && sharePrice > 0
      ? { bookingId, clubName, sharePrice, inviteId: inviteId || undefined, pendingInviteIds: [] as string[] }
      : undefined;

  let totalPendingInvites = 0;
  let pendingInviteIds: string[] = [];
  if (bookingInvite) {
    const invites = await fetchBookingSplitInvites(bookingId);
    const pending = invites.filter((inv) => inv.status === "pending");
    pendingInviteIds = pending.map((inv) => inv.inviteId);
    totalPendingInvites = pending.length;
    if (totalPendingInvites === 0) totalPendingInvites = 1;
    bookingInvite = {
      ...bookingInvite,
      pendingInviteIds,
    };
  }
  const dictionary = await getDictionary(locale as Locale);
  const labels = dictionary.player;
  const user = await requireUser({ locale, redirectPath: "find-players" });
  const inInviteFlow = Boolean(bookingInvite);
  const inMatchFlow = Boolean(matchId && clubName);
  const title = inInviteFlow
    ? labels.bookingInviteFindPlayersTitle
    : inMatchFlow
      ? locale === "en"
        ? "Invite to match"
        : "Inviter au match"
      : labels.findPlayersTitle;
  const subtitle = inInviteFlow
    ? labels.bookingInviteFindPlayersSubtitle
    : inMatchFlow
      ? locale === "en"
        ? `Share the match link for ${clubName} with a player below.`
        : `Partagez le lien du match chez ${clubName} avec un joueur ci-dessous.`
      : labels.findPlayersSubtitle;

  // Fetch real data from Supabase with heavy protection
  let players: Player[] = [];
  try {
    const data = await playerService.getPlayers(q, { excludeUserId: user.id });
    if (Array.isArray(data)) {
      players = data.filter((p) => p && typeof p === "object" && p.id);
    }
  } catch (err) {
    rethrowFrameworkError(err);
    console.error("Failed to fetch players in FindPlayersPage:", err);
  }

  return (
    <div
      className={cn(
        "flex-1 space-y-6",
        (inInviteFlow || inMatchFlow) && "mx-auto max-w-lg",
      )}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">{subtitle}</p>
      </header>

      {inInviteFlow && bookingInvite ? (
        <Link
          href={bookingInvitesPath(locale, bookingInvite.bookingId)}
          className="inline-flex items-center gap-1 text-sm text-[var(--gold)] font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.bookingInviteBackLink}
        </Link>
      ) : null}

      {inMatchFlow && matchId ? (
        <Link
          href={`/${locale}/matches/${matchId}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--gold)] font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "en" ? "Back to match" : "Retour au match"}
        </Link>
      ) : null}

      <div className="relative">
        <form action="" role="search">
          {bookingInvite ? (
            <>
              <input type="hidden" name="bookingId" value={bookingInvite.bookingId} />
              <input type="hidden" name="clubName" value={bookingInvite.clubName} />
              <input type="hidden" name="sharePrice" value={String(bookingInvite.sharePrice)} />
              {bookingInvite.inviteId ? (
                <input type="hidden" name="inviteId" value={bookingInvite.inviteId} />
              ) : null}
            </>
          ) : null}
          {inMatchFlow && matchId && clubName ? (
            <>
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="clubName" value={clubName} />
            </>
          ) : null}
          <label htmlFor="find-players-search" className="sr-only">
            {labels.findPlayersSearchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
          />
          <input
            id="find-players-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={labels.findPlayersSearchPlaceholder}
            aria-label={labels.findPlayersSearchLabel}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 text-sm text-white shadow-sm transition-all placeholder:text-[var(--foreground-muted)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
          />
        </form>
      </div>

      {bookingInvite ? (
        <FindPlayersBookingInviteBanner
          locale={locale}
          bookingId={bookingInvite.bookingId}
          clubName={bookingInvite.clubName}
          sharePrice={bookingInvite.sharePrice}
          inviteId={bookingInvite.inviteId}
          totalPendingInvites={totalPendingInvites}
          pendingInviteIds={bookingInvite.pendingInviteIds}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <SectionTitle
          title={labels.nearbyPlayersTitle}
          icon={<Users className="h-4 w-4" />}
        />
        <button
          type="button"
          aria-label={labels.filtersLabel}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-bold text-[var(--foreground-muted)]"
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          {labels.filtersLabel}
        </button>
      </div>

      {!q && players.length > 3 && !inInviteFlow && !inMatchFlow ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
            ⭐ {labels.topRatedLabel}
          </div>
          <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-0">
            {players.slice(0, 5).map((player) => (
              <div
                key={player.id}
                className="flex min-w-[132px] flex-col items-center gap-3 rounded-2xl border border-white/5 bg-surface-elevated p-4 shadow-sm transition-colors hover:border-gold/20 md:min-w-0"
              >
                <Avatar
                  src={player.avatar_url}
                  alt={player.display_name || labels.genericPlayerName}
                  size="lg"
                  className="ring-4 ring-gold/10"
                />
                <div className="space-y-1 text-center">
                  <p className="w-24 truncate text-xs font-bold text-white">
                    {(player.display_name || labels.genericPlayerName).split(" ")[0]}
                  </p>
                  <Badge
                    variant={
                      playerCategoryBadgeVariant(player.leagueCategory ?? player.league) as BadgeProps["variant"]
                    }
                    className="px-2 text-[8px]"
                  >
                    {player.league || labels.defaultLeagueLabel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {players.length === 0 ? (
        <div className="py-12 text-center italic text-[var(--foreground-muted)]">
          {q ? `${labels.noPlayersForQueryPrefix} "${q}".` : labels.noPlayersAvailable}
        </div>
      ) : bookingInvite ? (
        <FindPlayersBookingInviteSection
          locale={locale}
          players={players}
          bookingInvite={bookingInvite}
          totalPendingInvites={totalPendingInvites}
          showBanner={false}
        />
      ) : inMatchFlow && matchId && clubName ? (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              locale={locale}
              player={player}
              matchInvite={{ matchId, clubName }}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard key={player.id} locale={locale} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
