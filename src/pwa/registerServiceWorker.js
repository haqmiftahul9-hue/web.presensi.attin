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
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Periksa pembaruan secara berkala agar perubahan sistem cepat sampai ke perangkat terpasang.
        const cekPembaruan = () => reg.update().catch(() => undefined)
        cekPembaruan()
        setInterval(cekPembaruan, 60 * 1000)

        // Saat service worker baru aktif, muat ulang halaman sekali agar tampilan terbaru.
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })
      })
      .catch((salah) => {
        console.warn('[SimPres] service worker tidak terdaftar:', salah?.message || salah)
      })
  })
}