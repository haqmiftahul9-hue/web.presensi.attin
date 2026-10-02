/**
 * Registrasi service worker (PWA).
 *
 * Didaftarkan juga saat pengembangan: service worker menyela modul sumber Vite
 * (/src, /@vite, /node_modules) sehingga HMR tetap berjalan normal, dan
 * navigasi memakai network-first sehingga tidak ada halaman basi.
 *
 * Dashboard admin tidak berubah: shell SPA-nya sama, dan service worker hanya
 * menambah cache — tidak pernah menahan permintaan secara paksa.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  // Konteks non-aman (mis. http tanpa TLS di IP lokal) tidak mendukung service
  // worker, jadi dilewati diam-diam.
  if (!window.isSecureContext) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((salah) => {
      // Kegagalan registrasi tidak boleh mengganggu aplikasi; biasanya terjadi
      // saat server tidak mengirim application/service-worker + charset=utf-8.
      console.warn('[SimPres] service worker tidak terdaftar:', salah?.message || salah)
    })
  })
}