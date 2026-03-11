const CACHE_NAME = "tayyab-pos-v3";
const API_CACHE = "tayyab-api-v3";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.png",
];

const API_URLS_TO_CACHE = [
  "/api/products",
  "/api/customers",
  "/api/categories",
  "/api/business",
  "/api/dashboard",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST") {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstThenCache(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstThenCache(event.request));
    return;
  }

  event.respondWith(networkFirstThenCache(event.request));
});

async function networkFirstThenCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const cachedIndex = await caches.match("/");
      if (cachedIndex) return cachedIndex;
    }

    return new Response(JSON.stringify({ error: "Offline", offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}


self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
