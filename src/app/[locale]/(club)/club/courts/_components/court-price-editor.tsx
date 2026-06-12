"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { updateCourtPriceAction } from "@/modules/clubs/actions/update-court-price";

type CourtPriceEditorProps = {
  locale: Locale;
  clubId: string;
  courtId: string;
  courtLabel: string;
  initialPrice: number;
  fieldLabel: string;
  fieldHint: string;
  saveCta: string;
  savingCta: string;
  savedCta: string;
};

export function CourtPriceEditor({
  locale,
  clubId,
  courtId,
  courtLabel,
  initialPrice,
  fieldLabel,
  fieldHint,
  saveCta,
  savingCta,
  savedCta,
}: CourtPriceEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialPrice));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(String(initialPrice));
  }, [initialPrice]);

  const trimmed = value.trim();
  const unchanged = trimmed === String(initialPrice);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending || unchanged || trimmed.length === 0) {
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("club_id", clubId);
    formData.set("court_id", courtId);
    formData.set("price_per_player", trimmed);

    const result = await updateCourtPriceAction(formData);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-3 sm:flex-row sm:items-end sm:gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">{courtLabel}</p>
        <label className="mt-1 block text-[11px] text-[var(--foreground-muted)]" htmlFor={`court-price-${courtId}`}>
          {fieldLabel}
        </label>
        <input
          id={`court-price-${courtId}`}
          name="price_per_player"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-white outline-none ring-[var(--gold)] focus:ring-1"
          aria-invalid={error ? true : undefined}
        />
        <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{fieldHint}</p>
        {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
        {saved ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {savedCta}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending || unchanged || trimmed.length === 0}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 text-xs font-bold text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            {savingCta}
          </>
        ) : (
          saveCta
        )}
      </button>
    </form>
  );
}
