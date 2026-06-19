"use client";

import { useState, useTransition } from "react";
import { resendActivationEmailAction } from "@/modules/auth/actions/resend-activation-email";

type Props = {
  locale: string;
  label: string;
  successLabel: string;
  errorLabel: string;
};

export function ResendActivationEmailButton({ locale, label, successLabel, errorLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onResend = () => {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value?.trim() ?? "";
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await resendActivationEmailAction({ locale, email });
      if (result.ok) {
        setMessage(successLabel);
      } else {
        setError(result.error || errorLabel);
      }
    });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <button
        type="button"
        onClick={onResend}
        disabled={pending}
        className="text-xs font-bold text-sky-600 hover:text-sky-700 disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
