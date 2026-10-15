import { useSimPres, selectTotalPegawai, selectScopedStaff } from '../store/simPresStore.jsx'

function BreadcrumbHeader() {
  const { state } = useSimPres()
  // Angka mengikuti unit terpilih, bukan seluruh sekolah.
  const total = selectScopedStaff(state).length
  const aktif = selectTotalPegawai(state)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
      <div className="flex flex-col">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <span className="hover:text-slate-600 transition-colors">Home</span>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <span>Master Data</span>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <span className="text-slate-700 font-semibold">Data Guru/Pegawai</span>
        </nav>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            Data Guru & Pegawai
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Kelola direktori pendidik dan tenaga kependidikan terdaftar lintas unit sekolah
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start md:self-auto">
        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100/60 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined text-[18px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Guru & Staf</span>
            <span className="text-sm font-bold text-slate-900 leading-tight">{total} Orang</span>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Aktif</span>
            <span className="text-sm font-bold text-emerald-600 leading-tight">{aktif} Staf</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreadcrumbHeader
