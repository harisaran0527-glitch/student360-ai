const CACHE_NAME = "student360-v3.0.0";

// STATIC APP SHELL ASSETS ONLY (Zero sensitive API data cached)
// Do NOT cache "/" — it must always hit the server for fresh SSR content
const STATIC_ASSETS = [
  "/manifest.json",
  "/offline.html",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
];

// Routes that must NEVER be served from cache
const NEVER_CACHE_PATHS = ["/admin", "/student", "/faculty", "/login", "/api/"];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching static app shell (v3)");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cache Cleanup (delete ALL old caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First with Offline Fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER intercept API requests, non-GET, or portal routes
  if (
    url.pathname.startsWith("/api/") ||
    event.request.method !== "GET"
  ) {
    return; // Pass through directly to network
  }

  // For navigation requests (HTML pages like /admin, /student, etc.)
  // ALWAYS go network-first. Only show offline.html if GENUINELY offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Network truly failed — serve offline fallback page
        const offlinePage = await caches.match("/offline.html");
        if (offlinePage) return offlinePage;
        return new Response(
          "Unable to reach the server. Please check your connection and try again.",
          { status: 503, headers: { "Content-Type": "text/plain" } }
        );
      })
    );
    return;
  }

  // For non-navigation GET requests (JS, CSS, images, fonts)
  // Network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Only cache known static assets and Next.js static chunks
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/_next/static/") ||
            STATIC_ASSETS.includes(url.pathname))
        ) {
          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Try cache fallback for static assets only
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        return new Response("", { status: 503 });
      })
  );
});

// Message Event for Manual SW Updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
