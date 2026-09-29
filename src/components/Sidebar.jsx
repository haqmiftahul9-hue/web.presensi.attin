import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  useSimPres, selectCurrentUser, selectCurrentUserRole, hasMenuPermission, MENU_OPTIONS,
  selectCanSwitchUnit, selectActiveUnitId, selectActiveUnitLabel, selectUnitOptionsById, ALL_UNITS,
} from '../store/simPresStore.jsx'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', activePath: '/', menuKey: 'dashboard' },
  { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', activePath: '/unit-sd-islam-rj', menuKey: 'manajemenUnit' },
  { path: '/manajemen-admin-user', label: 'Manajemen Admin & User', icon: 'manage_accounts', activePath: '/manajemen-admin-user', menuKey: 'manajemenAdminUser' },
  { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', activePath: '/data-guru-dan-pegawai', menuKey: 'dataGuruPegawai' },
  { path: '/presensi', label: 'Presensi', icon: 'timer', activePath: '/presensi', menuKey: 'presensi' },
  { path: '/rekap-dan-laporan', label: 'Rekap & Laporan', icon: 'summarize', activePath: '/rekap-dan-laporan', menuKey: 'rekapLaporan' },
  { path: '/ranking-kehadiran', label: 'Ranking Kehadiran', icon: 'leaderboard', activePath: '/ranking-kehadiran', menuKey: 'rankingKehadiran' },
  { path: '/pengajuan-izin-dan-cuti', label: 'Pengajuan Izin/Cuti', icon: 'event_available', activePath: '/pengajuan-izin-dan-cuti', menuKey: 'pengajuanIzinCuti' },
  { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history', activePath: '/log-aktivitas', menuKey: 'logAktivitas' },
  { path: '/pengaturan-global', label: 'Pengaturan Global', icon: 'settings', activePath: '/pengaturan-global', menuKey: 'pengaturanGlobal' },
]

function UnitScopeSelector() {
  const { state, dispatch } = useSimPres()
  const canSwitch = selectCanSwitchUnit(state)
  const activeUnitId = selectActiveUnitId(state)
  const activeLabel = selectActiveUnitLabel(state)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const options = selectUnitOptionsById(state)
  const label = canSwitch ? activeLabel : (activeLabel === 'Semua Unit' ? 'Semua Unit' : activeLabel)

  return (
    <div className="px-space-md py-space-xs">
      <div className="relative" ref={ref}>
        {canSwitch ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-space-sm py-space-xs rounded-lg bg-white/5 text-left"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-on-primary-container text-[18px]">domain</span>
              <span className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-primary-container uppercase">Unit Terpilih</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate max-w-[120px]">{label}</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-on-primary-container text-[18px]">expand_more</span>
          </button>
        ) : (
          // Role selain Superadmin: unit terkunci ke akunnya, tanpa selector.
          <div className="flex items-center justify-between px-space-sm py-space-xs rounded-lg bg-white/5">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-on-primary-container text-[18px]">domain</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-primary-container uppercase">Unit Terpilih</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate max-w-[120px]">{label}</span>
              </div>
            </div>
          </div>
        )}
        {canSwitch && open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-container-lowest rounded-lg shadow-lg border border-outline/20 overflow-hidden"
          >
            <button
              type="button"
              role="option"
              aria-selected={activeUnitId === ALL_UNITS}
              onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: ALL_UNITS }); setOpen(false) }}
              className={`w-full px-space-sm py-2 text-left font-body-sm text-body-sm transition-colors ${activeUnitId === ALL_UNITS ? 'bg-primary-container text-on-primary' : 'text-on-surface hover:bg-surface-container'}`}
            >
              Semua Unit
            </button>
            {options.map((u) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={activeUnitId === u.id}
                onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: u.id }); setOpen(false) }}
                className={`w-full px-space-sm py-2 text-left font-body-sm text-body-sm transition-colors ${activeUnitId === u.id ? 'bg-primary-container text-on-primary' : 'text-on-surface hover:bg-surface-container'}`}
              >
                {u.nama}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarNav() {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const visibleItems = navItems.filter((item) => hasMenuPermission(state, item.menuKey))
  const roleMap = {
    Superadmin: { roleBg: 'bg-purple-50', roleText: 'text-purple-700', roleDot: 'bg-purple-600', unitIcon: 'account_balance' },
    'Admin Unit': { roleBg: 'bg-blue-50', roleText: 'text-secondary', roleDot: 'bg-secondary', unitIcon: 'school' },
    Guru: { roleBg: 'bg-slate-100', roleText: 'text-slate-700', roleDot: 'bg-slate-500', unitIcon: 'school' },
    'Petugas Presensi': { roleBg: 'bg-teal-50', roleText: 'text-teal-700', roleDot: 'bg-teal-600', unitIcon: 'school' },
  }
  const r = roleMap[currentRole] || roleMap.Guru

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-primary-container z-50 flex flex-col justify-between overflow-y-auto">
      <div className="flex flex-col">
        <div className="h-16 px-space-md flex items-center justify-between bg-primary-container">
          <div className="flex items-center gap-space-xs">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary text-[20px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-primary tracking-tight leading-tight">SimPres</span>
              <span className="font-label-sm text-label-sm text-on-primary-container leading-tight mt-1">Multi-Unit System</span>
            </div>
          </div>
        </div>
        <UnitScopeSelector />
        <div className="px-space-md pt-space-xs pb-space-2xs">
          <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider">Navigasi Utama</span>
        </div>
        <nav className="flex flex-col gap-1 px-space-xs">
          {visibleItems.map((item) => (
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
            <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate">{currentUser?.name || 'Superadmin'}</span>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">{currentUser?.email || 'superadmin@simpres.sch.id'}</span>
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