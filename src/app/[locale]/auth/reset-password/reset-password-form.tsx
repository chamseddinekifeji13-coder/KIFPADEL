"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ResetPasswordFormProps = {
  locale: string;
  labels: Record<string, string>;
};

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

function parseRecoveryHash(): { tokens: RecoveryTokens | null; hashError: string | null } {
  if (typeof window === "undefined") {
    return { tokens: null, hashError: null };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash) {
    return { tokens: null, hashError: null };
  }

  const params = new URLSearchParams(hash);

  const errorDescription = params.get("error_description") ?? params.get("error");
  if (errorDescription) {
    return { tokens: null, hashError: errorDescription };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (!accessToken || !refreshToken || type !== "recovery") {
    return { tokens: null, hashError: null };
  }

  return { tokens: { accessToken, refreshToken }, hashError: null };
}

export function ResetPasswordForm({ locale, labels }: ResetPasswordFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [hydrated, setHydrated] = useState(false);
  const [parsedHash, setParsedHash] = useState<{ tokens: RecoveryTokens | null; hashError: string | null }>(
    { tokens: null, hashError: null },
  );
  const tokens = parsedHash.tokens;
  const hashError = parsedHash.hashError;

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setParsedHash(parseRecoveryHash());
    setHydrated(true);
  }, []);

  async function handleRequestEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);

    if (!email) {
      setRequestError(labels.missingFieldsError);
      return;
    }

    setRequestLoading(true);

    const redirectTo = `${window.location.origin}/${locale}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setRequestLoading(false);

    if (error) {
      setRequestError(labels.resetPasswordSendFailedError);
      return;
    }

    setEmailSent(true);
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdateError(null);

    if (password.length < 8) {
      setUpdateError(labels.passwordTooShortError);
      return;
    }

    if (password !== confirmPassword) {
      setUpdateError(labels.passwordMismatchError);
      return;
    }

    if (!tokens) {
      setUpdateError(labels.resetPasswordInvalidLinkError);
      return;
    }

    setUpdateLoading(true);

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    if (sessionError) {
      setUpdateLoading(false);
      setUpdateError(labels.recoverySessionFailedError);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setUpdateLoading(false);
      setUpdateError(updateErr.message);
      return;
    }

    window.history.replaceState({}, "", `/${locale}/auth/reset-password`);
    setDone(true);
    setUpdateLoading(false);

    setTimeout(() => {
      router.push(`/${locale}/auth/sign-in?status=password_updated`);
    }, 800);
  }

  if (!hydrated) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-bold text-white">{labels.resetPasswordRequestTitle}</h1>
        <p className="text-xs text-slate-400">{labels.resetPasswordRequestSubtitle}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        {labels.passwordUpdatedRedirecting}
      </div>
    );
  }

  // Recovery tokens present → show new password form
  if (tokens) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-white">{labels.resetPasswordChooseTitle}</h1>
          <p className="text-xs text-slate-400">{labels.resetPasswordChooseSubtitle}</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs font-medium text-slate-300">
              {labels.newPasswordLabel}
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-xs font-medium text-slate-300">
              {labels.confirmPasswordLabel}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
              autoComplete="new-password"
            />
          </div>

          {updateError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {updateError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={updateLoading}
            className="h-11 w-full rounded-xl bg-[var(--gold)] text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)] disabled:opacity-60"
          >
            {updateLoading ? labels.updatingPasswordCta : labels.updatePasswordCta}
          </button>
        </form>
      </div>
    );
  }

  // No recovery tokens → show email request form (with optional invalid-link error)
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-white">{labels.resetPasswordRequestTitle}</h1>
        <p className="text-xs text-slate-400">{labels.resetPasswordRequestSubtitle}</p>
      </div>

      {hashError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {labels.resetPasswordInvalidLinkError}
        </div>
      ) : null}

      {emailSent ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {labels.resetPasswordEmailSentInfo}
        </div>
      ) : (
        <form onSubmit={handleRequestEmail} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="reset-email" className="text-xs font-medium text-slate-300">
              {labels.emailLabel}
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white"
              autoComplete="email"
              required
            />
          </div>

          {requestError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {requestError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={requestLoading}
            className="h-11 w-full rounded-xl bg-[var(--gold)] text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)] disabled:opacity-60"
          >
            {requestLoading
              ? labels.resetPasswordSendingCta
              : hashError
                ? labels.resetPasswordRequestNewLinkCta
                : labels.resetPasswordSendCta}
          </button>
        </form>
      )}
    </div>
  );
}
