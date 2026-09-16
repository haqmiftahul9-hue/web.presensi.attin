import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', activePath: '/' },
  { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', activePath: '/unit-sd-islam-rj' },
  { path: '/manajemen-admin-dan-user', label: 'Manajemen Admin & User', icon: 'manage_accounts', activePath: '/manajemen-admin-dan-user' },
  { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', activePath: '/data-guru-dan-pegawai' },
  { path: '/presensi', label: 'Presensi', icon: 'timer', activePath: '/presensi' },
  { path: '/rekap-dan-laporan', label: 'Rekap & Laporan', icon: 'summarize', activePath: '/rekap-dan-laporan' },
  { path: '/ranking-kehadiran', label: 'Ranking Kehadiran', icon: 'leaderboard', activePath: '/ranking-kehadiran' },
  { path: '/pengajuan-izin-dan-cuti', label: 'Pengajuan Izin/Cuti', icon: 'event_available', activePath: '/pengajuan-izin-dan-cuti' },
  { path: '/kalender-libur', label: 'Kalender Libur', icon: 'calendar_month', activePath: '/kalender-libur' },
  { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history', activePath: '/log-aktivitas' },
  { path: '/pengaturan-global', label: 'Pengaturan Global', icon: 'settings', activePath: '/pengaturan-global' },
]

function SidebarNav() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-primary-container z-50 flex flex-col justify-between overflow-y-auto">
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center justify-between bg-primary-container">
          <div className="flex items-center gap-space-xs">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary text-[20px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-primary tracking-tight leading-none">SimPres</span>
              <span className="font-label-sm text-label-sm text-on-primary-container leading-none mt-1">Multi-Unit System</span>
            </div>
          </div>
        </div>
        <div className="px-space-md py-space-xs">
          <div className="flex items-center justify-between px-space-sm py-space-xs rounded-lg bg-white/5">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-on-primary-container text-[18px]">domain</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-primary-container uppercase">Unit Terpilih</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate max-w-[120px]">Semua Unit (Pusat)</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-primary-container text-[18px]">expand_more</span>
          </div>
        </div>
        <div className="px-space-md pt-space-xs pb-space-2xs">
          <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider">Navigasi Utama</span>
        </div>
        <nav className="flex flex-col gap-1 px-space-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/10 text-on-primary font-body-md-medium'
                    : 'text-on-primary-container hover:bg-white/5 hover:text-on-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-space-md">
        <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-secondary text-[20px]">shield_person</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate">Superadmin Pusat</span>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">superadmin@simpres.sch.id</span>
          </div>
          <button className="text-on-primary-container hover:text-on-primary transition-colors p-1">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default SidebarNav