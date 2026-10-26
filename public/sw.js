/* eslint-env serviceworker */
/**
 * Service worker SimPres.
 *
 * Fungsinya dua:
 *  1. Membuat aplikasi bisa dipasang (installable) — Chrome mensyaratkan service
 *     worker dengan fetch handler sebelum menampilkan prompt pemasangan.
 *  2. Membuat halaman mobile tetap terbuka saat sinyal hilang — Guru/Pegawai
 *     memakai aplikasi ini di lapangan, di area dengan sinyal tidak stabil.
 *
 * Strategi cache:
 *  - Navigasi (halaman): network-first, jatuh ke cache, lalu /index.html
 *    (SPA) supaya rute /mobile/* tetap bisa dibuka offline.
 *  - Aset build (/assets/...): cache-first (nama berkas sudah ber-hash).
 *  - Modul sumber Vite (/src, /@vite, /node_modules): SANGAT DILEWATI agar
 *    HMR tetap benar saat pengembangan.
 *  - Permintaan lintas domain (Google Fonts, gambar profil): dilewati.
 *
 * Dashboard admin memakai shell SPA yang sama, jadi cache ini tidak mengubah
 * perilakunya di browser — hanya memberi kemampuan offline saat aplikasi
 * mobile terpasang.
 */

const VERSI_CACHE = 'simpres-v2'
const CACHE_ASET = `${VERSI_CACHE}-assets`
const CACHE_SHELL = `${VERSI_CACHE}-shell`
const SHELL_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(['/', SHELL_URL, '/manifest.webmanifest', '/icons/pwa-icon.png']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSI_CACHE)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

// Halaman dimuat ulang: biarkan tab lama mengambil service worker baru.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function bolehCache(url) {
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/src/')) return false
  if (url.pathname.startsWith('/@')) return false
  if (url.pathname.startsWith('/node_modules/')) return false
  return true
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!bolehCache(url)) return

  // Navigasi: coba jaringan dulu (data terbaru), lalu cache, lalu shell SPA.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const salinan = response.clone()
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, salinan)).catch(() => undefined)
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_SHELL)
          return (
            (await cache.match(request)) ||
            (await cache.match(SHELL_URL)) ||
            (await cache.match('/')) ||
            new Response('<h1>Offline</h1><p>SimPres sedang tidak tersambung.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            })
          )
        }),
    )
    return
  }

  // Aset ber-hash: sajikan dari cache bila ada, lalu lengkapi di belakang.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const dariJaringan = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const salinan = response.clone()
              caches.open(CACHE_ASET).then((cache) => cache.put(request, salinan)).catch(() => undefined)
            }
            return response
          })
          .catch(() => cached)
        return cached || dariJaringan
      }),
    )
  }
})