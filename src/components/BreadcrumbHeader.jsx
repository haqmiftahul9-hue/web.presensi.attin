import { useSimPres, selectTotalPegawai } from '../store/simPresStore.jsx'

function BreadcrumbHeader() {
  const { state } = useSimPres()
  const total = state.staff.length
  const aktif = selectTotalPegawai(state)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
      <div className="flex flex-col">
        <nav className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm mb-1">
          <a className="hover:text-secondary transition-colors" href="#">Home</a>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>Master Data</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-body-sm-medium text-body-sm-medium">Data Guru/Pegawai</span>
        </nav>
        <div className="flex items-center gap-space-xs">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Data Guru/Pegawai</h1>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Kelola direktori pendidik dan tenaga kependidikan terdaftar lintas unit sekolah
        </p>
      </div>
      <div className="flex items-center gap-space-xs">
        <div className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span className="material-symbols-outlined text-[18px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm font-label-sm text-on-surface-variant uppercase">Total Guru & Pegawai</span>
            <span className="font-headline-lg text-headline-lg text-on-surface leading-none">{total} Orang</span>
          </div>
        </div>
        <div className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm font-label-sm text-on-surface-variant uppercase">Status Aktif</span>
            <span className="font-headline-lg text-headline-lg text-emerald-600 leading-none">{aktif} Staf</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BreadcrumbHeader
