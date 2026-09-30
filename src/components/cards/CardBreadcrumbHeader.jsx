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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
      <div className="flex flex-col">
        {/* flex-wrap: di layar sempit breadcrumb turun ke baris berikutnya
            alih-alih memicu scroll horizontal seluruh halaman. */}
        <nav className="flex flex-wrap items-center gap-x-space-xs gap-y-0.5 text-on-surface-variant font-label-sm text-label-sm mb-1">
          <span>Home</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>Master Data</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>Data Guru/Pegawai</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-body-sm-medium text-body-sm-medium">Cetak Kartu ID</span>
        </nav>
        <div className="flex items-center gap-space-xs">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Cetak Kartu ID Pegawai</h1>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          {isSuperadmin
            ? 'Terbitkan kartu identitas CR80 ber-QR Code untuk seluruh pegawai yayasan'
            : 'Terbitkan kartu identitas CR80 ber-QR Code untuk pegawai unit Anda'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-space-xs">
        <div className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span className="material-symbols-outlined text-[18px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Total Pegawai</span>
            <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">{stats.total} Orang</span>
          </div>
        </div>
        <div className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Kartu Terbit</span>
            <span className="font-headline-sm text-headline-sm text-emerald-600 leading-tight">
              {stats.total - stats.belumPernahDicetak} Kartu
            </span>
          </div>
        </div>
        <div className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-[18px]">event_busy</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Kadaluwarsa</span>
            <span className="font-headline-sm text-headline-sm text-amber-600 leading-tight">
              {stats.kadaluwarsa} Kartu
            </span>
          </div>
        </div>
        <div className="px-space-md py-space-xs rounded-lg bg-secondary-container text-on-secondary shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">checklist</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-secondary/80 uppercase">Terpilih</span>
            <span className="font-headline-sm text-headline-sm text-white leading-tight">{selectedCount} Kartu</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardBreadcrumbHeader
