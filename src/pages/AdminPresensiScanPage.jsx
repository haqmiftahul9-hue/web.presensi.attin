import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { cardQrValue, CARD_QR_PREFIX, initialsForCard } from '../data/employeeCard.js'
import { jamDetik } from '../data/presensiMobile.js'
import { calculateAttendanceStatus } from '../data/jamKerja.js'
import { useDeviceCamera } from '../hooks/useDeviceCamera.js'
import {
  uploadAttendanceFacePhoto,
  syncAttendanceToSupabase,
} from '../services/attendancePhotoService.js'

function resolveStaff(state, code) {
  const trimmed = String(code || '').trim().toUpperCase()
  if (!trimmed) return null
  const full = trimmed.startsWith(CARD_QR_PREFIX) ? trimmed : `${CARD_QR_PREFIX}${trimmed}`
  return state.staff.find((s) => {
    const qr = String(cardQrValue(s) || '').toUpperCase()
    return (
      qr === full ||
      String(s.niy || '').toUpperCase() === trimmed ||
      String(s.id) === trimmed
    )
  }) || null
}

function AdminPresensiScanPage() {
  const { state, dispatch } = useSimPres()
  const [code, setCode] = useState('')
  const [staff, setStaff] = useState(null)
  const [pesan, setPesan] = useState('')
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState('environment')
  const [verifikasiMode, setVerifikasiMode] = useState('qr') // 'qr' | 'face'
  const [facePhotoUrl, setFacePhotoUrl] = useState(null)

  const unitId = state?.currentUser?.unitId || 'sd'
  const unit = state?.units?.find((u) => u.id === unitId) || null

  const kamera = useDeviceCamera({
    facingMode: facing,
    aktif: true,
    onQrValue: (value) => {
      const cleaned = String(value || '').replace(/^SIMPRESPEG-/i, '').trim()
      setCode(cleaned)
      const found = resolveStaff(state, cleaned)
      if (found) {
        setStaff(found)
        setPesan('')
      } else {
        setStaff(null)
        setPesan('QR tidak dikenali. Pastikan kartu ID pegawai valid.')
      }
    },
  })

  const handleCari = (e) => {
    e?.preventDefault?.()
    const found = resolveStaff(state, code)
    if (!found) {
      setStaff(null)
      setPesan('Kode tidak ditemukan. Pastikan kode sesuai kartu ID pegawai.')
      return
    }
    setStaff(found)
    setPesan('')
  }

  // Validasi geofence: cek apakah koordinat terakhir dalam radius unit
  const cekGeofence = (koordinat) => {
    if (!unit || !unit.latitude || !unit.longitude) return { ok: true, detail: 'Koordinat unit belum diatur, dilewati.' }
    if (!koordinat || !koordinat.latitude || !koordinat.longitude) return { ok: false, detail: 'Koordinat GPS tidak tersedia.' }
    const R = 6371000
    const dLat = ((koordinat.latitude - unit.latitude) * Math.PI) / 180
    const dLon = ((koordinat.longitude - unit.longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((unit.latitude * Math.PI) / 180) *
        Math.cos((koordinat.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const jarak = R * c
    const radius = unit.radius_meter || 50
    return {
      ok: jarak <= radius,
      detail: `Jarak ${jarak.toFixed(0)} m dari titik presensi (radius ${radius} m)`,
      jarak,
    }
  }

  const handlePresensi = async (tipe) => {
    if (!staff || busy) return
    setBusy(true)
    try {
      const saat = new Date()
      const jam = jamDetik(saat)

      // Validasi geofence (gunakan koordinat dummy jika tidak ada GPS di kiosk)
      const geofenceHasil = cekGeofence({
        latitude: unit?.latitude,
        longitude: unit?.longitude,
      })
      if (!geofenceHasil.ok) {
        setPesan(`${geofenceHasil.detail}. Presensi tidak disimpan.`)
        setBusy(false)
        return
      }

      // Upload foto bukti wajah jika mode face dan kamera aktif
      let fotoUrl = null
      let bucketName = null
      if (verifikasiMode === 'face' && kamera.videoRef?.current) {
        const uploadRes = await uploadAttendanceFacePhoto({
          staff,
          unitId: staff.unitId || unitId,
          type: tipe,
          imageSource: kamera.videoRef.current,
          detectionBox: null,
          date: saat,
        })
        if (uploadRes?.url) {
          fotoUrl = uploadRes.url
          bucketName = uploadRes.bucket
          setFacePhotoUrl(uploadRes.url)
        }
      }

      const presensiId = `${staff.id}-${saat.toISOString().slice(0, 10)}`

      if (tipe === 'masuk') {
        await syncAttendanceToSupabase({
          staff,
          unitId: staff.unitId || unitId,
          tanggal: saat,
          jamMasuk: jam,
          presensiId,
          status: 'Tepat Waktu',
          method: verifikasiMode === 'face' ? 'Face Recognition' : 'QR Code (Admin Kios)',
          faceSnapshotUrl: fotoUrl,
          faceSnapshotMasukUrl: fotoUrl,
          photoBucket: bucketName,
          coordinates: {
            latitude: unit?.latitude,
            longitude: unit?.longitude,
            distance: 0,
            outsideRadius: false,
          },
        })
        dispatch({ type: 'CHECK_IN', payload: { id: staff.id, masuk: jam, method: verifikasiMode === 'face' ? 'Face Recognition' : 'QR Code (Admin Kios)' } })
        setStaff({ ...staff, masuk: jam, method: verifikasiMode === 'face' ? 'Face Recognition' : 'QR Code (Admin Kios)' })
      } else {
        await syncAttendanceToSupabase({
          staff,
          unitId: staff.unitId || unitId,
          tanggal: saat,
          jamPulang: jam,
          presensiId,
          method: verifikasiMode === 'face' ? 'Face Recognition' : 'QR Code (Admin Kios)',
          faceSnapshotPulangUrl: fotoUrl,
          photoBucket: bucketName,
          coordinates: {
            latitude: unit?.latitude,
            longitude: unit?.longitude,
            distance: 0,
            outsideRadius: false,
          },
        })
        dispatch({ type: 'CHECK_OUT', payload: { id: staff.id, pulang: jam, method: verifikasiMode === 'face' ? 'Face Recognition' : 'QR Code (Admin Kios)' } })
        setStaff({ ...staff, pulang: jam })
      }

      setPesan(
        tipe === 'masuk'
          ? `Presensi masuk ${staff.name} tercatat pukul ${jam}.`
          : `Presensi pulang ${staff.name} tercatat pukul ${jam}.`,
      )
    } catch (err) {
      console.error('[AdminKiosk] Gagal menyimpan presensi:', err)
      setPesan('Gagal menyimpan presensi. Silakan coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const sudahMasuk = Boolean(staff?.masuk)
  const sudahPulang = Boolean(staff?.pulang)

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg w-full min-w-0">
      <div>
        <h1 className="text-xl font-bold text-foreground">Scan Presensi (Kios Admin)</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Pindai atau ketik kode QR/Barcode pada kartu ID pegawai untuk mencatat presensi masuk/pulang dari perangkat sekolah.
        </p>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Scan Kamera</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFacing('user')}
              className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border ${
                facing === 'user'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-foreground border-border hover:bg-muted/80'
              }`}
            >
              Kamera Depan
            </button>
            <button
              type="button"
              onClick={() => setFacing('environment')}
              className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border ${
                facing === 'environment'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-foreground border-border hover:bg-muted/80'
              }`}
            >
              Kamera Belakang
            </button>
            <span className="text-[11px] text-muted-foreground">
              {kamera.status === 'aktif' ? 'Kamera aktif' : kamera.status === 'ditolak' ? 'Kamera tidak dapat diakses' : 'Memuat kamera...'}
            </span>
          </div>
        </div>

        {/* Pemilih verifikasi: QR atau Face */}
        <div className="flex gap-1 p-1 bg-slate-100/80 rounded-xl mb-2">
          <button
            type="button"
            onClick={() => setVerifikasiMode('qr')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              verifikasiMode === 'qr' ? 'bg-white text-[#323d8f] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            QR / Barcode
          </button>
          <button
            type="button"
            onClick={() => setVerifikasiMode('face')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              verifikasiMode === 'face' ? 'bg-white text-[#323d8f] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Wajah
          </button>
        </div>

        <div className="flex justify-center">
          <video
            ref={kamera.videoRef}
            className="w-full max-w-[320px] rounded-lg bg-black/80"
            autoPlay
            playsInline
            muted
          />
        </div>
        {kamera.status === 'ditolak' && (
          <p className="text-[11px] text-destructive">
            {kamera.error || 'Kamera tidak dapat diakses.'} Gunakan input manual di bawah.
          </p>
        )}
        {!kamera.supportsDetector && kamera.status === 'aktif' && verifikasiMode === 'qr' && (
          <p className="text-[11px] text-muted-foreground">
            Peramban ini tidak mendukung pembacaan QR otomatis. Gunakan input manual.
          </p>
        )}
        {verifikasiMode === 'face' && facePhotoUrl && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            Foto bukti presensi tercatat
          </p>
        )}
      </div>

      <form onSubmit={handleCari} className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-lg bg-card border border-input">
          <span className="text-xs text-muted-foreground font-mono">{CARD_QR_PREFIX}</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="NIY pegawai"
            className="flex-1 h-full bg-transparent outline-none text-xs text-foreground"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
        >
          Cari Pegawai
        </button>
      </form>

      {pesan && (
        <div className={`px-3.5 py-2 border border-border rounded-lg text-xs ${
          pesan.startsWith('Gagal') || pesan.includes('tidak disimpan') ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-muted/40 text-foreground border-border'
        }`}>
          {pesan}
        </div>
      )}

      {staff && (
        <div className="p-4 bg-card rounded-xl border border-border flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm overflow-hidden">
              {initialsForCard(staff.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{staff.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                NIY {staff.niy} &middot; {staff.role} &middot; {staff.unitId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 bg-muted/40 rounded-lg">
              <span className="block text-[11px] text-muted-foreground">Jam Masuk</span>
              <span className="font-semibold text-foreground">{staff.masuk || 'Belum presensi'}</span>
            </div>
            <div className="p-2.5 bg-muted/40 rounded-lg">
              <span className="block text-[11px] text-muted-foreground">Jam Pulang</span>
              <span className="font-semibold text-foreground">{staff.pulang || 'Belum pulang'}</span>
            </div>
          </div>

          {unit && (
            <div className="p-2.5 bg-[#eef0fc] rounded-lg border border-[#d9dff5] text-xs">
              <span className="block text-[11px] text-[#323d8f] font-medium">Unit: {unit.nama}</span>
              <span className="block text-[10px] text-[#77819a]">Radius: {unit.radius_meter}m</span>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => handlePresensi('masuk')}
              disabled={busy || sudahMasuk}
              className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Presensi Masuk
            </button>
            <button
              type="button"
              onClick={() => handlePresensi('pulang')}
              disabled={busy || !sudahMasuk || sudahPulang}
              className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Presensi Pulang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPresensiScanPage
