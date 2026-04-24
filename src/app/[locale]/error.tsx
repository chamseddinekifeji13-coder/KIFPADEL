"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">
          ⚠️
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-slate-600">
          Quelque chose s'est mal passé. Veuillez réessayer.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 active:bg-sky-800"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
