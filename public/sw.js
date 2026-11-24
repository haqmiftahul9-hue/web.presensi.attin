const SW_VERSION = "5.1.0";
const CACHE_NAME = "simpeg-attin-v" + SW_VERSION;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/manifest.webmanifest", "/offline.html"])
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
          .map((name) => {
            console.log("[SW] Menghapus cache usang:", name);
            return caches.delete(name);
          })
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

  // version.json dan sw.js tidak boleh di-cache oleh Service Worker sama sekali
  if (url.pathname === "/version.json" || url.pathname === "/sw.js") {
    event.respondWith(
      fetch(request, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Strategi Network-First untuk navigasi halaman (HTML).
  // Menjamin pengguna selalu mendapatkan index.html terbaru beserta referensi hash aset Vite terbaru setelah deploy.
  // Gunakan cache: "no-cache" agar tidak tertahan oleh HTTP disk cache peramban mobile.
  // Jika offline atau jaringan terputus, baru fallback ke cache / offline.html.
  if (isNavigation) {
    event.respondWith(
      fetch(request, {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Untuk aset statis (CSS, JS, Fonts, Icons, Images): Cache-First dengan Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith("/assets/") ||
            url.pathname.startsWith("/fonts/") ||
            url.pathname.startsWith("/icons/") ||
            url.pathname.startsWith("/models/"))
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
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
    tag: data.tag || "simpeg-notification",
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
  if (event.data === "clearAllCaches") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
  if (event.data === "getSubscription") {
    event.ports[0]?.postMessage(self.registration.pushManager.getSubscription());
  }
});
