import Link from "next/link";

export default function RootNotFound() {
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
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/fr"
          className="inline-flex items-center rounded-xl bg-[var(--gold)] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[var(--gold-dark)] active:scale-95 shadow-lg shadow-[var(--gold)]/10"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
