"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import type { SignInErrorCode } from "@/modules/auth/sign-in-types";

type SignInFormLabels = {
  emailLabel: string;
  passwordLabel: string;
  signInCta: string;
  signInSubmitting: string;
  forgotPasswordCta: string;
  networkError: string;
};

type SignInFormProps = {
  locale: string;
  safeNext: string;
  forgotPasswordHref: string;
  labels: SignInFormLabels;
};

export function SignInForm({ locale, safeNext, forgotPasswordHref, labels }: SignInFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setClientError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      locale,
      next: safeNext,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      let result: { ok?: boolean; redirectTo?: string; error?: SignInErrorCode } | null = null;
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      }

      if (result?.ok && result.redirectTo) {
        window.location.href = result.redirectTo;
        return;
      }

      const errorCode = result?.error ?? "invalid_credentials";
      router.push(`/${locale}/auth/sign-in?error=${errorCode}&next=${encodeURIComponent(safeNext)}`);
    } catch (err) {
      console.error("[SignInForm]", err);
      setClientError(labels.networkError);
      setPending(false);
    }
  };

  return (
    <>
      {clientError ? (
        <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">{clientError}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label htmlFor="email" className="text-[10px] font-black text-gold uppercase tracking-widest px-1">
            {labels.emailLabel}
          </label>
          <TextInput id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div className="space-y-1 text-left">
          <label htmlFor="password" className="text-[10px] font-black text-gold uppercase tracking-widest px-1">
            {labels.passwordLabel}
          </label>
          <TextInput id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <Button
          type="submit"
          className="w-full min-h-[56px] h-14 rounded-2xl bg-gold text-black font-black uppercase tracking-widest touch-manipulation"
          disabled={pending}
        >
          {pending ? labels.signInSubmitting : labels.signInCta}
        </Button>
        <div className="pt-1">
          <Link
            href={forgotPasswordHref}
            className="text-xs font-bold text-foreground-muted hover:text-gold transition-colors"
          >
            {labels.forgotPasswordCta}
          </Link>
        </div>
      </form>
    </>
  );
}
