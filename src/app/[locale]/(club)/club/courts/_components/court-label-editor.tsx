"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ActionResult } from "@/modules/clubs/actions";
import { updateCourtLabelAction } from "@/modules/clubs/actions/update-court-label";
import type { Locale } from "@/i18n/config";

type CourtLabelEditorProps = {
  locale: Locale;
  clubId: string;
  courtId: string;
  initialLabel: string;
  /** Libellé du champ pour accessibilité (identique au placeholder). */
  labelFieldAria: string;
  saveCta: string;
  savingCta: string;
};

export function CourtLabelEditor({
  locale,
  clubId,
  courtId,
  initialLabel,
  labelFieldAria,
  saveCta,
  savingCta,
}: CourtLabelEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialLabel);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => updateCourtLabelAction(formData),
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  const trimmed = value.trim();
  const unchanged = trimmed === initialLabel.trim();

  return (
    <form action={formAction} className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="club_id" value={clubId} />
      <input type="hidden" name="court_id" value={courtId} />
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor={`court-label-${courtId}`}>
          {labelFieldAria}
        </label>
        <input
          id={`court-label-${courtId}`}
          name="label"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-white outline-none ring-[var(--gold)] focus:ring-1"
          placeholder={labelFieldAria}
          maxLength={120}
          autoComplete="off"
          aria-invalid={state?.ok === false ? true : undefined}
          aria-describedby={state?.ok === false ? `court-label-err-${courtId}` : undefined}
        />
        {state?.ok === false && state.error ? (
          <p id={`court-label-err-${courtId}`} className="mt-1.5 text-xs text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending || unchanged || trimmed.length === 0}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)] px-4 text-xs font-bold text-black transition-colors hover:bg-[var(--gold-dark)] disabled:cursor-not-allowed disabled:opacity-40"
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
