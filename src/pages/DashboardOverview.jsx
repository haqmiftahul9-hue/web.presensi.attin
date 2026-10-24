import { useEffect, useState } from 'react'
import { useSimPres, selectCurrentUser, selectCurrentUserRole, selectActiveUnitLabel, selectIsAllUnits } from '../store/simPresStore.jsx'
import DashboardNav from '../components-dashboard/DashboardNav.jsx'
import StatCards from '../components-dashboard/StatCards.jsx'
import WeeklyTrend from '../components-dashboard/WeeklyTrend.jsx'
import UnitSummary from '../components-dashboard/UnitSummary.jsx'
import LiveAttendanceTable from '../components-dashboard/LiveAttendanceTable.jsx'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function useLiveClock(zonaWaktu) {
  const [liveTime, setLiveTime] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setLiveTime(`${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()} • ${hh}:${mm} ${zonaWaktu || 'WIB'}`)
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [zonaWaktu])
  return liveTime
}

function TopBar({ onBukaMenu }) {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const settings = state.settings
  return (
    <header className="sp-portal-header sticky top-0 z-40 flex items-center justify-between gap-3 bg-card/95 backdrop-blur-md border-b border-border px-4 md:px-6 pt-safe shadow-xs">
      <div className="flex items-center gap-2.5 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onBukaMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground/70 hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">search</span>
          <input
            aria-label="Cari pegawai, NIY, atau data presensi"
            className="w-full h-9 pl-9 pr-12 bg-card border border-input hover:border-primary/60 focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20 rounded-lg text-xs md:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all"
            placeholder="Cari pegawai, NIY, atau data presensi..."
            type="search"
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded shadow-2xs pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground/70 hover:bg-accent hover:text-foreground transition-all cursor-pointer"
          title="Notifikasi sistem"
        >
          <span className="material-symbols-outlined text-[19px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 px-2 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors">
          {settings.logo ? (
            <img src={settings.logo} alt={settings.namaAplikasi || 'SimPres'} className="w-7 h-7 rounded-md object-cover border border-border shadow-2xs" />
          ) : (
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/icons/logo-simpeg.png" alt="SIMPEG" className="w-7 h-7 object-contain" />
            </div>
          )}
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight">{settings.namaAplikasi || 'SimPres'}</span>
            <span className="text-[11px] font-medium text-muted-foreground leading-tight">
              {selectIsAllUnits(state) ? (settings.namaYayasan || 'Yayasan Pendidikan') : selectActiveUnitLabel(state)}
            </span>
          </div>
        </div>
      </div>

      <span className="sr-only">{currentUser?.name || ''}</span>
    </header>
  )
}

/**
 * Dashboard Overview — sidebar vertikal di kiri + area konten utama mengisi
 * sisa viewport.
 */
function DashboardOverview() {
  const { state } = useSimPres()
  const currentRole = selectCurrentUserRole(state)
  const settings = state.settings
  const liveTime = useLiveClock(settings.zonaWaktu)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-clip">
      <DashboardNav open={drawerOpen} onTutup={() => setDrawerOpen(false)} />

      {drawerOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <div className="lg:pl-[260px] flex flex-col min-h-[100dvh]">
        <TopBar onBukaMenu={() => setDrawerOpen(true)} />

        <main className="w-full flex-1">
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto animate-sp-rise">
            {/* Judul halaman */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-border">
              <div className="flex items-center gap-3">
<div className="w-11 h-11 flex items-center justify-center">
  {settings.logo ? (
    <img src={settings.logo} alt={settings.namaAplikasi} className="w-11 h-11 object-contain" />
  ) : (
    <img src="/icons/logo-simpeg.png" alt="SIMPEG" className="w-11 h-11 object-contain" />
  )}
</div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                      {settings.namaAplikasi || 'SimPres'}
                    </h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Overview
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {settings.tagline || 'Sistem Informasi Presensi Multi-Unit Sekolah'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs text-foreground font-medium">
                  <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                  <span>{selectIsAllUnits(state) ? 'Semua Unit Sekolah' : selectActiveUnitLabel(state)}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-foreground">{liveTime || 'Memuat waktu...'}</span>
                </div>
              </div>
            </div>

            <StatCards />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <WeeklyTrend />
              </div>
              <div className="lg:col-span-5">
                <UnitSummary />
              </div>
            </div>

            <LiveAttendanceTable />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardOverview

