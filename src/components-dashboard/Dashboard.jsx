import StatCards from './StatCards.jsx'
import WeeklyTrend from './WeeklyTrend.jsx'
import UnitSummary from './UnitSummary.jsx'
import RecentActivity from './RecentActivity.jsx'

function Dashboard() {
  return (
    <div className="flex flex-col w-full">
      <div className="px-space-lg py-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">space_dashboard</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-snug">Dashboard</h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Pantau data presensi dan aktivitas pegawai multi-unit secara real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs self-start md:self-auto bg-surface-container-lowest px-space-md py-space-xs rounded-full shadow-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span className="font-body-sm text-body-sm">Home</span>
            <span className="text-outline font-body-sm text-body-sm">/</span>
            <span className="font-body-sm text-body-sm">Superadmin</span>
            <span className="text-outline font-body-sm text-body-sm">/</span>
            <span className="font-body-sm-medium text-body-sm-medium text-secondary">Dashboard</span>
          </div>
        </div>

        <div className="bg-secondary-fixed/30 rounded-xl p-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm shadow-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div className="font-body-md text-body-md text-on-primary-fixed">
              <span className="font-body-md-medium text-body-md-medium">Assalamualaikum, Super Admin.</span> Selamat datang di SimPres — Sistem Informasi Presensi Multi-Unit Sekolah.
            </div>
          </div>
          <div className="flex items-center gap-space-md text-on-surface-variant self-end lg:self-auto">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Sinkronisasi Otomatis Aktif</span>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Selasa, 15 September 2026 • 13:15 WIB</span>
            </div>
          </div>
        </div>

        <StatCards />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-7">
            <WeeklyTrend />
          </div>
          <div className="lg:col-span-5">
            <UnitSummary />
          </div>
        </div>

        <RecentActivity />
      </div>
    </div>
  )
}

export default Dashboard