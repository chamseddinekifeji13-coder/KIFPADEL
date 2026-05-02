const CACHE_PREFIX = "kifpadel-static-";

self.addEventListener("install", (event) => {
  // Kill-switch release: activate immediately to remove stale SW logic.
  event.waitUntil(self.skipWaiting());
});

async function clearKifpadelCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearKifpadelCaches();
      await self.registration.unregister();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Intentionally no interception. Let browser/network handle all requests.
  return;
});
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
