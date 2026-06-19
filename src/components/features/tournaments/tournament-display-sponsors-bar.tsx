import type { SponsorRow } from "@/modules/sponsors/repository";

type Props = {
  sponsors: SponsorRow[];
  title: string;
  variant?: "tv" | "inline";
};

function SponsorLogo({ sponsor, large }: { sponsor: SponsorRow; large?: boolean }) {
  const boxClass = large
    ? "flex h-20 w-44 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
    : "flex h-16 w-[120px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2";

  const imgClass = large ? "max-h-14 max-w-full object-contain" : "max-h-12 max-w-full object-contain";

  const inner = sponsor.logo_url ? (
    <img
      src={sponsor.logo_url}
      alt={sponsor.name}
      className={imgClass}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span
      className={`font-bold uppercase tracking-wide text-white/70 text-center line-clamp-2 ${
        large ? "text-xs" : "text-[10px]"
      }`}
    >
      {sponsor.name}
    </span>
  );

  if (sponsor.website_url?.trim()) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
        aria-label={sponsor.name}
      >
        <div className={boxClass}>{inner}</div>
      </a>
    );
  }

  return (
    <div className="shrink-0">
      <div className={boxClass}>{inner}</div>
    </div>
  );
}

export function TournamentDisplaySponsorsBar({ sponsors, title, variant = "tv" }: Props) {
  if (sponsors.length === 0) {
    return null;
  }

  if (variant === "inline") {
    return (
      <section className="space-y-3" aria-label={title}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</p>
        <div className="flex flex-wrap justify-center gap-4">
          {sponsors.map((sponsor) => (
            <SponsorLogo key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-sm"
      aria-label={title}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-4 md:flex-row md:justify-between">
        <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] text-[var(--gold)]">
          {title}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end">
          {sponsors.map((sponsor) => (
            <SponsorLogo key={sponsor.id} sponsor={sponsor} large />
          ))}
        </div>
      </div>
    </footer>
  );
}
