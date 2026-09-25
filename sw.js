const CACHE_NAME = "ganga-watch-assets-v5";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/assets/ganga-droplet.svg"
];

const CACHEABLE_HOSTS = new Set([
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept map tiles. Their providers control their own tile caching.
  if (
    url.hostname === "tile.openstreetmap.org" ||
    url.hostname.endsWith("arcgisonline.com")
  ) {
    return;
  }

  const isLocal = url.origin === self.location.origin;
  const isStaticExternal =
    CACHEABLE_HOSTS.has(url.hostname) &&
    ["script", "style", "font"].includes(request.destination);

  if (!isLocal && !isStaticExternal) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
