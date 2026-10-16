import { useState, useEffect } from 'react'
import { useSimPres, selectCurrentUser, selectCurrentUserRole, selectActiveUnitLabel, selectIsAllUnits } from '../store/simPresStore.jsx'
import Header from '../components/Header.jsx'
import StatCards from '../components-dashboard/StatCards.jsx'
import WeeklyTrend from '../components-dashboard/WeeklyTrend.jsx'
import UnitSummary from '../components-dashboard/UnitSummary.jsx'
import RecentActivity from '../components-dashboard/RecentActivity.jsx'

function DashboardPage() {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const settings = state.settings
  
  const [liveTime, setLiveTime] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      const dayName = days[now.getDay()]
      const day = now.getDate()
      const monthName = months[now.getMonth()]
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const zonaWaktu = settings.zonaWaktu || 'WIB'
      setLiveTime(`${dayName}, ${day} ${monthName} ${year} • ${hours}:${mins} ${zonaWaktu}`)
    }
    updateClock()
    const timer = setInterval(updateClock, 60000)
    return () => clearInterval(timer)
  }, [settings.zonaWaktu])

  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.namaAplikasi} className="w-11 h-11 rounded-xl object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px]">space_dashboard</span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                  {settings.namaAplikasi || 'SimPres'}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {currentRole}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {settings.tagline || 'Sistem Informasi Presensi Multi-Unit Sekolah'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Unit Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs text-foreground font-medium">
              <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
              <span>{selectIsAllUnits(state) ? 'Semua Unit Sekolah' : selectActiveUnitLabel(state)}</span>
            </div>

            {/* Live Clock & Sync */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border shadow-2xs text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-foreground">{liveTime || 'Memuat waktu...'}</span>
            </div>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <StatCards />

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <WeeklyTrend />
          </div>
          <div className="lg:col-span-5">
            <UnitSummary />
          </div>
        </div>

        {/* Recent Activity Table */}
        <RecentActivity />
      </div>
    </div>
  )
}

export default DashboardPage