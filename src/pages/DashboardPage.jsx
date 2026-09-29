import { useState, useEffect } from 'react'
import { useSimPres, selectCurrentUser, selectCurrentUserRole } from '../store/simPresStore.jsx'
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
    <div className="flex flex-col w-full">
      <div className="px-space-lg py-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.namaAplikasi} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[24px]">space_dashboard</span>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-snug">{settings.namaAplikasi || 'SimPres'}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{settings.tagline || 'Sistem Informasi Presensi Multi-Unit Sekolah'}</p>
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
              <span className="font-body-md-medium text-body-md-medium">Assalamualaikum, {currentRole}.</span> Selamat datang di {settings.namaAplikasi || 'SimPres'} — {settings.tagline || 'Sistem Informasi Presensi Multi-Unit Sekolah'}.
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
              <span className="font-body-sm text-body-sm">{liveTime || '...'}</span>
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

export default DashboardPage