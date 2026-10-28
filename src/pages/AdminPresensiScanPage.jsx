import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { cardQrValue, CARD_QR_PREFIX, initialsForCard } from '../data/employeeCard.js'
import { jamDetik } from '../data/presensiMobile.js'
import { calculateAttendanceStatus } from '../data/jamKerja.js'
import { useDeviceCamera } from '../hooks/useDeviceCamera.js'

function resolveStaff(state, code) {
  const trimmed = String(code || '').trim().toUpperCase()
  if (!trimmed) return null
  const full = trimmed.startsWith(CARD_QR_PREFIX) ? trimmed : `${CARD_QR_PREFIX}${trimmed}`
  return state.staff.find((s) => {
    const qr = String(cardQrValue(s) || '').toUpperCase()
    return qr === full || String(s.niy || '').toUpperCase() === trimmed
  }) || null
}

function AdminPresensiScanPage() {
  const { state, dispatch } = useSimPres()
  const [code, setCode] = useState('')
  const [staff, setStaff] = useState(null)
  const [pesan, setPesan] = useState('')
  const [busy, setBusy] = useState(false)

  const kamera = useDeviceCamera({
    facingMode: 'environment',
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

  const handlePresensi = async (tipe) => {
    if (!staff || busy) return
    setBusy(true)
    try {
      const saat = new Date()
      const jam = jamDetik(saat)
      if (tipe === 'masuk') {
        dispatch({ type: 'CHECK_IN', payload: { id: staff.id, masuk: jam, method: 'QR Code (Admin Kios)' } })
        setStaff({ ...staff, masuk: jam, method: 'QR Code (Admin Kios)' })
      } else {
        dispatch({ type: 'CHECK_OUT', payload: { id: staff.id, pulang: jam, method: 'QR Code (Admin Kios)' } })
        setStaff({ ...staff, pulang: jam })
      }
      setPesan(
        tipe === 'masuk'
          ? `Presensi masuk ${staff.name} tercatat pukul ${jam}.`
          : `Presensi pulang ${staff.name} tercatat pukul ${jam}.`,
      )
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
          <h2 className="text-sm font-bold text-foreground">Scan Kamera (QR Kartu ID)</h2>
          <span className="text-[11px] text-muted-foreground">
            {kamera.status === 'aktif' ? 'Kamera aktif' : kamera.status === 'ditolak' ? 'Kamera tidak dapat diakses' : 'Memuat kamera...'}
          </span>
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
        {!kamera.supportsDetector && kamera.status === 'aktif' && (
          <p className="text-[11px] text-muted-foreground">
            Peramban ini tidak mendukung pembacaan QR otomatis. Gunakan input manual.
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
        <div className="px-3.5 py-2 bg-muted/40 border border-border rounded-lg text-xs text-foreground">
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