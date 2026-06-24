/**
 * Kifpadel PWA service worker (v9)
 * - Accueil /fr|/en : réseau d'abord, écran boot statique si lent (jamais de cache HTML SSR).
 * - Cache-first : icônes, manifest, chunks _next/static.
 * - Pas d'interception auth / profil / club.
 */

const CACHE_NAME = "kifpadel-static-v9";
const NETWORK_TIMEOUT_MS = 2800;
const BOOT_RETRY_HEADER = "X-Kifpadel-Boot-Retry";

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/pwa-boot.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
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
    if (event.request.headers.get(BOOT_RETRY_HEADER) === "1") {
      return;
    }
    if (isShellHomePath(pathname)) {
      event.respondWith(networkFirstShellNavigation(event.request));
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
    pathname === "/pwa-boot.html" ||
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
 * Réseau d'abord (évite HTML SSR périmé qui bloque React).
 * Si le réseau est lent : écran boot statique qui relance en arrière-plan.
 */
async function networkFirstShellNavigation(request) {
  const bootShell = await caches.match("/pwa-boot.html");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    const response = await fetch(request, {
      credentials: "same-origin",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      return response;
    }
  } catch {
    clearTimeout(timeoutId);
  }

  if (bootShell) {
    return bootShell;
  }

  return new Response("Kifpadel — hors ligne", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
