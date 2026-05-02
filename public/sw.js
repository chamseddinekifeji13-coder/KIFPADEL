const CACHE_NAME = "kifpadel-static-v3";
const APP_SHELL = ["/manifest.webmanifest", "/icons/icon.svg"];
const STATIC_ASSET_EXTENSIONS = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i;

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

  if (!isSameOrigin || requestUrl.pathname.startsWith("/api")) {
    return;
  }

  if (requestUrl.pathname.startsWith("/_next") || requestUrl.searchParams.has("_rsc")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (requestUrl.pathname.startsWith("/vitals")) {
    return;
  }

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/fr") || caches.match("/")),
    );
    return;
  }

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
    }),
  );
});
