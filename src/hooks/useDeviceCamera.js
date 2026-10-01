import { useCallback, useEffect, useRef, useState } from 'react'

const SUPPORTS_CAMERA =
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

// BarcodeDetector tersedia di Chrome/Edge (desktop & Android). Peramban lain
// memakai mode simulasi, dan kartu selalu menandai sumbernya ke pengguna.
const SUPPORTS_DETECTOR = typeof window !== 'undefined' && 'BarcodeDetector' in window

/**
 * Kamera perangkat untuk halaman presensi mobile: pratinjau video, pilihan
 * kamera depan/belakang, dan — bila peramban mendukung — pembacaan QR langsung
 * dari bingkai video.
 */
export function useDeviceCamera({ facingMode = 'user', aktif = true, onQrValue } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const loopRef = useRef(null)
  const onQrRef = useRef(onQrValue)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [nilaiQr, setNilaiQr] = useState(null)

  useEffect(() => {
    onQrRef.current = onQrValue
  }, [onQrValue])

  const stop = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  // Membaca bingkai video berulang kali sampai satu payload QR terbaca.
  // Callback disimpan di ref supaya loop tidak perlu di-restart setiap kali
  // handler pada halaman berubah.
  const mulaiDeteksiQr = useCallback(() => {
    if (!SUPPORTS_DETECTOR || loopRef.current) return
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    const tick = async () => {
      const video = videoRef.current
      if (video && video.readyState >= 2) {
        try {
          const kode = await detector.detect(video)
          const teks = kode?.[0]?.rawValue
          if (teks) {
            setNilaiQr(teks)
            onQrRef.current?.(teks)
          }
        } catch {
          // Bingkai belum terbaca / terlalu gelap: coba lagi pada frame berikut.
        }
      }
      loopRef.current = requestAnimationFrame(tick)
    }
    loopRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    if (!aktif || !SUPPORTS_CAMERA) {
      setStatus('tidak-didukung')
      return
    }
    setStatus('meminta')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
        mulaiDeteksiQr()
      }
      setStatus('aktif')
    } catch (salah) {
      setError(salah?.message || 'Kamera tidak dapat diakses')
      setStatus('ditolak')
    }
  }, [aktif, facingMode, mulaiDeteksiQr])

  useEffect(() => {
    if (!aktif) return undefined
    start()
    return stop
  }, [aktif, start, stop])

  return {
    videoRef,
    status,
    error,
    nilaiQr,
    supportsCamera: SUPPORTS_CAMERA,
    supportsDetector: SUPPORTS_DETECTOR,
    aktif: status === 'aktif',
    restart: start,
  }
}
