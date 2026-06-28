"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import {
  isBeforeInstallPromptEvent,
  isIosDevice,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/platform";

export type PwaInstallLabels = {
  installAppTitle: string;
  installAppSubtitle: string;
  installAppCta: string;
  installAppIosTitle: string;
  installAppIosStep1: string;
  installAppIosStep2: string;
  installAppIosStep3: string;
  installAppAndroidHint: string;
  installAppClose: string;
};

type Props = {
  labels: PwaInstallLabels;
  variant?: "card" | "compact";
  className?: string;
};

export function PwaInstallPanel({ labels, variant = "card", className }: Props) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [androidGuideOpen, setAndroidGuideOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    setReady(true);

    const onBeforeInstall = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready || installed) {
    return null;
  }

  const onInstallClick = async () => {
    if (isIosDevice()) {
      setIosGuideOpen(true);
      return;
    }

    if (deferredPrompt) {
      setPending(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } finally {
        setPending(false);
      }
      return;
    }

    setAndroidGuideOpen(true);
  };

  const button = (
    <button
      type="button"
      onClick={onInstallClick}
      disabled={pending}
      className={cn(
        "tap-target inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-bold text-black transition-opacity touch-manipulation disabled:opacity-60",
        variant === "compact" && "min-h-11 rounded-2xl text-xs font-black uppercase tracking-widest",
      )}
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      {pending ? "…" : labels.installAppCta}
    </button>
  );

  return (
    <>
      {variant === "card" ? (
        <section
          className={cn(
            "rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 p-4 space-y-3",
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
              <Smartphone className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-bold text-white">{labels.installAppTitle}</h3>
              <p className="text-xs text-[var(--foreground-muted)]">{labels.installAppSubtitle}</p>
            </div>
          </div>
          {button}
        </section>
      ) : (
        <div className={cn("w-full", className)}>{button}</div>
      )}

      <Dialog isOpen={iosGuideOpen} onClose={() => setIosGuideOpen(false)} title={labels.installAppIosTitle}>
        <ol className="space-y-4 text-sm text-slate-200">
          <li className="flex gap-3">
            <Share className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden />
            <span>{labels.installAppIosStep1}</span>
          </li>
          <li className="flex gap-3">
            <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden />
            <span>{labels.installAppIosStep2}</span>
          </li>
          <li className="flex gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden />
            <span>{labels.installAppIosStep3}</span>
          </li>
        </ol>
        <button
          type="button"
          onClick={() => setIosGuideOpen(false)}
          className="tap-target mt-6 w-full min-h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white touch-manipulation"
        >
          {labels.installAppClose}
        </button>
      </Dialog>

      <Dialog
        isOpen={androidGuideOpen}
        onClose={() => setAndroidGuideOpen(false)}
        title={labels.installAppTitle}
      >
        <p className="text-sm text-slate-200">{labels.installAppAndroidHint}</p>
        <button
          type="button"
          onClick={() => setAndroidGuideOpen(false)}
          className="tap-target mt-6 w-full min-h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white touch-manipulation"
        >
          {labels.installAppClose}
        </button>
      </Dialog>
    </>
  );
}
