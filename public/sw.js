const CACHE_NAME = "simpres-attin-v4";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest", "/offline.html"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  const { request } = event;
  const isNavigation = request.mode === "navigate";

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).catch(() => {
        if (isNavigation) {
          return caches.match(OFFLINE_URL);
        }
        throw new Error("fetch failed");
      });
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "SIMPEG Attin";
  const options = {
    body: data.body || "Ada notifikasi baru dari sistem presensi.",
    icon: "/icons/pwa-icon.png",
    badge: "/icons/favicon-32.png",
    tag: data.tag || "simpres-notification",
    data: data.data || {},
    actions: data.actions || [
      { action: "open", title: "Buka Aplikasi" },
      { action: "close", title: "Tutup" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === self.location.origin && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-presensi") {
    event.waitUntil(
      fetch("/api/sync-offline-presensi", { method: "POST" })
        .then((response) => {
          if (!response.ok) throw new Error("Sync failed");
          return response.json();
        })
        .catch((err) => {
          console.warn("Background sync failed:", err);
        })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data === "getSubscription") {
    event.ports[0].postMessage(self.registration.pushManager.getSubscription());
  }
});