<<<<<<< HEAD
// Kifpadel Service Worker v1.1
const CACHE_NAME = "kifpadel-static-v1.1";
const APP_SHELL = ["/manifest.webmanifest", "/icons/icon.svg"];
=======
const CACHE_NAME = "kifpadel-static-v2";
const APP_SHELL = ["/", "/fr", "/en", "/manifest.webmanifest", "/icons/icon.svg"];
const STATIC_ASSET_EXTENSIONS = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i;
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac

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
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigationRequest = event.request.mode === "navigate";
  const isStaticAsset = STATIC_ASSET_EXTENSIONS.test(requestUrl.pathname);

<<<<<<< HEAD
  // Skip Next.js internals, RSC, API, and third-party scripts
  if (
    requestUrl.pathname.startsWith("/_next") ||
    requestUrl.pathname.startsWith("/api") ||
    requestUrl.pathname.startsWith("/vitals") ||
    requestUrl.searchParams.has("_rsc") ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.hostname.includes("vercel") ||
    requestUrl.hostname.includes("supabase")
  ) {
    return;
  }

  // For static assets only — use cache-first strategy
  if (requestUrl.pathname.match(/\.(svg|png|ico|webmanifest)$/)) {
=======
  if (!isSameOrigin || requestUrl.pathname.startsWith("/api")) {
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac
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

<<<<<<< HEAD
  // For all other requests (pages, etc.) — network only with redirect:follow
  event.respondWith(
    fetch(event.request, { redirect: "follow" }).catch(() => {
      return caches.match(event.request);
=======
  // Never cache navigation responses (auth/session-sensitive pages).
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/fr") || caches.match("/")),
    );
    return;
  }

  // Cache static assets only.
  if (!isStaticAsset) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
>>>>>>> b2609a9c71c35b9c11096306995ce2453a1b02ac
    }),
  );
});
