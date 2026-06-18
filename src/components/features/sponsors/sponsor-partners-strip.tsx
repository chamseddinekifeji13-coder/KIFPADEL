import type { SponsorRow } from "@/modules/sponsors/repository";

type Props = {
  sponsors: SponsorRow[];
  title: string;
  className?: string;
};

function SponsorLogoCard({ sponsor }: { sponsor: SponsorRow }) {
  const content = (
    <div
      className="flex h-16 w-[120px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:border-gold/35 hover:bg-white/10"
    >
      {sponsor.logo_url ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          className="max-h-12 max-w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/70 text-center line-clamp-2">
          {sponsor.name}
        </span>
      )}
    </div>
  );

  if (sponsor.website_url?.trim()) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 touch-manipulation"
        aria-label={sponsor.name}
      >
        {content}
      </a>
    );
  }

  return <div className="shrink-0">{content}</div>;
}

export function SponsorPartnersStrip({ sponsors, title, className = "" }: Props) {
  if (sponsors.length === 0) return null;

  return (
    <section className={`space-y-4 ${className}`} aria-label={title}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted text-center">
        {title}
      </p>
      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 px-1 min-w-min justify-center sm:justify-center">
          {sponsors.map((sponsor) => (
            <SponsorLogoCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </section>
  );
}
