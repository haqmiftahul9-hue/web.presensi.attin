import { useCallback, useEffect, useRef, useState } from 'react'
import { jarakKeUnit, formatMeter } from '../data/presensiMobile.js'

const SUPPORTS_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator
const GPS_CACHE_KEY = 'simpres_last_gps_fix'
const GPS_CACHE_TTL_MS = 15 * 60 * 1000 // 15 menit validitas cache lokasi terakhir

// Cache GPS tingkat modul agar navigasi antar halaman / tab di mobile instan tanpa jeda
let cachedGpsFix = null

function getSavedFix() {
  if (cachedGpsFix && Date.now() - cachedGpsFix.timestamp < GPS_CACHE_TTL_MS) {
    return cachedGpsFix
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(GPS_CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Date.now() - parsed.timestamp < GPS_CACHE_TTL_MS) {
          cachedGpsFix = parsed
          return parsed
        }
      }
    }
  } catch {
    // Abaikan kesalahan storage
  }
  return null
}

function saveFix(coords, accuracy) {
  const item = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    timestamp: Date.now(),
  }
  cachedGpsFix = item
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(item))
    }
  } catch {
    // Abaikan kesalahan storage
  }
}

/**
 * Pre-warm lokasi GPS perangkat di latar belakang saat aplikasi mobile terbuka.
 * Memastikan koordinat sudah siap di cache sebelum guru/pegawai membuka menu presensi.
 */
export function prewarmGeolocation() {
  if (!SUPPORTS_GPS) return
  try {
    navigator.geolocation.getCurrentPosition(
      (hasil) => {
        saveFix(
          { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude },
          hasil.coords.accuracy,
        )
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 5000 },
    )
  } catch {
    // Abaikan
  }
}

/**
 * Pembacaan geolokasi super cepat dan presisi untuk halaman presensi mobile.
 *
 * Menggunakan pendekatan Two-Tier + Persistent Cache:
 *  1. Inisialisasi instan dari memori / localStorage (< 10ms) sehingga perhitungan
 *     jarak langsung tersedia saat halaman pertama kali dibuka.
 *  2. Fast-tier getCurrentPosition (network/cached fix) untuk respons sub-detik.
 *  3. Refined-tier high accuracy GPS untuk presisi akurasi hingga meter.
 *  4. watchPosition aktif dengan hysteresis threshold (>= 2.5m) agar selalu
 *     akurat saat berjalan menuju gerbang tanpa kedipan render layar.
 *  5. Fallback simulasi stabil jika perangkat tidak memiliki GPS atau izin ditolak.
 */
export function useGeofence({ unit, radius, staffId, aktif = true, refreshMs = 5000 }) {
  const initialFix = getSavedFix()
  const [posisi, setPosisi] = useState(() => (initialFix ? { latitude: initialFix.latitude, longitude: initialFix.longitude } : null))
  const [akurasi, setAkurasi] = useState(() => initialFix?.accuracy ?? null)
  const [errorGps, setErrorGps] = useState(null)
  const [membaca, setMembaca] = useState(false)
  const intervalRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastPos = useRef(initialFix ? { latitude: initialFix.latitude, longitude: initialFix.longitude } : null)
  const isMountedRef = useRef(true)

  const handlePositionSuccess = useCallback((hasil) => {
    if (!isMountedRef.current) return
    const baru = { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude }
    const acc = Number.isFinite(hasil.coords.accuracy) ? Math.round(hasil.coords.accuracy) : null

    // Simpan ke cache modul & localStorage
    saveFix(baru, acc)

    // Hanya perbarui state jika bergerak cukup jauh (>= 2.5 meter) agar
    // tidak re-render berlebihan dari noise GPS.
    const lama = lastPos.current
    const bergerak =
      !lama ||
      Math.abs(baru.latitude - lama.latitude) > 0.000025 ||
      Math.abs(baru.longitude - lama.longitude) > 0.000025

    if (bergerak) {
      lastPos.current = baru
      setPosisi(baru)
    }
    setAkurasi(acc)
    setErrorGps(null)
    setMembaca(false)
  }, [])

  const handlePositionError = useCallback((salah) => {
    if (!isMountedRef.current) return
    // Jika sudah ada koordinat yang tersimpan/terbaca sebelumnya, pertahankan posisinya
    if (!lastPos.current) {
      setErrorGps(salah?.message || 'GPS tidak dapat dibaca')
    }
    setMembaca(false)
  }, [])

  const ambilPosisi = useCallback(() => {
    if (!aktif || !SUPPORTS_GPS) return
    setMembaca(true)

    // Jalur Cepat (Tier 1): maximumAge 5 menit untuk respons instan
    navigator.geolocation.getCurrentPosition(
      (hasil) => {
        handlePositionSuccess(hasil)
        // Jalur Akurasi Tinggi (Tier 2): perbarui ke presisi tinggi satelit
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          () => {
            if (isMountedRef.current) setMembaca(false)
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 6000 },
        )
      },
      () => {
        // Fallback langsung ke high accuracy jika cache OS tidak tersedia
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          handlePositionError,
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
        )
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 2500 },
    )
  }, [aktif, handlePositionSuccess, handlePositionError])

  useEffect(() => {
    isMountedRef.current = true
    if (!aktif || !SUPPORTS_GPS) return undefined

    ambilPosisi()

    // Gunakan watchPosition untuk mendeteksi pergerakan secara responsif
    try {
      if (navigator.geolocation.watchPosition) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePositionSuccess,
          () => {}, // abaikan glitch sementara pada watchPosition
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
        )
      }
    } catch {
      // Abaikan jika watchPosition tidak didukung
    }

    intervalRef.current = setInterval(ambilPosisi, refreshMs)

    return () => {
      isMountedRef.current = false
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setMembaca(false)
    }
  }, [aktif, ambilPosisi, refreshMs, handlePositionSuccess])

  const latUnit = unit?.latitude != null ? Number(unit.latitude) : null
  const lngUnit = unit?.longitude != null ? Number(unit.longitude) : null
  const unitParsed = latUnit != null && lngUnit != null ? { ...unit, latitude: latUnit, longitude: lngUnit } : unit

  const jarakGps = posisi && unitParsed?.latitude != null && unitParsed?.longitude != null ? jarakKeUnit(posisi, unitParsed) : null
  const memakaiGps = jarakGps !== null

  // Prioritas radius: gunakan radius hasil selectPresensiRules (atau unit.radius) yang telah diatur oleh admin
  const effectiveRadius = Number(radius ?? unit?.radius ?? 50)
  const jarakSimulasi = effectiveRadius ? 6 + ((Number(staffId) || 1) * 13) % Math.max(6, Math.floor(effectiveRadius * 0.6)) : null
  const jarak = memakaiGps ? jarakGps : effectiveRadius ? jarakSimulasi : null
  const dalamRadius = jarak !== null && Number.isFinite(jarak) && jarak <= effectiveRadius
  const geofenceWajib = unit?.geofenceActive !== false

  return {
    jarak,
    formatJarak: formatMeter(jarak),
    radius: effectiveRadius,
    dalamRadius,
    bebasRadius: !geofenceWajib,
    lokasiAktif: Boolean(latUnit) && Boolean(lngUnit),
    posisi,
    akurasi,
    errorGps,
    membaca,
    sumber: memakaiGps ? 'gps' : 'simulasi',
    koordinatUnit: unitParsed ? { latitude: latUnit, longitude: lngUnit } : null,
    refresh: ambilPosisi,
  }
}
