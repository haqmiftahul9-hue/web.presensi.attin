// ============================================================================
// Service Worker - SIMPEG Attin Push Notification & Background Sync
// ============================================================================

const CACHE_NAME = 'simpres-attin-v2'
const OFFLINE_URL = '/offline.html'

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/offline.html',
      ])
    })
  )
  self.skipWaiting()
})

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event: cache-first, network fallback; offline navigasi ke halaman offline
self.addEventListener('fetch', (event) => {
  // Abaikan request non-GET
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  // Abaikan request Vite / HMR / localhost agar tidak menimbulkan status 503 saat dev
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.pathname.startsWith('/@') || url.pathname.includes('hot-update')) {
    return
  }

  const { request } = event
  const isNavigation = request.mode === 'navigate'

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse
      return fetch(request).catch(() => {
        if (isNavigation) {
          return caches.match(OFFLINE_URL)
        }
        return new Response('', { status: 204, statusText: 'No Content' })
      })
    })
  )
})
      })
    })
  )
})

// Push event: handle incoming push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'SIMPEG Attin'
  const options = {
    body: data.body || 'Ada notifikasi baru dari sistem presensi.',
    icon: '/icons/logo-simpeg.png',
    badge: '/icons/logo-simpeg.png',
    tag: data.tag || 'simpres-notification',
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'close', title: 'Tutup' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Jika sudah ada tab buka, fokuskan
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus()
        }
      }
      // Buka tab baru
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Background sync event: sinkronisasi data offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-presensi') {
    event.waitUntil(
      // Sinkronisasi antrian presensi offline
      fetch('/api/sync-offline-presensi', { method: 'POST' })
        .then((response) => {
          if (!response.ok) throw new Error('Sync failed')
          return response.json()
        })
        .catch((err) => {
          console.warn('Background sync failed:', err)
        })
    )
  }
})

// Message event: komunikasi dari main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
  if (event.data === 'getSubscription') {
    event.ports[0].postMessage(self.registration.pushManager.getSubscription())
  }
})
