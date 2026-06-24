/**
 * Kifpadel PWA service worker (v8)
 * - Shell accueil /fr et /en : stale-while-revalidate (ouverture instantanée PWA).
 * - Pas de cache HTML pour auth, profil, club, etc.
 * - Cache-first pour icônes + manifest.
 * - Cache-first pour chunks Next immutables (_next/static).
 */

const CACHE_NAME = "kifpadel-static-v8";

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

/** Routes d'accueil (start_url PWA) — shell minimal offline. */
const SHELL_HOME_URLS = ["/fr", "/en"];

const SENSITIVE_PATH_RE =
  /\/(auth|profile|onboarding|admin|club)(\/|$)|^\/api\//;

function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/$/, "");
  return trimmed || "/";
}

function isShellHomePath(pathname) {
  const normalized = normalizePathname(pathname);
  return normalized === "/fr" || normalized === "/en";
}

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

function shellCacheKey(pathname) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/fr" || normalized === "/en") {
    return normalized;
  }
  return null;
}

async function precacheShellPages(cache) {
  await Promise.allSettled(
    SHELL_HOME_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Hors ligne à l'install : le shell sera mis en cache au premier passage réseau.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_URLS);
      await precacheShellPages(cache);
    }),
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
    const pathname = requestUrl.pathname;
    if (isSensitivePath(pathname) || SENSITIVE_PATH_RE.test(pathname)) {
      return;
    }
    if (isShellHomePath(pathname)) {
      event.respondWith(staleWhileRevalidateNavigation(event.request));
    }
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

/**
 * Affiche le shell en cache immédiatement, rafraîchit en arrière-plan.
 * Première visite : réseau uniquement (puis mise en cache).
 */
async function staleWhileRevalidateNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = shellCacheKey(new URL(request.url).pathname);
  const cachedResponse = cacheKey ? await cache.match(cacheKey) : await cache.match(request);

  const networkFetch = fetch(request, { credentials: "same-origin" })
    .then(async (response) => {
      if (response.ok && response.type === "basic") {
        const putKey = cacheKey ?? request.url;
        await cache.put(putKey, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    void networkFetch;
    return cachedResponse;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kifpadel</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B1020;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:1.5rem}p{max-width:20rem;line-height:1.5}</style></head><body><p>Hors ligne — reconnectez-vous pour charger Kifpadel.</p></body></html>`,
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
