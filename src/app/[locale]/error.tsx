"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[kifpadel] route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-2xl">
          ⚠️
        </div>
        <h2 className="text-lg font-semibold text-white">Une erreur est survenue</h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Quelque chose s&apos;est mal passé. Veuillez réessayer.
        </p>
        {error.digest ? (
          <p className="text-[10px] text-[var(--foreground-muted)]/80 font-mono">
            Réf. {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)]"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
