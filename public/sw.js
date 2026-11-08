// ============================================================================
// Service Worker - SIMPEG Attin Push Notification & Background Sync
// ============================================================================

const CACHE_NAME = 'simpres-attin-v1'
const OFFLINE_URL = '/offline.html'

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
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

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' })
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
