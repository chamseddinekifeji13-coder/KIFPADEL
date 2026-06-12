import Link from "next/link";

import { DEFAULT_LOCALE } from "@/i18n/config";

export default function RootNotFound() {
  const base = `/${DEFAULT_LOCALE}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
          🔍
        </div>
        <h2 className="text-xl font-bold text-white">
          Page introuvable
        </h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          La page que vous cherchez n&apos;existe pas ou a été déplacée. Vérifiez que l&apos;adresse commence
          bien par <span className="text-white/90">{base}/</span> (langue + chemin).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={base}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--gold)] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[var(--gold-dark)] active:scale-95 shadow-lg shadow-[var(--gold)]/10"
          >
            Accueil
          </Link>
          <Link
            href={`${base}/book`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/5 active:scale-95"
          >
            Réserver un terrain
          </Link>
        </div>
      </div>
    </div>
  );
}
