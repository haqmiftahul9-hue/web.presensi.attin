import { useEffect, useState } from 'react'

// Ambang lebar yang memisahkan "aplikasi mobile" dari portal desktop. 768px
// dipakai karena di bawah itu tidak ada ruang untuk sidebar portal (260px) +
// konten yang masih terbaca.
const AMBANG_MOBILE_PX = 768

/**
 * Deteksi perangkat secara murni, dipisah dari hook supaya aturannya bisa diuji
 * tanpa browser:
 *
 * - lebar < 768px  -> perangkat mobile (iPhone/Android)
 * - pointer kasar  -> perangkat sentuh (tablet/HP)
 * - user agent     -> jaring pengaman untuk browser desktop kecil
 */
export function isMobileProfile({ width, coarsePointer = false, userAgent = '' } = {}) {
  if (Number.isFinite(width) && width > 0 && width < AMBANG_MOBILE_PX) return true
  if (coarsePointer && Number.isFinite(width) && width < 1024) return true
  const ua = String(userAgent).toLowerCase()
  return /android|iphone|ipod|windows phone|blackberry|\bmobi\b/.test(ua)
}

/**
 * Profil perangkat untuk halaman login. Default-nya desktop saat `window`
 * tidak ada (SSR/uji), lalu ikut berubah mengikuti resize dan rotasi layar.
 */
export function useDeviceProfile() {
  const read = () => {
    if (typeof window === 'undefined') {
      return { width: 1280, isMobile: false, isTouch: false, reducedMotion: false }
    }
    const width = window.innerWidth || document.documentElement.clientWidth || 1280
    const coarsePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false
    const reducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    return {
      width,
      isMobile: isMobileProfile({ width, coarsePointer, userAgent: window.navigator?.userAgent }),
      isTouch: coarsePointer,
      reducedMotion,
    }
  }

  const [profil, setProfil] = useState(read)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const perbarui = () => setProfil(read())
    window.addEventListener('resize', perbarui)
    window.addEventListener('orientationchange', perbarui)
    return () => {
      window.removeEventListener('resize', perbarui)
      window.removeEventListener('orientationchange', perbarui)
    }
  }, [])

  return profil
}