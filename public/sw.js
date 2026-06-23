/**
 * Kifpadel PWA service worker (v6)
 * - Never intercepts HTML navigations or auth/profile routes.
 * - Cache-first only for icons + manifest (install shell).
 * - Stale-while-revalidate for immutable Next static chunks.
 */

const CACHE_NAME = "kifpadel-static-v7";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

const SENSITIVE_PATH_RE =
  /\/(auth|profile|onboarding|admin|club)(\/|$)|^\/api\//;

function isSensitivePath(pathname) {
  if (pathname.startsWith("/api/")) {
    return true;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const localeOffset = segments[0] === "fr" || segments[0] === "en" ? 1 : 0;
  const segment = segments[localeOffset];
  return segment
    ? ["auth", "profile", "onboarding", "admin", "club"].includes(segment)
    : false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
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
            .filter((key) => key.startsWith("kifpadel-static-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    return;
  }

  if (requestUrl.searchParams.has("_rsc") || requestUrl.searchParams.has("_nextDataReq")) {
    return;
  }

  if (isSensitivePath(requestUrl.pathname) || SENSITIVE_PATH_RE.test(requestUrl.pathname)) {
    return;
  }

  const pathname = requestUrl.pathname;

  if (pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  ) {
    event.respondWith(cacheFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
