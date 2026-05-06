/**
 * Kifpadel Service Worker Kill-Switch
 * This file is designed to unregister any active service workers and clear caches.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do NOT add a fetch listener. 
// Adding an empty fetch listener can still trigger interception logic in some browsers.
// By removing it, the browser will handle all requests normally via the network.
