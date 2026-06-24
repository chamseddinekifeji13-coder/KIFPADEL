"use client";

import { useEffect } from "react";

const ACTIVE_CACHE_PREFIX = "kifpadel-static-v8";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
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
