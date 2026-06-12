"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/i18n/config";
import { deleteCourtAction } from "@/modules/clubs/actions/delete-court";

type DeleteCourtButtonProps = {
  locale: Locale;
  clubId: string;
  courtId: string;
  deleteAria: string;
};

export function DeleteCourtButton({ locale, clubId, courtId, deleteAria }: DeleteCourtButtonProps) {
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
    formData.set("court_id", courtId);

    const result = await deleteCourtAction(formData);

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
        title={deleteAria}
        aria-label={deleteAria}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" />}
      </button>
      {error ? <p className="max-w-[10rem] text-right text-[10px] text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
