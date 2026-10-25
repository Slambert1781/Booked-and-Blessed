// Minimal service worker so phones offer "Install app". It doesn't cache
// anything: the app always loads fresh from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
