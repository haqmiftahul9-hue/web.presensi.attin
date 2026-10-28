import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  useSimPres, selectCurrentUser, selectCurrentUserRole, hasMenuPermission, MENU_OPTIONS,
  selectCanSwitchUnit, selectActiveUnitId, selectActiveUnitLabel, selectUnitOptionsById, ALL_UNITS,
  selectCanChangeOwnPassword, performLogout, selectAppHomePath, ROLE_SUPERADMIN,
} from '../store/simPresStore.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { buildUserMenuItems } from './userMenuItems.js'

// Sidebar hanya milik aplikasi desktop. Role Guru/Pegawai tidak pernah
// merendernya: Layout mengarahkan role mobile ke /mobile/* sebelum sidebar
// tampil, dan tiap item tetap disaring lewat hasMenuPermission.
const navItems = [
  { path: 'BERANDA', label: 'Dashboard', icon: 'dashboard', menuKey: 'dashboard' },
  { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', activePath: '/unit-sd-islam-rj', menuKey: 'manajemenUnit' },
  { path: '/manajemen-admin-user', label: 'Manajemen Admin & User', icon: 'manage_accounts', activePath: '/manajemen-admin-user', menuKey: 'manajemenAdminUser' },
  { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', activePath: '/data-guru-dan-pegawai', menuKey: 'dataGuruPegawai' },
  { path: '/cetak-kartu-id', label: 'Cetak Kartu ID', icon: 'contact_page', activePath: '/cetak-kartu-id', menuKey: 'cetakKartuId' },
  { path: '/presensi', label: 'Presensi', icon: 'timer', activePath: '/presensi', menuKey: 'presensi' },
  { path: '/presensi-scan', label: 'Scan Presensi (Kios)', icon: 'qr_code_scanner', activePath: '/presensi-scan', menuKey: 'presensi' },
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
    <div className="px-3 py-1.5">
      <div className="relative" ref={ref}>
        {canSwitch ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border text-left transition-all cursor-pointer shadow-2xs"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px]">domain</span>
              <span className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/60 uppercase">Unit Terpilih</span>
                <span className="text-xs font-semibold text-sidebar-foreground truncate max-w-[140px]">{label}</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-sidebar-foreground/50 text-[18px]">expand_more</span>
          </button>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-sidebar-foreground/50 text-[18px]">domain</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/60 uppercase">Unit Terpilih</span>
                <span className="text-xs font-semibold text-sidebar-foreground truncate max-w-[140px]">{label}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-sidebar-foreground/40 text-[16px]">lock</span>
          </div>
        )}
        {canSwitch && open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border p-1 overflow-hidden backdrop-blur-xl animate-sp-rise"
          >
            <button
              type="button"
              role="option"
              aria-selected={activeUnitId === ALL_UNITS}
              onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: ALL_UNITS }); setOpen(false) }}
              className={`w-full px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors flex items-center justify-between ${
                activeUnitId === ALL_UNITS ? 'bg-primary text-primary-foreground font-semibold' : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>Semua Unit</span>
              {activeUnitId === ALL_UNITS && <span className="material-symbols-outlined text-[16px]">check</span>}
            </button>
            {options.map((u) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={activeUnitId === u.id}
                onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: u.id }); setOpen(false) }}
                className={`w-full px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors flex items-center justify-between ${
                  activeUnitId === u.id ? 'bg-primary text-primary-foreground font-semibold' : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="truncate">{u.nama}</span>
                {activeUnitId === u.id && <span className="material-symbols-outlined text-[16px]">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Menu titik tiga pada kartu pengguna. Isinya ditentukan per role di bawah,
// jadi menambah role cukup menambah aturan filter, bukan mengubah markup.
// - Superadmin   : Aktivitas Saya, Keluar. Tanpa "Profil Saya" maupun ikon
//                  profilnya, dan tanpa "Ganti Password" karena akun pusat
//                  tidak boleh mengganti sandinya dari menu pengguna
//                  (lihat selectCanChangeOwnPassword di auth store).
// - Role lain    : Profil Saya, Ganti Password, Keluar.
function UserMenu() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const canChangePassword = selectCanChangeOwnPassword(state)
  const isSuperadmin = currentRole === ROLE_SUPERADMIN

  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const closeMenu = () => setOpen(false)

  const goToProfile = () => {
    closeMenu()
    navigate('/data-guru-dan-pegawai')
  }

  const goToMyActivity = () => {
    closeMenu()
    const name = encodeURIComponent(currentUser?.name || '')
    navigate(`/log-aktivitas?pengguna=${name}`)
  }

  const openChangePassword = () => {
    closeMenu()
    dispatch({ type: 'REQUEST_PASSWORD_CHANGE' })
  }

  const requestLogout = () => {
    closeMenu()
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    performLogout(dispatch)
    navigate('/login', { replace: true })
  }

  const itemHandlers = {
    profile: goToProfile,
    activity: goToMyActivity,
    password: openChangePassword,
    logout: requestLogout,
  }
  const menuItems = buildUserMenuItems({ isSuperadmin, canChangePassword }).map((item) => ({
    ...item,
    onSelect: itemHandlers[item.key],
  }))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Menu pengguna"
        aria-label="Menu pengguna"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu pengguna"
          className="absolute bottom-full right-0 mb-2 z-50 w-[220px] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl animate-sp-rise backdrop-blur-xl"
        >
          <div className="border-b border-border/80 px-3 py-2.5 bg-muted/20">
            <p className="truncate text-xs font-semibold text-foreground">
              {currentUser?.name || 'Pengguna'}
            </p>
            <p className="truncate text-[11px] font-medium text-muted-foreground mt-0.5">
              {currentUser?.username || currentUser?.niy || currentUser?.email || '-'}
            </p>
          </div>

          <div className="p-1">
            {menuItems.map((item, index) => (
              <div key={item.key}>
                {item.destructive && index > 0 ? <div className="my-1 border-t border-border" /> : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={item.onSelect}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer ${
                    item.destructive
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[17px] ${item.destructive ? 'text-destructive' : 'text-muted-foreground'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Konfirmasi Keluar"
        message={
          <>
            Apakah Anda yakin ingin keluar dari akun ini?
            <span className="mt-1.5 block font-semibold text-foreground">
              {currentUser?.name || 'Superadmin Pusat'}
              <span className="text-muted-foreground font-normal">
                {' '}
                &middot; {currentUser?.email || currentUser?.username || '-'}
              </span>
            </span>
          </>
        }
        confirmLabel="Keluar"
        cancelLabel="Batal"
        confirmIcon="logout"
        variant="danger"
      />
    </div>
  )
}

function SidebarNav({ open = false, onTutup } = {}) {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  // Item beranda memakai path mode milik role: Superadmin -> /superadmin,
  // Admin Unit & Petugas -> /dashboard. _roleMap di bawah tetap untuk tampilan.
  const berandaPath = selectAppHomePath(state)
  const visibleItems = navItems
    .filter((item) => hasMenuPermission(state, item.menuKey) && (!item.onlyRole || item.onlyRole === currentRole))
    .map((item) => (item.path === 'BERANDA' ? { ...item, path: berandaPath, activePath: berandaPath } : item))
  const roleMap = {
    Superadmin: { roleBg: 'bg-purple-950/80 border border-purple-800/60', roleText: 'text-purple-300', roleDot: 'bg-purple-400' },
    'Admin Unit': { roleBg: 'bg-blue-950/80 border border-blue-800/60', roleText: 'text-blue-300', roleDot: 'bg-blue-400' },
    Guru: { roleBg: 'bg-sidebar-accent border border-sidebar-border', roleText: 'text-sidebar-accent-foreground', roleDot: 'bg-sidebar-ring' },
    'Petugas Presensi': { roleBg: 'bg-teal-950/80 border border-teal-800/60', roleText: 'text-teal-300', roleDot: 'bg-teal-400' },
  }
  const r = roleMap[currentRole] || roleMap.Guru

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[86vw] flex-col justify-between overflow-y-auto overscroll-contain bg-sidebar text-sidebar-foreground border-r border-sidebar-border pb-safe shadow-xl transition-transform duration-300 ease-out lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open ? undefined : undefined}
      >
        <div className="flex flex-col">
          {/* Brand header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border/80 sticky top-0 z-10 bg-sidebar">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/icons/logo-simpeg.png" alt="SIMPEG" className="w-9 h-9 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm font-bold text-sidebar-foreground tracking-tight leading-tight">SIMPEG</span>
                <span className="text-[10px] font-medium text-sidebar-foreground/60 leading-tight mt-0.5">Multi-Unit System</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onTutup}
              aria-label="Tutup menu"
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <UnitScopeSelector />

          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-bold text-sidebar-foreground/60 uppercase tracking-wider">Navigasi Utama</span>
          </div>

          <nav className="flex flex-col gap-1 px-2.5 py-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs font-semibold'
                      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[19px] shrink-0 opacity-90">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card footer */}
        <div className="p-3 border-t border-sidebar-border/80 bg-sidebar">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">shield_person</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-sidebar-foreground truncate" title={currentUser?.name || ''}>
                {currentUser?.name || 'Superadmin'}
              </span>
              <span
                className="text-[11px] text-sidebar-foreground/60 truncate"
                title={currentUser?.email || ''}
              >
                {currentUser?.username || currentUser?.niy || currentUser?.email || 'superadmin@simpres.sch.id'}
              </span>
              <span className="mt-1 self-start inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/60">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {currentRole}
              </span>
            </div>
            <UserMenu />
          </div>
        </div>
      </aside>
    </>
  )
}

export default SidebarNav