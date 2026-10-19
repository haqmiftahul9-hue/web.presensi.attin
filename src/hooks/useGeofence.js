import { useCallback, useEffect, useRef, useState } from 'react'
import { jarakKeUnit, formatMeter } from '../data/presensiMobile.js'

const SUPPORTS_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator

/**
 * Pembacaan geolokasi untuk halaman presensi mobile.
 *
 * Sumber jarak, berurutan dari yang paling akurat:
 *  1. GPS perangkat (watchPosition) dihitung terhadap koordinat unit sekolah.
 *  2. Simulasi stabil dari id pegawai, dipakai hanya ketika GPS tidak
 *     menghasilkan koordinat (desktop, izin ditolak, perangkat tanpa GPS)
 *     supaya halaman tetap bisa dicoba. Sumbernya selalu terlihat di status.
 */
export function useGeofence({ unit, radius, staffId, aktif = true, refreshMs = 5000 }) {
  const [posisi, setPosisi] = useState(null)
  const [akurasi, setAkurasi] = useState(null)
  const [errorGps, setErrorGps] = useState(null)
  const [membaca, setMembaca] = useState(false)
  const watchRef = useRef(null)

  const berhenti = useCallback(() => {
    if (watchRef.current != null && SUPPORTS_GPS) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setMembaca(false)
  }, [])

  const mulai = useCallback(() => {
    if (!aktif || !SUPPORTS_GPS) return
    setMembaca(true)
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    // Ambil posisi segera sekali untuk hasil awal tanpa menunggu watchPosition
    navigator.geolocation.getCurrentPosition(
      (hasil) => {
        setPosisi((prev) => {
          if (prev && prev.latitude === hasil.coords.latitude && prev.longitude === hasil.coords.longitude) {
            return prev
          }
          return { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude }
        })
        setAkurasi(Number.isFinite(hasil.coords.accuracy) ? Math.round(hasil.coords.accuracy) : null)
        setErrorGps(null)
        setMembaca(false)
      },
      (salah) => {
        setMembaca(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 },
    )
    // watchPosition selaras terus-menerus untuk pembaruan posisi selama bergerak
    watchRef.current = navigator.geolocation.watchPosition(
      (hasil) => {
        setPosisi((prev) => {
          if (prev && prev.latitude === hasil.coords.latitude && prev.longitude === hasil.coords.longitude) {
            return prev
          }
          return { latitude: hasil.coords.latitude, longitude: hasil.coords.longitude }
        })
        setAkurasi(Number.isFinite(hasil.coords.accuracy) ? Math.round(hasil.coords.accuracy) : null)
        setErrorGps(null)
        setMembaca(false)
      },
      (salah) => {
        setErrorGps(salah?.message || 'GPS tidak dapat dibaca')
        setMembaca(false)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    )
  }, [aktif])

  useEffect(() => {
    if (!aktif || !SUPPORTS_GPS) return undefined
    mulai()
    return () => {
      berhenti()
    }
  }, [aktif, mulai, berhenti])

  const latUnit = unit?.latitude != null ? Number(unit.latitude) : null
  const lngUnit = unit?.longitude != null ? Number(unit.longitude) : null
  const unitParsed = latUnit != null && lngUnit != null ? { ...unit, latitude: latUnit, longitude: lngUnit } : unit

  const jarakGps = posisi && unitParsed?.latitude != null && unitParsed?.longitude != null ? jarakKeUnit(posisi, unitParsed) : null
  const memakaiGps = jarakGps !== null

  // Simulasi hanya dipakai saat GPS tidak menghasilkan koordinat. Nilainya
  // diturunkan dari id pegawai supaya stabil selama sesi (tidak melompat tiap
  // render) dan selalu di dalam radius, sehingga alur presensi tetap bisa
  // dicoba di perangkat tanpa GPS.
  const effectiveRadius = Number(radius || unit?.radius || 50)
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
    // Geofence hanya berlaku kalau unit sekolahnya sudah punya koordinat;
    // tanpa itu jarak tidak pernah bisa dibandingkan secara nyata.
    lokasiAktif: Boolean(latUnit) && Boolean(lngUnit),
    posisi,
    akurasi,
    errorGps,
    membaca,
    sumber: memakaiGps ? 'gps' : 'simulasi',
    koordinatUnit: unitParsed ? { latitude: latUnit, longitude: lngUnit } : null,
    refresh: mulai,
  }
}
