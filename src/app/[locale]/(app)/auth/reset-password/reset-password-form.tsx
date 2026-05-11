"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ResetPasswordFormProps = {
  locale: string;
};

function getRecoveryTokensFromHash() {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (!accessToken || !refreshToken || type !== "recovery") {
    return null;
  }

  return { accessToken, refreshToken };
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(locale === "en"
        ? "Password must contain at least 8 characters."
        : "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError(locale === "en"
        ? "Password confirmation does not match."
        : "La confirmation du mot de passe ne correspond pas.");
      return;
    }

    const tokens = getRecoveryTokensFromHash();
    if (!tokens) {
      setError(locale === "en"
        ? "Invalid or expired recovery link."
        : "Lien de récupération invalide ou expiré.");
      return;
    }

    setLoading(true);

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    if (sessionError) {
      setLoading(false);
      setError(locale === "en"
        ? "Unable to validate recovery session."
        : "Impossible de valider la session de récupération.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    window.history.replaceState({}, "", `/${locale}/auth/reset-password`);
    setDone(true);
    setLoading(false);

    setTimeout(() => {
      router.push(`/${locale}/auth/sign-in?status=password_updated`);
    }, 800);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        {locale === "en"
          ? "Password updated successfully. Redirecting to sign-in..."
          : "Mot de passe mis à jour avec succès. Redirection vers la connexion..."}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="new-password" className="text-xs font-medium text-slate-300">
          {locale === "en" ? "New password" : "Nouveau mot de passe"}
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
          {locale === "en" ? "Confirm password" : "Confirmer le mot de passe"}
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

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-[var(--gold)] text-sm font-bold text-black transition-colors hover:bg-[var(--gold-dark)] disabled:opacity-60"
      >
        {loading
          ? locale === "en" ? "Updating..." : "Mise à jour..."
          : locale === "en" ? "Update password" : "Mettre à jour le mot de passe"}
      </button>
    </form>
  );
}
