/* Pilot – Service Worker (Cache + Offline)
   Hinweis: Für Demo und Präsentation gedacht.
*/
const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `pilot-ze-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./assets/css/app.css",

  "./assets/js/app.js",
  "./assets/js/router.js",
  "./assets/js/data.js",
  "./assets/js/storage.js",
  "./assets/js/ui.js",
  "./assets/js/utils.js",

  "./assets/data/mitarbeiter.json",
  "./assets/data/auftraege.json",
  "./assets/data/gemeinkosten.json",

  "./partials/header.html",
  "./partials/footer.html",

  "./screens/login.html",
  "./screens/auftraege.html",
  "./screens/auftrag_detail.html",
  "./screens/gemeinkosten.html",
  "./screens/dokumente.html",

  "./assets/img/icons/icon-192.png",
  "./assets/img/icons/icon-512.png",
  "./assets/img/icons/icon-512-maskable.png",

  "./assets/docs/zeichnung_4711.pdf",
  "./assets/docs/arbeitsanweisung_4711.pdf"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    // Cache first für statische Assets, Network fallback.
    if (cached) return cached;

    try {
      const fresh = await fetch(request);
      // nur same-origin cachen
      const url = new URL(request.url);
      if (url.origin === self.location.origin) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (e) {
      // Offline fallback: wenn HTML fehlt, wenigstens index.html
      const fallback = await cache.match("./index.html");
      return fallback || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
