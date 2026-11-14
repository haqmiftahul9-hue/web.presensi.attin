import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectUnitById, selectSelfStaff, addActivityLog,
} from '../../store/simPresStore.jsx'
import { cardQrValue, CARD_QR_PREFIX } from '../../data/employeeCard.js'
import { jamDetik } from '../../data/presensiMobile.js'
import { useDeviceCamera } from '../../hooks/useDeviceCamera.js'
import { syncAttendanceToSupabase } from '../../services/attendancePhotoService.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { LoadingState } from '../../components/mobile/Feedback.jsx'

function resolveStaff(state, code) {
  const trimmed = String(code || '').trim().toUpperCase()
  if (!trimmed) return null
  const full = trimmed.startsWith(CARD_QR_PREFIX) ? trimmed : `${CARD_QR_PREFIX}${trimmed}`
  return (
    state.staff.find((s) => {
      const qr = String(cardQrValue(s) || '').toUpperCase()
      return (
        qr === full ||
        String(s.niy || '').toUpperCase() === trimmed ||
        String(s.id) === trimmed
      )
    }) || null
  )
}

export default function MobileAdminScanPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null

  const [code, setCode] = useState('')
  const [staff, setStaff] = useState(null)
  const [pesan, setPesan] = useState('')
  const [pesanTipe, setPesanTipe] = useState('info') // 'info' | 'success' | 'error'
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState('environment')

  const kamera = useDeviceCamera({
    facingMode: facing,
    aktif: true,
    onQrValue: (value) => {
      const cleaned = String(value || '').replace(/^SIMPRESPEG-/i, '').trim()
      setCode(cleaned)
      if (state) {
        const found = resolveStaff(state, cleaned)
        if (found) {
          setStaff(found)
          setPesan(`Pegawai ditemukan: ${found.name}`)
          setPesanTipe('success')
        } else {
          setStaff(null)
          setPesan('QR/Barcode tidak dikenali.')
          setPesanTipe('error')
        }
      }
    },
  })

  const handleCariManual = (e) => {
    e?.preventDefault?.()
    if (!state) return
    const found = resolveStaff(state, code)
    if (!found) {
      setStaff(null)
      setPesan('Kode tidak ditemukan di data pegawai.')
      setPesanTipe('error')
      return
    }
    setStaff(found)
    setPesan(`Pegawai ditemukan: ${found.name}`)
    setPesanTipe('success')
  }

  const handlePresensi = async (tipe) => {
    if (!staff || busy || !dispatch) return
    setBusy(true)
    try {
      const saat = new Date()
      const jam = jamDetik(saat)
      const presensiId = `${staff.id}-${saat.toISOString().slice(0, 10)}`

      if (tipe === 'masuk') {
        try {
          await syncAttendanceToSupabase({
            staff,
            unitId: staff.unitId || 'sd',
            tanggal: saat,
            jamMasuk: jam,
            presensiId,
            status: 'Tepat Waktu',
            method: 'QR Code (Admin Mobile)',
            coordinates: { distance: 0, outsideRadius: false },
          })
        } catch {
          /* Abaikan galat sinkronisasi cloud */
        }

        dispatch({
          type: 'CHECK_IN',
          payload: { id: staff.id, masuk: jam, method: 'QR Code (Admin Mobile)' },
        })
        setStaff((prev) => ({ ...prev, masuk: jam, method: 'QR Code (Admin Mobile)' }))
        addActivityLog(
          dispatch,
          state,
          'Presensi Masuk',
          `Pegawai • ${staff.name}`,
          `Presensi masuk dicatat oleh admin pukul ${jam}`,
          null,
          null,
          staff.unitId
        )
        setPesan(`Presensi masuk ${staff.name} berhasil dicatat pukul ${jam}.`)
        setPesanTipe('success')
      } else {
        try {
          await syncAttendanceToSupabase({
            staff,
            unitId: staff.unitId || 'sd',
            tanggal: saat,
            jamPulang: jam,
            presensiId,
            method: 'QR Code (Admin Mobile)',
            coordinates: { distance: 0, outsideRadius: false },
          })
        } catch {
          /* Abaikan galat sinkronisasi cloud */
        }

        dispatch({
          type: 'CHECK_OUT',
          payload: { id: staff.id, pulang: jam, method: 'QR Code (Admin Mobile)' },
        })
        setStaff((prev) => ({ ...prev, pulang: jam }))
        addActivityLog(
          dispatch,
          state,
          'Presensi Pulang',
          `Pegawai • ${staff.name}`,
          `Presensi pulang dicatat oleh admin pukul ${jam}`,
          null,
          null,
          staff.unitId
        )
        setPesan(`Presensi pulang ${staff.name} berhasil dicatat pukul ${jam}.`)
        setPesanTipe('success')
      }
    } catch (err) {
      console.error(err)
      setPesan('Gagal menyimpan presensi. Silakan ulangi.')
      setPesanTipe('error')
    } finally {
      setBusy(false)
    }
  }

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Memuat Scanner" detail="Mempersiapkan kamera…" />
      </div>
    )
  }

  const sudahMasuk = Boolean(staff?.masuk)
  const sudahPulang = Boolean(staff?.pulang)

  return (
    <div className="sp-page pb-10">
      {/* 1. Header Bar */}
      <section className="sp-hero sp-page-container pt-3.5 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/mobile/home"
            className="w-8 h-8 rounded-xl bg-white border border-[#e0e6f2] flex items-center justify-center text-[#323d8f] shadow-2xs active:scale-95"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight truncate">
              Scan QR Presensi Pegawai
            </h1>
            <span className="font-label-sm text-label-sm text-[#77819a] truncate">
              Arahkan kamera ke QR/Barcode Kartu ID
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="w-8 h-8 rounded-xl bg-white border border-[#e0e6f2] flex items-center justify-center text-[#323d8f] shadow-2xs active:scale-95"
            title="Ganti Kamera"
          >
            <Icon name="flip_camera_ios" className="text-[18px]" />
          </button>
        </div>
      </section>

      <div className="px-4 flex flex-col gap-3.5">
        {/* 2. Jendela Kamera Scanner */}
        <div className="relative aspect-4/3 w-full bg-black rounded-2xl overflow-hidden shadow-md flex items-center justify-center">
          <video
            ref={kamera.videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Frame pembidik QR */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="w-48 h-48 border-2 border-dashed border-white/80 rounded-2xl relative shadow-2xl flex items-center justify-center">
              <span className="w-full h-0.5 bg-emerald-400 absolute shadow-sm animate-pulse" />
            </div>
          </div>

          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            {facing === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
          </span>
        </div>

        {/* Input Manual Kode / NIY */}
        <form onSubmit={handleCariManual} className="flex gap-2">
          <input
            type="text"
            placeholder="Atau ketik NIY pegawai…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl bg-white border border-[#e0e6f2] text-xs text-[#20243a] placeholder:text-slate-400 focus:outline-none focus:border-[#323d8f] shadow-2xs"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-[#323d8f] text-white font-label-md text-xs font-semibold shadow-2xs active:scale-95 transition-all"
          >
            Cari
          </button>
        </form>

        {/* Pesan status */}
        {pesan && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              pesanTipe === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : pesanTipe === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <Icon
              name={pesanTipe === 'success' ? 'check_circle' : pesanTipe === 'error' ? 'error' : 'info'}
              className="text-[16px] shrink-0"
            />
            <span className="flex-1">{pesan}</span>
          </div>
        )}

        {/* 3. Kartu Hasil Deteksi Staf & Tombol Aksi */}
        {staff && (
          <div className="rounded-2xl bg-white border border-[#323d8f]/30 p-4 shadow-sm flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <StaffAvatar
                staff={staff}
                size="w-12 h-12"
                textClass="font-headline-sm text-sm font-bold"
                ring="ring-2 ring-[#eef0fc]"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-headline-sm text-sm font-bold text-[#20243a] truncate">
                  {staff.name}
                </span>
                <span className="font-label-sm text-xs text-[#77819a] truncate">
                  {staff.role || 'Guru/Pegawai'} • NIY {staff.niy}
                </span>
                <span className="font-label-sm text-[11px] text-blue-600 font-medium">
                  {selectUnitById(state, staff.unitId)?.nama || '-'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 flex flex-col">
                <span className="text-[10px] text-slate-500">Jam Masuk</span>
                <span className="font-bold text-[#20243a]">{staff.masuk || '--:--'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 flex flex-col">
                <span className="text-[10px] text-slate-500">Jam Pulang</span>
                <span className="font-bold text-[#20243a]">{staff.pulang || '--:--'}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => handlePresensi('masuk')}
                className={`flex-1 py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                  sudahMasuk
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Icon name="login" className="text-[16px]" />
                <span>{sudahMasuk ? 'Update Masuk' : 'Presensi Masuk'}</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handlePresensi('pulang')}
                className={`flex-1 py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                  sudahPulang
                    ? 'bg-blue-100 text-[#323d8f] border border-blue-300'
                    : 'bg-[#323d8f] hover:bg-[#283273] text-white'
                }`}
              >
                <Icon name="logout" className="text-[16px]" />
                <span>{sudahPulang ? 'Update Pulang' : 'Presensi Pulang'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
