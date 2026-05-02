"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Temporary safety mode: remove stale SW/caches to avoid profile navigation failures.
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
        // Keep cleanup failure silent for MVP UX.
      });

    if ("caches" in window) {
      void caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("kifpadel-static-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch(() => {
          // Keep cache cleanup failure silent for MVP UX.
        });
    }
  }, []);

  return null;
}
