const CACHE_VERSION = "v3.0.0";
const CACHE_NAME = `ze-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./partials/header.html",
  "./partials/footer.html",

  "./assets/css/app.css",

  "./assets/js/app.js",
  "./assets/js/router.js",
  "./assets/js/data.js",
  "./assets/js/storage.js",
  "./assets/js/ui.js",
  "./assets/js/utils.js",

  "./assets/data/user.json",
  "./assets/data/jobs.json",
  "./assets/data/gemeinkosten.json",

  "./screens/inbox.html",
  "./screens/auftraege.html",
  "./screens/auftrag_detail.html",
  "./screens/gemeinkosten.html",
  "./screens/bibliothek.html",
  "./screens/modell.html",
  "./screens/dispo.html",
  "./screens/vorarbeiter.html",

  "./assets/img/icons/icon-192.png",
  "./assets/img/icons/icon-512.png",
  "./assets/img/icons/icon-512-maskable.png",
  "./assets/docs/zeichnung_5800.pdf",
  "./assets/docs/anweisung_5800.pdf",
  "./assets/docs/zeichnung_5801.pdf",
  "./assets/docs/anweisung_5801.pdf",
  "./assets/docs/zeichnung_5802.pdf",
  "./assets/docs/anweisung_5802.pdf",
  "./assets/docs/zeichnung_5803.pdf",
  "./assets/docs/anweisung_5803.pdf",
  "./assets/docs/zeichnung_5804.pdf",
  "./assets/docs/anweisung_5804.pdf",
  "./assets/docs/zeichnung_5805.pdf",
  "./assets/docs/anweisung_5805.pdf",
  "./assets/docs/zeichnung_5806.pdf",
  "./assets/docs/anweisung_5806.pdf",
  "./assets/docs/zeichnung_5807.pdf",
  "./assets/docs/anweisung_5807.pdf",
  "./assets/docs/zeichnung_5808.pdf",
  "./assets/docs/anweisung_5808.pdf",
  "./assets/docs/zeichnung_5809.pdf",
  "./assets/docs/anweisung_5809.pdf",
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
  if(request.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch:true });
    if(cached) return cached;

    try{
      const fresh = await fetch(request);
      const url = new URL(request.url);
      if(url.origin === self.location.origin){
        cache.put(request, fresh.clone());
      }
      return fresh;
    }catch(e){
      const fallback = await cache.match("./index.html");
      return fallback || new Response("Offline", { status:200, headers:{ "Content-Type":"text/plain; charset=utf-8" }});
    }
  })());
});
