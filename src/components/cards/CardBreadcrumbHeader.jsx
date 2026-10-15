import {
  useSimPres, selectScopedStaff, selectCurrentUserRole, ROLE_SUPERADMIN,
} from '../../store/simPresStore.jsx'

/**
 * Header halaman Cetak Kartu ID: breadcrumb, judul, dan ringkasan angka.
 * Angka mengikuti cakupan unit yang sedang aktif, jadi Guru/Pegawai unit lain
 * tidak pernah terlihat di sini.
 */
function CardBreadcrumbHeader({ summary, selectedCount }) {
  const { state } = useSimPres()
  const total = selectScopedStaff(state).length
  const role = selectCurrentUserRole(state)
  const isSuperadmin = role === ROLE_SUPERADMIN
  const stats = summary || { total, aktif: total }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 flex-wrap">
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Master Data</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Data Guru/Pegawai</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-blue-600 font-semibold">Cetak Kartu ID</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] leading-none">badge</span>
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Cetak Kartu ID Pegawai</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isSuperadmin
            ? 'Terbitkan kartu identitas CR80 ber-QR Code untuk seluruh pegawai yayasan'
            : 'Terbitkan kartu identitas CR80 ber-QR Code untuk pegawai unit Anda'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-[18px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Pegawai</span>
            <span className="text-sm font-bold text-slate-900 leading-tight">{stats.total} Orang</span>
          </div>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kartu Terbit</span>
            <span className="text-sm font-bold text-emerald-600 leading-tight">
              {stats.total - stats.belumPernahDicetak} Kartu
            </span>
          </div>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-[18px]">event_busy</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kadaluwarsa</span>
            <span className="text-sm font-bold text-amber-600 leading-tight">
              {stats.kadaluwarsa} Kartu
            </span>
          </div>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-200/80 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">checklist</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Terpilih</span>
            <span className="text-sm font-bold text-blue-900 leading-tight">{selectedCount} Kartu</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardBreadcrumbHeader
