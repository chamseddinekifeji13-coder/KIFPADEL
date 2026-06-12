"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signInWithGoogleAction } from "@/modules/auth/actions/sign-in-with-google";

type GoogleSignInButtonProps = {
  locale: string;
  next?: string;
  label: string;
  className?: string;
  variant?: "primary" | "secondary";
};

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.17 3.32v2.77h3.51c2.04-1.88 3.22-4.65 3.22-7.96z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.51-2.77c-.98.66-2.23 1.06-3.77 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  locale,
  next,
  label,
  className = "",
  variant = "primary",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const base =
    variant === "primary"
      ? "h-14 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest hover:bg-slate-100 border border-slate-200 shadow-sm"
      : "h-12 rounded-xl bg-surface-elevated text-white font-bold border border-border hover:border-gold/40";

  const handleClick = async () => {
    if (pending) return;

    setPending(true);

    const formData = new FormData();
    formData.set("locale", locale);
    if (next) {
      formData.set("next", next);
    }

    const result = await signInWithGoogleAction(formData);

    if (!result.ok) {
      setPending(false);
      router.push(`/${locale}/auth/sign-in?error=${result.error}`);
      return;
    }

    window.location.href = result.url;
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`w-full flex items-center justify-center gap-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${base}`}
      >
        <GoogleIcon />
        {pending ? "…" : label}
      </button>
    </div>
  );
}
