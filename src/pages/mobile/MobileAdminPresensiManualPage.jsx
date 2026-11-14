import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectScopedStaff, selectSelfStaff, addActivityLog,
  selectCurrentUserRole, ROLE_SUPERADMIN,
} from '../../store/simPresStore.jsx'
import { jamMenitDariDate } from '../../data/presensiMobile.js'
import { LoadingState } from '../../components/mobile/Feedback.jsx'

export default function MobileAdminPresensiManualPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const navigate = useNavigate()

  const selfStaff = state ? selectSelfStaff(state) : null
  const currentUserRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentUserRole === ROLE_SUPERADMIN

  const userUnitId = selfStaff?.unitId || state?.currentUser?.unitId || 'sd'

  const scopedStaff = useMemo(() => {
    if (!state) return []
    if (isSuperadmin) return state.staff || []
    return (state.staff || []).filter((s) => s.unitId === userUnitId && s.status === 'Aktif')
  }, [state, isSuperadmin, userUnitId])

  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10))
  const [statusKehadiran, setStatusKehadiran] = useState('Hadir')
  const [jamMasuk, setJamMasuk] = useState(() => jamMenitDariDate(new Date()))
  const [jamPulang, setJamPulang] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [pesan, setPesan] = useState('')
  const [pesanTipe, setPesanTipe] = useState('info')
  const [busy, setBusy] = useState(false)

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Memuat Form" detail="Menyiapkan data presensi manual…" />
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedStaffId) {
      setPesan('Pilih pegawai terlebih dahulu.')
      setPesanTipe('error')
      return
    }

    const staff = state.staff.find((s) => s.id === Number(selectedStaffId))
    if (!staff) {
      setPesan('Pegawai tidak ditemukan.')
      setPesanTipe('error')
      return
    }

    setBusy(true)
    try {
      const updates = {
        id: staff.id,
        masuk: jamMasuk || staff.masuk || '07:15',
        pulang: jamPulang || staff.pulang || null,
        method: 'Manual (Admin Mobile)',
      }

      if (statusKehadiran === 'Terlambat') {
        updates.lateMinutes = 15
      } else if (statusKehadiran === 'Izin' || statusKehadiran === 'Sakit' || statusKehadiran === 'Cuti') {
        // Tambahkan ke leaves
        dispatch({
          type: 'ADD_LEAVE',
          payload: {
            id: Date.now(),
            staffId: staff.id,
            jenis: statusKehadiran,
            tanggalMulai: tanggal,
            tanggalSelesai: tanggal,
            durasi: '1 hari',
            alasan: keterangan || `Input manual oleh admin: ${statusKehadiran}`,
            status: 'Disetujui',
            createdAt: new Date().toISOString(),
          },
        })
      }

      dispatch({ type: 'UPDATE_STAFF', payload: updates })

      addActivityLog(
        dispatch,
        state,
        'Presensi Manual',
        `Pegawai • ${staff.name}`,
        `Input manual presensi (${statusKehadiran}) untuk ${staff.name} pada ${tanggal}`,
        null,
        null,
        staff.unitId
      )

      setPesan(`Presensi ${staff.name} berhasil disimpan.`)
      setPesanTipe('success')
      setTimeout(() => {
        navigate('/mobile/admin-monitoring')
      }, 1200)
    } catch (err) {
      console.error(err)
      setPesan('Gagal menyimpan presensi manual.')
      setPesanTipe('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sp-page pb-12">
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
              Input Presensi Manual
            </h1>
            <span className="font-label-sm text-label-sm text-[#77819a] truncate">
              Catat presensi staf yang berhalangan menggunakan HP
            </span>
          </div>
        </div>
      </section>

      <div className="px-4">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-[#e0e6f2] p-4 shadow-sm flex flex-col gap-4">
          {pesan && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                pesanTipe === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <Icon name={pesanTipe === 'success' ? 'check_circle' : 'error'} className="text-[16px] shrink-0" />
              <span>{pesan}</span>
            </div>
          )}

          {/* 1. Pilih Pegawai */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#20243a]">
              Pilih Guru / Pegawai <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] focus:ring-2 focus:ring-[#323d8f]/20 shadow-2xs"
              required
            >
              <option value="">-- Pilih Pegawai --</option>
              {scopedStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.niy}) - {s.role}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Tanggal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#20243a]">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] shadow-2xs"
            />
          </div>

          {/* 3. Status Kehadiran */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#20243a]">Status Presensi</label>
            <select
              value={statusKehadiran}
              onChange={(e) => setStatusKehadiran(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] shadow-2xs"
            >
              <option value="Hadir">Hadir (Tepat Waktu)</option>
              <option value="Terlambat">Hadir Terlambat</option>
              <option value="Dinas Luar">Dinas Luar</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Cuti">Cuti</option>
            </select>
          </div>

          {/* 4. Jam Masuk & Jam Pulang */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#20243a]">Jam Masuk</label>
              <input
                type="text"
                placeholder="07:15"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] shadow-2xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#20243a]">Jam Pulang</label>
              <input
                type="text"
                placeholder="16:00 (opsional)"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] shadow-2xs"
              />
            </div>
          </div>

          {/* 5. Catatan / Alasan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#20243a]">Keterangan / Alasan</label>
            <textarea
              rows={2}
              placeholder="Contoh: Terkendala sinyal GPS / handphone rusak"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#f8fafc] border border-[#e0e6f2] text-xs text-[#20243a] focus:outline-none focus:border-[#323d8f] shadow-2xs resize-none"
            />
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 py-3 rounded-xl bg-[#323d8f] hover:bg-[#283273] text-white font-label-md text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
          >
            <Icon name="save" className="text-[18px]" />
            <span>{busy ? 'Menyimpan…' : 'Simpan Presensi Manual'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
