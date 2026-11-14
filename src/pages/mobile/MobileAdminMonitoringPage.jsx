import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectScopedStaff, selectUnitById, selectSelfStaff,
  selectCurrentUserRole, ROLE_SUPERADMIN, ALL_UNITS,
} from '../../store/simPresStore.jsx'
import { tanggalPanjang, jamPendek } from '../../data/presensiMobile.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { LoadingState } from '../../components/mobile/Feedback.jsx'

export default function MobileAdminMonitoringPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const selfStaff = state ? selectSelfStaff(state) : null
  const currentUserRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentUserRole === ROLE_SUPERADMIN

  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'hadir' | 'terlambat' | 'izin' | 'belum'

  const userUnitId = selfStaff?.unitId || state?.currentUser?.unitId || (state?.units?.[0]?.id ?? 'sd')
  const unit = state ? selectUnitById(state, userUnitId) : null

  // Pegawai dalam cakupan unit (atau semua unit jika superadmin)
  const scopedStaff = useMemo(() => {
    if (!state) return []
    if (isSuperadmin) return state.staff || []
    return (state.staff || []).filter((s) => s.unitId === userUnitId && s.status === 'Aktif')
  }, [state, isSuperadmin, userUnitId])

  // Evaluasi status kehadiran hari ini per pegawai
  const enrichedStaff = useMemo(() => {
    return scopedStaff.map((s) => {
      const masuk = s.masuk ? jamPendek(s.masuk) : null
      const pulang = s.pulang ? jamPendek(s.pulang) : null
      const isLate = Number(s.lateMinutes || 0) > 0
      const isAlpha = Boolean(s.alpha)
      
      // Cek apakah ada izin/cuti disetujui hari ini
      const hasApprovedLeave = (state?.leaves || []).some(
        (l) => l.staffId === s.id && l.status === 'Disetujui'
      )

      let statusCategory = 'belum'
      let statusLabel = 'Belum Hadir'
      let statusColor = 'bg-slate-100 text-slate-700 border-slate-200'

      if (hasApprovedLeave) {
        statusCategory = 'izin'
        statusLabel = 'Izin / Cuti'
        statusColor = 'bg-blue-100 text-blue-700 border-blue-200'
      } else if (masuk) {
        if (isLate) {
          statusCategory = 'terlambat'
          statusLabel = `Terlambat ${s.lateMinutes}m`
          statusColor = 'bg-amber-100 text-amber-800 border-amber-300'
        } else {
          statusCategory = 'hadir'
          statusLabel = 'Tepat Waktu'
          statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'
        }
      } else if (isAlpha) {
        statusCategory = 'belum'
        statusLabel = 'Tanpa Keterangan'
        statusColor = 'bg-rose-100 text-rose-700 border-rose-200'
      }

      return {
        ...s,
        masuk,
        pulang,
        isLate,
        statusCategory,
        statusLabel,
        statusColor,
      }
    })
  }, [scopedStaff, state?.leaves])

  // Statistik KPI ringkas
  const kpi = useMemo(() => {
    const total = enrichedStaff.length
    const hadir = enrichedStaff.filter((s) => s.statusCategory === 'hadir').length
    const terlambat = enrichedStaff.filter((s) => s.statusCategory === 'terlambat').length
    const izin = enrichedStaff.filter((s) => s.statusCategory === 'izin').length
    const belum = enrichedStaff.filter((s) => s.statusCategory === 'belum').length
    return { total, hadir, terlambat, izin, belum }
  }, [enrichedStaff])

  // Filter daftar staf
  const filteredList = useMemo(() => {
    return enrichedStaff.filter((s) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.niy || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchFilter =
        activeFilter === 'all' ||
        (activeFilter === 'hadir' && (s.statusCategory === 'hadir' || s.statusCategory === 'terlambat')) ||
        (activeFilter === 'terlambat' && s.statusCategory === 'terlambat') ||
        (activeFilter === 'izin' && s.statusCategory === 'izin') ||
        (activeFilter === 'belum' && s.statusCategory === 'belum')

      return matchSearch && matchFilter
    })
  }, [enrichedStaff, searchTerm, activeFilter])

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Memuat Monitoring" detail="Mengambil data kehadiran unit…" />
      </div>
    )
  }

  const hariIni = new Date()

  return (
    <div className="sp-page pb-8">
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
              Monitoring Kehadiran
            </h1>
            <span className="font-label-sm text-label-sm text-[#77819a] truncate">
              {unit?.nama || 'Unit Sekolah'} • {tanggalPanjang(hariIni)}
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 flex flex-col gap-3.5">
        {/* 2. Grid KPI Ringkas */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-white border border-[#e0e6f2] p-2.5 flex flex-col items-center justify-center shadow-2xs">
            <span className="font-label-sm text-[11px] text-[#77819a] font-medium">Total</span>
            <span className="font-display-lg text-[20px] font-bold text-[#20243a] leading-tight">{kpi.total}</span>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 flex flex-col items-center justify-center shadow-2xs">
            <span className="font-label-sm text-[11px] text-emerald-700 font-medium">Hadir</span>
            <span className="font-display-lg text-[20px] font-bold text-emerald-800 leading-tight">{kpi.hadir}</span>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 flex flex-col items-center justify-center shadow-2xs">
            <span className="font-label-sm text-[11px] text-amber-700 font-medium">Telat</span>
            <span className="font-display-lg text-[20px] font-bold text-amber-800 leading-tight">{kpi.terlambat}</span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 flex flex-col items-center justify-center shadow-2xs">
            <span className="font-label-sm text-[11px] text-slate-600 font-medium">Belum</span>
            <span className="font-display-lg text-[20px] font-bold text-slate-800 leading-tight">{kpi.belum}</span>
          </div>
        </div>

        {/* 3. Search & Filter Bar */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
            <input
              type="text"
              placeholder="Cari nama guru / NIY…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#e0e6f2] text-xs text-[#20243a] placeholder:text-slate-400 focus:outline-none focus:border-[#323d8f] focus:ring-2 focus:ring-[#323d8f]/20 shadow-2xs transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: `Semua (${kpi.total})` },
              { id: 'hadir', label: `Hadir (${kpi.hadir + kpi.terlambat})` },
              { id: 'terlambat', label: `Terlambat (${kpi.terlambat})` },
              { id: 'izin', label: `Izin/Cuti (${kpi.izin})` },
              { id: 'belum', label: `Belum (${kpi.belum})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full font-label-sm text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeFilter === tab.id
                    ? 'bg-[#323d8f] text-white shadow-2xs'
                    : 'bg-white text-[#77819a] border border-[#e0e6f2] hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Daftar Staf */}
        <div className="flex flex-col gap-2">
          {filteredList.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#e0e6f2] p-8 text-center flex flex-col items-center justify-center gap-2">
              <Icon name="person_search" className="text-slate-300 text-[32px]" />
              <p className="font-label-md text-slate-600 font-semibold">Tidak ada data pegawai</p>
              <p className="text-xs text-slate-400">Tidak ada pegawai yang cocok dengan filter atau kata kunci ini.</p>
            </div>
          ) : (
            filteredList.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl bg-white border border-[#e0e6f2] p-3 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <StaffAvatar
                    staff={s}
                    size="w-10 h-10"
                    textClass="font-label-sm text-xs font-bold"
                    ring="ring-1 ring-slate-200"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-label-md text-xs font-bold text-[#20243a] truncate">
                      {s.name}
                    </span>
                    <span className="font-label-sm text-[11px] text-[#77819a] truncate">
                      {s.role || 'Guru/Pegawai'} • NIY {s.niy}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold border ${s.statusColor}`}>
                    {s.statusLabel}
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                    {s.masuk ? `Masuk: ${s.masuk}` : 'Belum absen'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
