import { useSimPres, selectTotalPegawai, selectScopedStaff } from '../store/simPresStore.jsx'

function BreadcrumbHeader() {
  const { state } = useSimPres()
  // Angka mengikuti unit terpilih, bukan seluruh sekolah.
  const total = selectScopedStaff(state).length
  const aktif = selectTotalPegawai(state)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-border">
      <div className="flex flex-col">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="hover:text-foreground transition-colors">Home</span>
          <span className="material-symbols-outlined text-[13px] text-muted-foreground/60">chevron_right</span>
          <span>Master Data</span>
          <span className="material-symbols-outlined text-[13px] text-muted-foreground/60">chevron_right</span>
          <span className="text-foreground font-semibold">Data Guru/Pegawai</span>
        </nav>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            Data Guru & Pegawai
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Kelola direktori pendidik dan tenaga kependidikan terdaftar lintas unit sekolah
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start md:self-auto">
        <div className="px-3.5 py-2 rounded-xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Guru & Staf</span>
            <span className="text-sm font-bold text-foreground leading-tight">{total} Orang</span>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-card border border-border shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Aktif</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{aktif} Staf</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreadcrumbHeader
