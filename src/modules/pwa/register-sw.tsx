"use client";

import { useEffect } from "react";

const ACTIVE_CACHE_PREFIX = "kifpadel-static-v10";

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // iOS Safari (onglet) : le SW peut gêner navigation/touches ; actif en PWA installée.
    if (isIosDevice() && !isStandaloneDisplay()) {
      return;
    }

    void (async () => {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("kifpadel-static-") && key !== ACTIVE_CACHE_PREFIX,
            )
            .map((key) => caches.delete(key)),
        );
      }

      await navigator.serviceWorker.register("/sw.js");
    })().catch(() => {
      // Keep registration failure silent for MVP UX.
    });
  }, []);

  return null;
}
