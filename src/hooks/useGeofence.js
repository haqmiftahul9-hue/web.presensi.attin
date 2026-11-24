import { useCallback, useEffect, useRef, useState } from 'react'
import { jarakKeUnit, formatMeter } from '../data/presensiMobile.js'
import { inspectGeolocationSecurity } from '../services/antiFakeGpsService.js'

const SUPPORTS_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator
const GPS_CACHE_KEY = 'simpres_last_gps_fix'
const GPS_CACHE_TTL_MS = 30 * 1000 // 30 detik validitas cache memori (mencegah perpindahan lokasi lama tanpa jeda)

// Cache GPS tingkat modul agar perpindahan tab di mobile instan tanpa layar kosong
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
 * Pre-warm lokasi GPS perangkat di latar belakang saat aplikasi mobile dibuka.
 * Memastikan modul GPS perangkat aktif dan koordinat sudah terkunci sebelum
 * pegawai membuka menu presensi, sehingga presensi dapat berjalan sub-detik.
 */
export function prewarmGeolocation() {
  if (!SUPPORTS_GPS) return
  try {
    navigator.geolocation.getCurrentPosition(
      (hasil) => {
        const sec = inspectGeolocationSecurity(hasil, { strictMode: false })
        if (!sec.isFake) {
          saveFix(
            { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude },
            hasil.coords.accuracy,
          )
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 6000 },
    )
  } catch {
    // Abaikan kegagalan latar belakang
  }
}

/**
 * Pembacaan geolokasi super cepat, presisi, dan aman untuk presensi mobile.
 *
 * Fitur Utama:
 *  1. Inisialisasi instan (< 10ms) dari cache memori aktif (< 30s) agar radar langsung muncul.
 *  2. Single-Stream Reactive `watchPosition` berakurasi tinggi (satelit) tanpa benturan polling `setInterval`.
 *  3. Multi-layer Anti-Fake GPS Security: memeriksa manipulasi mock location, tampering, lonjakan teleportasi,
 *     dan anomali kebekuan koordinat.
 *  4. Tanpa Celah Simulasi: Jika GPS dimatikan, sistem tidak lagi memalsukan jarak dalam radius;
 *     presensi nyata mewajibkan GPS riil yang valid.
 *  5. Indikator Kualitas Akurasi: Mengklasifikasikan presisi sinyal ('sangat_baik', 'baik', 'sedang', 'lemah').
 */
export function useGeofence({ unit, radius, staffId, aktif = true }) {
  const initialFix = getSavedFix()
  const [posisi, setPosisi] = useState(() => (initialFix ? { latitude: initialFix.latitude, longitude: initialFix.longitude } : null))
  const [akurasi, setAkurasi] = useState(() => initialFix?.accuracy ?? null)
  const [accuracyQuality, setAccuracyQuality] = useState(() => (initialFix?.accuracy ? (initialFix.accuracy <= 15 ? 'sangat_baik' : initialFix.accuracy <= 40 ? 'baik' : 'sedang') : 'lemah'))
  const [isFakeGps, setIsFakeGps] = useState(false)
  const [fakeReason, setFakeReason] = useState(null)
  const [errorGps, setErrorGps] = useState(null)
  const [membaca, setMembaca] = useState(false)

  const watchIdRef = useRef(null)
  const lastPos = useRef(initialFix ? { latitude: initialFix.latitude, longitude: initialFix.longitude } : null)
  const isMountedRef = useRef(true)

  const handlePositionSuccess = useCallback((hasil) => {
    if (!isMountedRef.current) return

    // Jalankan inspeksi keamanan Anti-Fake GPS
    const sec = inspectGeolocationSecurity(hasil, { strictMode: true })
    if (sec.isFake) {
      setIsFakeGps(true)
      setFakeReason(sec.reason)
      setErrorGps(sec.reason)
      setMembaca(false)
      return
    }

    setIsFakeGps(false)
    setFakeReason(null)

    const baru = { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude }
    const acc = Number.isFinite(hasil.coords.accuracy) ? Math.round(hasil.coords.accuracy) : null

    // Simpan ke cache modul & localStorage
    saveFix(baru, acc)

    // Hysteresis threshold (>= 2 meter) untuk stabilitas render tanpa kedipan berlebih
    const lama = lastPos.current
    const bergerak =
      !lama ||
      Math.abs(baru.latitude - lama.latitude) > 0.00002 ||
      Math.abs(baru.longitude - lama.longitude) > 0.00002

    if (bergerak) {
      lastPos.current = baru
      setPosisi(baru)
    }
    setAkurasi(acc)
    setAccuracyQuality(sec.quality || 'sedang')
    setErrorGps(null)
    setMembaca(false)
  }, [])

  const handlePositionError = useCallback((salah) => {
    if (!isMountedRef.current) return
    let pesan = 'GPS tidak dapat dibaca'
    if (salah?.code === 1) {
      pesan = 'Izin akses lokasi/GPS belum diberikan pada peramban Anda'
    } else if (salah?.code === 2) {
      pesan = 'Sinyal lokasi/GPS tidak tersedia pada perangkat'
    } else if (salah?.code === 3) {
      pesan = 'Waktu pembacaan GPS habis (sinyal satelit lemah)'
    } else if (salah?.message) {
      pesan = salah.message
    }

    // Jika belum ada koordinat tersimpan sama sekali, catat error
    if (!lastPos.current) {
      setErrorGps(pesan)
    }
    setMembaca(false)
  }, [])

  const ambilPosisi = useCallback(() => {
    if (!aktif || !SUPPORTS_GPS) {
      setErrorGps('Perangkat tidak mendukung geolokasi GPS')
      return
    }
    setMembaca(true)

    // Pembacaan instan high-accuracy dengan fallback cerdas
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (err) => {
        // Jika high-accuracy timeout, coba baca sekali lagi dengan toleransi cache 5 detik
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          handlePositionError,
          { enableHighAccuracy: false, maximumAge: 10000, timeout: 6000 },
        )
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 7000 },
    )
  }, [aktif, handlePositionSuccess, handlePositionError])

  useEffect(() => {
    isMountedRef.current = true
    if (!aktif || !SUPPORTS_GPS) {
      setErrorGps('Geolokasi GPS tidak aktif atau tidak didukung')
      return undefined
    }

    ambilPosisi()

    // Gunakan satu stream watchPosition yang responsif dan hemat daya
    try {
      if (navigator.geolocation.watchPosition) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePositionSuccess,
          () => {}, // abaikan glitch sesaat pada watch stream
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
        )
      }
    } catch {
      // Abaikan jika watchPosition tidak didukung
    }

    return () => {
      isMountedRef.current = false
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setMembaca(false)
    }
  }, [aktif, ambilPosisi, handlePositionSuccess])

  const latUnit = unit?.latitude != null ? Number(unit.latitude) : null
  const lngUnit = unit?.longitude != null ? Number(unit.longitude) : null
  const unitParsed = latUnit != null && lngUnit != null ? { ...unit, latitude: latUnit, longitude: lngUnit } : unit

  // Kalkulasi jarak Haversine ke titik lokasi unit
  const jarakGps = posisi && unitParsed?.latitude != null && unitParsed?.longitude != null
    ? jarakKeUnit(posisi, unitParsed)
    : null

  const memakaiGps = jarakGps !== null && !isFakeGps

  // Prioritas radius: unit.radius ?? settings override ?? default (50m)
  const effectiveRadius = Number(radius ?? unit?.radius ?? 50)
  const jarak = memakaiGps ? jarakGps : null

  // Geofence hanya valid jika memakai GPS asli dan berada di dalam batas radius meter
  const geofenceWajib = unit?.geofenceActive !== false
  const dalamRadius = !geofenceWajib || (memakaiGps && Number.isFinite(jarak) && jarak <= effectiveRadius)

  return {
    jarak,
    formatJarak: formatMeter(jarak),
    radius: effectiveRadius,
    dalamRadius,
    bebasRadius: !geofenceWajib,
    lokasiAktif: Boolean(latUnit) && Boolean(lngUnit),
    posisi,
    coords: posisi, // alias untuk kompatibilitas ke fungsi lain
    latitude: posisi?.latitude ?? null,
    longitude: posisi?.longitude ?? null,
    akurasi,
    accuracyQuality,
    isFakeGps,
    fakeReason,
    errorGps,
    membaca,
    sumber: isFakeGps ? 'fake_gps' : memakaiGps ? 'gps' : 'tidak_tersedia',
    koordinatUnit: unitParsed ? { latitude: latUnit, longitude: lngUnit } : null,
    refresh: ambilPosisi,
  }
}
