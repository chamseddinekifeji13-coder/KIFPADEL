import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
          🔍
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Page introuvable
        </h2>
        <p className="text-sm text-slate-600">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/fr"
          className="inline-flex items-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 active:bg-sky-800"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
