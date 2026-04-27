const CACHE_NAME = "kifpadel-static-v1";
const APP_SHELL = ["/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip Next.js internals, RSC requests, and non-same-origin requests
  if (
    requestUrl.pathname.startsWith("/_next") ||
    requestUrl.pathname.startsWith("/api") ||
    requestUrl.searchParams.has("_rsc") ||
    requestUrl.origin !== self.location.origin
  ) {
    return;
  }

  // For static assets only — use cache-first strategy
  if (requestUrl.pathname.match(/\.(svg|png|ico|webmanifest)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request, { redirect: "follow" }).then((networkResponse) => {
          if (networkResponse.ok && !networkResponse.redirected) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // For all other requests (pages, etc.) — network only with redirect:follow
  event.respondWith(
    fetch(event.request, { redirect: "follow" }).catch(() => {
      return caches.match(event.request);
    }),
  );
});
