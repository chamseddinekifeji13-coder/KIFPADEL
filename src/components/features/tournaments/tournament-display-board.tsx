"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSetScores } from "@/domain/rules/match-score";
import { formatTournamentFormatLabel } from "@/domain/rules/tournament-americano";
import { formatRoundLabel } from "@/domain/rules/tournament-display";
import type {
  DisplayCategorySection,
  DisplayMatch,
  DisplayPoolBlock,
  DisplayStandingRow,
} from "@/domain/rules/tournament-display";
import type { TournamentFormat, TournamentScope, TournamentStatus } from "@/domain/types/tournaments";

const REFRESH_MS = 30_000;

type Props = {
  locale: string;
  title: string;
  clubName: string;
  clubCity: string;
  format: TournamentFormat;
  tournamentScope: TournamentScope;
  status: TournamentStatus;
  sections: DisplayCategorySection[];
  multiCategory: boolean;
  clubStandings: DisplayStandingRow[];
  serverTimeIso: string;
};

function statusLabel(status: TournamentStatus, locale: string): string {
  const fr: Record<TournamentStatus, string> = {
    draft: "Brouillon",
    registration_open: "Inscriptions ouvertes",
    in_progress: "En cours",
    completed: "Terminé",
    cancelled: "Annulé",
  };
  const en: Record<TournamentStatus, string> = {
    draft: "Draft",
    registration_open: "Registration open",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return locale === "en" ? en[status] : fr[status];
}

function formatClock(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-GB" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MatchCard({
  match,
  locale,
  large,
}: {
  match: DisplayMatch;
  locale: string;
  large?: boolean;
}) {
  const pending = !match.winnerTeam;
  const scoreText = match.setScores?.length ? formatSetScores(match.setScores) : null;

  return (
    <article
      className={`rounded-2xl border p-4 ${
        pending
          ? "border-[var(--gold)]/50 bg-[var(--gold)]/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-widest text-[var(--gold)]">
        {formatRoundLabel(match.round, locale)}
        {match.position > 0 ? ` · M${match.position + 1}` : ""}
        {pending ? (
          <span className="ml-2 text-emerald-400">
            {locale === "en" ? "Live" : "En cours"}
          </span>
        ) : null}
      </p>
      <div className={`mt-3 space-y-2 ${large ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}>
        <p
          className={`font-bold leading-tight ${
            match.winnerTeam === "A" ? "text-[var(--gold)]" : "text-white/90"
          }`}
        >
          {match.team1Label}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">vs</p>
        <p
          className={`font-bold leading-tight ${
            match.winnerTeam === "B" ? "text-[var(--gold)]" : "text-white/90"
          }`}
        >
          {match.team2Label}
        </p>
      </div>
      {scoreText ? (
        <p className={`mt-3 font-mono font-bold text-emerald-400 ${large ? "text-2xl" : "text-lg"}`}>
          {scoreText}
        </p>
      ) : pending ? (
        <p className="mt-3 text-sm text-white/40">
          {locale === "en" ? "Awaiting result" : "En attente du résultat"}
        </p>
      ) : null}
    </article>
  );
}

function StandingsTable({ title, rows }: { title: string; rows: DisplayStandingRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <h2 className="text-xs font-black uppercase tracking-widest text-[var(--gold)]">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-7 shrink-0 text-lg font-black text-[var(--gold)]">{row.rank}</span>
              <span className="truncate text-base font-bold text-white md:text-lg">{row.label}</span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-white md:text-lg">{row.primary}</p>
              {row.secondary ? (
                <p className="text-[10px] uppercase tracking-wide text-white/40">{row.secondary}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryContent({
  section,
  locale,
  format,
}: {
  section: DisplayCategorySection;
  locale: string;
  format: TournamentFormat;
}) {
  const pendingMatches = section.matches.filter((m) => !m.winnerTeam);
  const completedMatches = section.matches.filter((m) => m.winnerTeam);

  return (
    <>
      {pendingMatches.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-emerald-400">
            {locale === "en" ? "Live matches" : "Matchs en cours"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingMatches.map((match) => (
              <MatchCard key={match.id} match={match} locale={locale} large />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid flex-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          {format === "americano" && section.americanoStandings.length > 0 ? (
            <StandingsTable
              title={locale === "en" ? "Player ranking" : "Classement joueurs"}
              rows={section.americanoStandings}
            />
          ) : null}

          {section.poolBlocks.map((block: DisplayPoolBlock) => (
            <StandingsTable
              key={block.poolLabel}
              title={
                locale === "en"
                  ? `Pool ${block.poolLabel} standings`
                  : `Classement poule ${block.poolLabel}`
              }
              rows={block.rows}
            />
          ))}
        </div>

        <div className="xl:col-span-7">
          <section>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white/50">
              {locale === "en" ? "Results" : "Résultats"}
            </h2>
            {section.matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/40">
                {locale === "en"
                  ? "Nothing scheduled in this category yet."
                  : "Rien de programmé dans cette catégorie pour l’instant."}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {[...pendingMatches, ...completedMatches].map((match) => (
                  <MatchCard key={match.id} match={match} locale={locale} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export function TournamentDisplayBoard(props: Props) {
  const router = useRouter();
  const [lastRefreshIso, setLastRefreshIso] = useState(props.serverTimeIso);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setLastRefreshIso(props.serverTimeIso);
  }, [props.serverTimeIso]);

  useEffect(() => {
    if (activeIndex >= props.sections.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, props.sections.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
      setLastRefreshIso(new Date().toISOString());
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (!props.multiCategory || props.sections.length <= 1) {
      return;
    }
    const rotate = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % props.sections.length);
    }, 45_000);
    return () => window.clearInterval(rotate);
  }, [props.multiCategory, props.sections.length]);

  const isEn = props.locale === "en";
  const scopeSuffix =
    props.tournamentScope === "interclub"
      ? isEn
        ? " · Inter-clubs"
        : " · Inter-clubs"
      : "";

  const activeSection = props.sections[activeIndex] ?? props.sections[0];

  const allMatches = useMemo(
    () => props.sections.flatMap((section) => section.matches),
    [props.sections],
  );
  const globalPending = useMemo(() => allMatches.filter((m) => !m.winnerTeam), [allMatches]);

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 border-b border-white/10 pb-5 md:mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold)]">
              Kif Padel · {formatTournamentFormatLabel(props.format, props.locale)}
              {scopeSuffix}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-white md:text-5xl">
              {props.title}
            </h1>
            <p className="mt-2 text-sm text-white/50 md:text-base">
              {props.clubName}
              {props.clubCity ? ` · ${props.clubCity}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-400">
              {statusLabel(props.status, props.locale)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
              {isEn ? "Updated" : "Mis à jour"} · {formatClock(lastRefreshIso, props.locale)}
            </p>
            <p className="text-[10px] text-white/20">
              {isEn ? "Auto-refresh 30s" : "Rafraîchissement auto 30 s"}
            </p>
          </div>
        </div>
      </header>

      {props.clubStandings.length > 0 ? (
        <div className="mb-6">
          <StandingsTable
            title={isEn ? "Club ranking" : "Classement par club"}
            rows={props.clubStandings}
          />
        </div>
      ) : null}

      {props.multiCategory ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {props.sections.map((section, index) => (
            <button
              key={section.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                index === activeIndex
                  ? "bg-[var(--gold)] text-black"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      ) : null}

      {!props.multiCategory && globalPending.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-emerald-400">
            {isEn ? "Live matches" : "Matchs en cours"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {globalPending.map((match) => (
              <MatchCard key={match.id} match={match} locale={props.locale} large />
            ))}
          </div>
        </section>
      ) : null}

      {activeSection ? (
        <CategoryContent section={activeSection} locale={props.locale} format={props.format} />
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/40">
          {isEn ? "Schedule not generated yet." : "Le planning n’a pas encore été généré."}
        </p>
      )}
    </div>
  );
}
