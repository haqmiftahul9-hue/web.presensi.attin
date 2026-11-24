/**
 * Registrasi Service Worker (PWA) dengan mekanisme Auto-Update Cerdas.
 *
 * Menjamin setiap kali ada pembaruan kode di server/hosting, seluruh pengguna
 * baik di web peramban seluler maupun aplikasi pintasan PWA yang sudah terpasang
 * di Home Screen (Android/iOS/Desktop) otomatis mendapatkan pembaruan terkini
 * tanpa perlu menghapus data situs dari Chrome atau memasang ulang pintasan.
 */

const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'

let isCheckingVersion = false
let isReloading = false

async function checkServerVersion(reg) {
  if (isCheckingVersion || isReloading) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  isCheckingVersion = true
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })
    if (!res.ok) return
    const data = await res.json()
    if (data?.version && CURRENT_VERSION !== 'dev' && data.version !== CURRENT_VERSION) {
      console.log(`[SIMPEG PWA] Versi baru server terdeteksi (${data.version} vs running ${CURRENT_VERSION}). Memperbarui aplikasi...`)
      isReloading = true

      // Trigger pembaruan service worker
      if (reg) {
        try {
          await reg.update()
        } catch {
          /* ignore */
        }
        if (reg.waiting) {
          reg.waiting.postMessage('skipWaiting')
        }
      }
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage('skipWaiting')
      }

      // Bersihkan caches browser jika didukung
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await window.caches.keys()
          await Promise.all(keys.map((k) => window.caches.delete(k)))
        } catch {
          /* ignore */
        }
      }

      // Jeda singkat agar pembersihan tuntas lalu muat ulang halaman
      setTimeout(() => {
        window.location.reload()
      }, 350)
    }
  } catch {
    /* offline atau kendala jaringan */
  } finally {
    isCheckingVersion = false
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (!window.isSecureContext) return

  // Di mode pengembangan (dev), unregister service worker agar tidak mengintersepsi
  // modul HMR Vite dan tidak menimbulkan status 503 (Offline) saat server dimulai ulang.
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // 1. Cek pembaruan segera setelah aplikasi dimuat
        checkServerVersion(reg)
        reg.update().catch(() => undefined)

        // 2. Setiap kali tab atau aplikasi PWA dibuka kembali dari layar utama (home screen)
        // Ini adalah kunci utama agar pintasan mobile selalu menampilkan update terbaru!
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => undefined)
            checkServerVersion(reg)
          }
        })

        // 3. Saat window mendapatkan fokus kembali
        window.addEventListener('focus', () => {
          reg.update().catch(() => undefined)
          checkServerVersion(reg)
        })

        // 4. Saat perangkat kembali tersambung online
        window.addEventListener('online', () => {
          reg.update().catch(() => undefined)
          checkServerVersion(reg)
        })

        // 5. Polling berkala setiap 60 detik jika aplikasi tetap terbuka
        setInterval(() => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => undefined)
            checkServerVersion(reg)
          }
        }, 60 * 1000)

        // 6. Tangani siklus pembaruan Service Worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SIMPEG PWA] Service Worker versi baru telah diinstal, mengaktifkan...')
              newWorker.postMessage('skipWaiting')
            }
          })
        })

        if (reg.waiting) {
          reg.waiting.postMessage('skipWaiting')
        }

        // 7. Saat worker baru mengambil alih kendali, reload halaman otomatis
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })
      })
      .catch((salah) => {
        console.warn('[SIMPEG] service worker tidak terdaftar:', salah?.message || salah)
      })
  })
}
