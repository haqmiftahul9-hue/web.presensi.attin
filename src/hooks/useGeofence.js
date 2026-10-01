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
export function useGeofence({ unit, radius, staffId, aktif = true, refreshMs = 20000 }) {
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
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = navigator.geolocation.watchPosition(
      (hasil) => {
        setPosisi({ latitude: hasil.coords.latitude, longitude: hasil.coords.longitude })
        setAkurasi(Number.isFinite(hasil.coords.accuracy) ? Math.round(hasil.coords.accuracy) : null)
        setErrorGps(null)
      },
      (salah) => {
        setErrorGps(salah?.message || 'GPS tidak dapat dibaca')
        setMembaca(false)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
  }, [aktif])

  useEffect(() => {
    if (!aktif || !SUPPORTS_GPS) return undefined
    mulai()
    // watchPosition sudah memperbarui posisi sendiri; interval ini hanya
    // memaksa pembacaan ulang pada perangkat yang sesekali macet.
    const id = setInterval(mulai, refreshMs)
    return () => {
      clearInterval(id)
      berhenti()
    }
  }, [aktif, mulai, refreshMs, berhenti])

  const jarakGps = posisi ? jarakKeUnit(posisi, unit) : null
  const memakaiGps = jarakGps !== null

  // Simulasi hanya dipakai saat GPS tidak menghasilkan koordinat. Nilainya
  // diturunkan dari id pegawai supaya stabil selama sesi (tidak melompat tiap
  // render) dan selalu di dalam radius, sehingga alur presensi tetap bisa
  // dicoba di perangkat tanpa GPS.
  const jarakSimulasi = radius ? 6 + ((Number(staffId) || 1) * 13) % Math.max(6, Math.floor(radius * 0.6)) : null
  const jarak = memakaiGps ? jarakGps : radius ? jarakSimulasi : null
  const dalamRadius = jarak !== null && Number.isFinite(jarak) && jarak <= radius

  return {
    jarak,
    formatJarak: formatMeter(jarak),
    radius,
    dalamRadius,
    // Geofence hanya berlaku kalau unit sekolahnya sudah punya koordinat;
    // tanpa itu jarak tidak pernah bisa dibandingkan secara nyata.
    lokasiAktif: Boolean(unit?.latitude) && Boolean(unit?.longitude),
    posisi,
    akurasi,
    errorGps,
    membaca,
    sumber: memakaiGps ? 'gps' : 'simulasi',
    koordinatUnit: unit ? { latitude: unit.latitude, longitude: unit.longitude } : null,
    refresh: mulai,
  }
}
