"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import type { SignUpErrorCode } from "@/modules/auth/sign-up-types";

type SignUpFormLabels = {
  phoneLabel: string;
  phoneSignupHint: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  displayNameSignupHint: string;
  genderLabel: string;
  genderPlaceholder: string;
  genderMale: string;
  genderFemale: string;
  genderSignupHint: string;
  emailLabel: string;
  passwordLabel: string;
  signUpCta: string;
  signUpSubmitting: string;
  networkError: string;
};

type SignUpFormProps = {
  locale: string;
  safeNext: string;
  referrerId?: string | null;
  labels: SignUpFormLabels;
};

export function SignUpForm({ locale, safeNext, referrerId, labels }: SignUpFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setClientError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      locale,
      next: safeNext,
      ref: referrerId ?? undefined,
      phone: String(formData.get("phone") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      let result: { ok?: boolean; redirectTo?: string; error?: SignUpErrorCode } | null = null;
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      }

      if (result?.ok && result.redirectTo) {
        window.location.href = result.redirectTo;
        return;
      }

      const errorCode = result?.error ?? "signup_failed";
      router.push(`/${locale}/auth/sign-up?error=${errorCode}&next=${encodeURIComponent(safeNext)}${referrerId ? `&ref=${encodeURIComponent(referrerId)}` : ""}`);
    } catch (err) {
      console.error("[SignUpForm]", err);
      setClientError(labels.networkError);
      setPending(false);
    }
  };

  return (
    <>
      {clientError ? (
        <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{clientError}</p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="phone" className="text-xs font-medium text-slate-700">
            {labels.phoneLabel}
          </label>
          <TextInput
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            placeholder="22 123 456"
            required
            minLength={8}
          />
          <p className="text-[11px] text-slate-500">{labels.phoneSignupHint}</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="displayName" className="text-xs font-medium text-slate-700">
            {labels.displayNameLabel}
          </label>
          <TextInput
            id="displayName"
            name="displayName"
            type="text"
            placeholder={labels.displayNamePlaceholder}
            minLength={2}
            maxLength={60}
          />
          <p className="text-[11px] text-slate-500">{labels.displayNameSignupHint}</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="gender" className="text-xs font-medium text-slate-700">
            {labels.genderLabel}
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          >
            <option value="" disabled>
              {labels.genderPlaceholder}
            </option>
            <option value="male">{labels.genderMale}</option>
            <option value="female">{labels.genderFemale}</option>
          </select>
          <p className="text-[11px] text-slate-500">{labels.genderSignupHint}</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium text-slate-700">
            {labels.emailLabel}
          </label>
          <TextInput
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-medium text-slate-700">
            {labels.passwordLabel}
          </label>
          <TextInput
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full min-h-[48px] touch-manipulation" disabled={pending}>
          {pending ? labels.signUpSubmitting : labels.signUpCta}
        </Button>
      </form>
    </>
  );
}
