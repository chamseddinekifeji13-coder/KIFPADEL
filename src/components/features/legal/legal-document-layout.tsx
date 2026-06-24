import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type LegalSection = {
  title: string;
  body: string;
};

type LegalDocumentLayoutProps = {
  title: string;
  subtitle: string;
  versionLabel: string;
  disclaimer: string;
  sections: LegalSection[];
  backLabel: string;
  backHref: string;
};

export function LegalDocumentLayout({
  title,
  subtitle,
  versionLabel,
  disclaimer,
  sections,
  backLabel,
  backHref,
}: LegalDocumentLayoutProps) {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 pb-24">
      <header className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)]">{versionLabel}</p>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">{subtitle}</p>
        </div>
      </header>

      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2"
          >
            <h2 className="text-sm font-bold text-white">{section.title}</h2>
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed whitespace-pre-line">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed border-t border-[var(--border)] pt-4">
        {disclaimer}
      </p>
    </article>
  );
}
