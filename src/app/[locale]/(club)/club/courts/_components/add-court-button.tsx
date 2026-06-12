"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/i18n/config";
import { createCourtAction } from "@/modules/clubs/actions/create-court";

type AddCourtButtonProps = {
  locale: Locale;
  clubId: string;
  label: string;
};

export function AddCourtButton({ locale, clubId, label }: AddCourtButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("club_id", clubId);

    const result = await createCourtAction(formData);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        {label}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
