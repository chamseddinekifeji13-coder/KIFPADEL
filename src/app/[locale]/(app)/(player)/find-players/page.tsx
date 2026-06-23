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
        "flex-1 p-4 space-y-6 pb-24",
        inInviteFlow && "max-w-lg mx-auto",
        inMatchFlow && !inInviteFlow && "max-w-lg mx-auto",
      )}
    >
      <header className="space-y-1">
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight",
            inInviteFlow ? "text-white" : inMatchFlow ? "text-white" : "text-slate-900",
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-sm",
            inInviteFlow || inMatchFlow
              ? "text-[var(--foreground-muted)]"
              : "text-slate-500",
          )}
        >
          {subtitle}
        </p>
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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <input
            id="find-players-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={labels.findPlayersSearchPlaceholder}
            aria-label={labels.findPlayersSearchLabel}
            className={cn(
              "w-full rounded-xl py-3 pl-10 pr-4 text-sm transition-all shadow-sm min-h-11 focus:outline-none focus:ring-2",
              inInviteFlow || inMatchFlow
                ? "bg-[var(--surface)] border border-[var(--border)] text-white focus:ring-[var(--gold)]/20 focus:border-[var(--gold)]"
                : "bg-white border border-slate-200 focus:ring-sky-500/20 focus:border-sky-500",
            )}
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
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold px-3 rounded-lg min-h-11",
            inInviteFlow || inMatchFlow
              ? "text-[var(--foreground-muted)] bg-white/10"
              : "text-slate-500 bg-slate-100",
          )}
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          {labels.filtersLabel}
        </button>
      </div>

      {/* Recommended list */}
      {!q && players.length > 3 && !inInviteFlow && !inMatchFlow ? (
        <section className="space-y-4">
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest px-1">
             ⭐ {labels.topRatedLabel}
           </div>
           <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
             {players.slice(0, 5).map((player) => (
                <div key={player.id} className="min-w-[140px] flex flex-col items-center gap-3 p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                  <Avatar src={player.avatar_url} alt={player.display_name || labels.genericPlayerName} size="lg" className="ring-4 ring-sky-50" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-900 truncate w-24">{(player.display_name || labels.genericPlayerName).split(" ")[0]}</p>
                    <Badge
                      variant={
                        playerCategoryBadgeVariant(player.leagueCategory ?? player.league) as BadgeProps["variant"]
                      }
                      className="text-[8px] px-2"
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
        <div
          className={cn(
            "py-12 text-center italic",
            inInviteFlow || inMatchFlow ? "text-[var(--foreground-muted)]" : "text-slate-500",
          )}
        >
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
