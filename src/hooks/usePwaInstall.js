import { useCallback, useEffect, useState } from 'react'

// Kunci penolakan banner di localStorage: setelah pengguna menekan "Nanti",
// banner tidak muncul lagi di perangkat itu.
const KUNCI_SIMPAN = 'simpres.pwa.installDismissed'

function bacaSudahTerpasang() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

function iosBelumPunyaPrompt() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  // iOS Safari tidak pernah menembakkan beforeinstallprompt; satu-satunya cara
  // adalah tombol Bagikan -> "Tambahkan ke Layar Utama".
  return iOS
}

/**
 * Status PWA untuk halaman mobile: apakah aplikasi sudah terpasang, apakah
 * peramban siap menampilkan prompt pemasangan, dan cara meminta pemasangan.
 *
 * Alur yang ditangani:
 *  - Chromium/Android/desktop : beforeinstallprompt -> promptInstall()
 *  - iOS Safari               : tidak ada prompt; tampilkan petunjuk manual
 *  - Sudah terpasang          : disembunyikan
 */
export function usePwaInstall() {
  const [promptInstall, setPromptInstall] = useState(null)
  const [terpasang, setTerpasang] = useState(bacaSudahTerpasang)
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage?.getItem(KUNCI_SIMPAN) === '1',
  )
  const [ios, setIos] = useState(iosBelumPunyaPrompt)

  useEffect(() => {
    const timelyInstall = (event) => {
      // Prompt bawaan peramban tidak dipakai; diganti banner aplikasi yang lebih
      // jelas dan hanya muncul untuk role mobile.
      event.preventDefault()
      setPromptInstall(event)
    }
    const selesaiTerpasang = () => {
      setTerpasang(true)
      setPromptInstall(null)
      window.localStorage?.setItem(KUNCI_SIMPAN, '1')
    }
    const cekDisplayMode = () => setTerpasang(bacaSudahTerpasang())

    window.addEventListener('beforeinstallprompt', timelyInstall)
    window.addEventListener('appinstalled', selesaiTerpasang)
    window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', cekDisplayMode)
    return () => {
      window.removeEventListener('beforeinstallprompt', timelyInstall)
      window.removeEventListener('appinstalled', selesaiTerpasang)
    }
  }, [])

  const pasang = useCallback(async () => {
    if (!promptInstall) return false
    promptInstall.prompt()
    const pilihan = await promptInstall.userChoice?.catch(() => null)
    setPromptInstall(null)
    if (pilihan?.outcome === 'accepted') setTerpasang(true)
    return pilihan?.outcome === 'accepted'
  }, [promptInstall])

  const nanti = useCallback(() => {
    window.localStorage?.setItem(KUNCI_SIMPAN, '1')
    setDismissed(true)
  }, [])

  return {
    bisaPasang: Boolean(promptInstall),
    pasang,
    nanti,
    terpasang,
    dismissed,
    ios,
    // Chrome kadang menunda prompt; jangan tampilkan petunjuk iOS di perangkat
    // yang punya prompt asli.
    perluPetunjukIos: ios && !promptInstall,
    /** Banner hanya relevan bila belum terpasang, belum ditolak, dan ada cara. */
    tampilkanBanner: !terpasang && !dismissed && (Boolean(promptInstall) || (ios && !promptInstall)),
  }
}