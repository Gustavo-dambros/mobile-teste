/* Unipar PWA Service Worker — root scope (/sw.js).
 *
 * Dual-Auth safety contract:
 *  - /api/* requests are NEVER intercepted by the cache layer here; they always
 *    go straight to the network so Bearer headers + session cookies stay fresh.
 *  - /api/auth/* is passed through with zero handling.
 *  - HTML navigations are network-first; cache used only as offline fallback so
 *    a stale authenticated page can never be served from cache.
 *  - Only the static app shell (logo + manifest) is precached on install.
 */
const CACHE = "unipar-v1";
const SHELL = ["/logo.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Never touch API or auth — dual-auth must hit the server untouched.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/auth/")) {
    return;
  }

  // 2) Non-GET (POST/PUT/DELETE...) — pass through, never cache.
  if (req.method !== "GET") {
    return;
  }

  // 3) Same-origin only.
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4) Navigation fallback: network-first, cache as offline fallback only.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached ||
            caches.match("/").then(
              (root) => root ||
                new Response("<h1>Offline</h1>", {
                  status: 503,
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                })
            )
          )
        )
    );
    return;
  }

  // 5) Static assets — stale-while-revalidate for fast loads + background refresh.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
