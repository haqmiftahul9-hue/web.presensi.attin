import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  useSimPres, selectCurrentUser, selectCurrentUserRole, hasMenuPermission,
  selectCanSwitchUnit, selectActiveUnitId, selectActiveUnitLabel, selectUnitOptionsById, ALL_UNITS,
  selectCanChangeOwnPassword, performLogout, selectAppHomePath, ROLE_SUPERADMIN,
} from '../store/simPresStore.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

/**
 * Sidebar vertikal milik Dashboard Overview.
 *
 * Sengaja berdiri sendiri (bukan memakai Sidebar.jsx milik Layout) supaya
 * halaman ini bisa dirender penuh-viewport tanpa sidebar ganda. Gaya, warna,
 * tipografi, ikon, dan aturan hak akses mengikuti Sidebar.jsx yang ada:
 *  - latar navy primary-container, aksen biru secondary;
 *  - item navigasi disaring lewat hasMenuPermission (satu sumber kebenaran);
 *  - >= 1024px sidebar tetap 260px, < 1024px menjadi drawer.
 */

const navItems = [
  { path: 'BERANDA', label: 'Dashboard', icon: 'dashboard', menuKey: 'dashboard' },
  { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', activePath: '/unit-sd-islam-rj', menuKey: 'manajemenUnit' },
  { path: '/manajemen-admin-user', label: 'Manajemen Admin & User', icon: 'manage_accounts', activePath: '/manajemen-admin-user', menuKey: 'manajemenAdminUser' },
  { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', activePath: '/data-guru-dan-pegawai', menuKey: 'dataGuruPegawai' },
  { path: '/cetak-kartu-id', label: 'Cetak Kartu ID', icon: 'contact_page', activePath: '/cetak-kartu-id', menuKey: 'cetakKartuId' },
  { path: '/presensi', label: 'Presensi', icon: 'timer', activePath: '/presensi', menuKey: 'presensi' },
  { path: '/rekap-dan-laporan', label: 'Rekap & Laporan', icon: 'summarize', activePath: '/rekap-dan-laporan', menuKey: 'rekapLaporan' },
  { path: '/ranking-kehadiran', label: 'Ranking Kehadiran', icon: 'leaderboard', activePath: '/ranking-kehadiran', menuKey: 'rankingKehadiran' },
  { path: '/pengajuan-izin-dan-cuti', label: 'Pengajuan Izin/Cuti', icon: 'event_available', activePath: '/pengajuan-izin-dan-cuti', menuKey: 'pengajuanIzinCuti' },
  { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history', activePath: '/log-aktivitas', menuKey: 'logAktivitas' },
  { path: '/pengaturan-global', label: 'Pengaturan Global', icon: 'settings', activePath: '/pengaturan-global', menuKey: 'pengaturanGlobal' },
]

const roleMap = {
  Superadmin: { roleBg: 'bg-purple-50', roleText: 'text-purple-700', roleDot: 'bg-purple-600', unitIcon: 'account_balance' },
  'Admin Unit': { roleBg: 'bg-blue-50', roleText: 'text-secondary', roleDot: 'bg-secondary', unitIcon: 'school' },
  Guru: { roleBg: 'bg-slate-100', roleText: 'text-slate-700', roleDot: 'bg-slate-500', unitIcon: 'school' },
  'Petugas Presensi': { roleBg: 'bg-teal-50', roleText: 'text-teal-700', roleDot: 'bg-teal-600', unitIcon: 'school' },
}

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
                <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate max-w-[120px]">{activeLabel}</span>
              </span>
            </span>
            <span className="material-symbols-outlined text-on-primary-container text-[18px]">expand_more</span>
          </button>
        ) : (
          <div className="flex items-center justify-between px-space-sm py-space-xs rounded-lg bg-white/5">
            <span className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-on-primary-container text-[18px]">domain</span>
              <span className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-primary-container uppercase">Unit Terpilih</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-primary truncate max-w-[120px]">{activeLabel}</span>
              </span>
            </span>
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


function UserMenu() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const canChangePassword = selectCanChangeOwnPassword(state)
  const isSuperadmin = currentRole === ROLE_SUPERADMIN
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const confirmLogout = () => {
    performLogout(dispatch)
    navigate('/login', { replace: true })
  }

  const menuItems = []
  if (!isSuperadmin) {
    menuItems.push({ key: 'profil', label: 'Profil Saya', icon: 'account_circle', onSelect: () => navigate('/profil-saya') })
    if (canChangePassword) {
      menuItems.push({ key: 'ganti-sandi', label: 'Ganti Password', icon: 'lock_reset', onSelect: () => navigate('/profil-saya?ganti-sandi=1') })
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Keluar"
        onClick={() => setShowLogoutConfirm(true)}
        className="text-on-primary-container hover:text-on-primary transition-colors p-1"
      >
        <span className="material-symbols-outlined text-[18px]">logout</span>
      </button>
      <ConfirmDialog
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Konfirmasi Keluar"
        message={
          <>
            Apakah Anda yakin ingin keluar dari akun ini?
            <span className="mt-1.5 block font-body-md-medium text-body-md-medium text-on-surface">
              {currentUser?.name || 'Pengguna'}
            </span>
          </>
        }
        confirmLabel="Keluar"
        cancelLabel="Batal"
        confirmIcon="logout"
        variant="danger"
      />
      {/* Item menu tambahan (Profil/Ganti Password) dirender sebagai tombol
          tersembunyi agar tetap bisa dijangkau lewat keyboard tanpa mengubah
          komposisi kartu pengguna di sidebar. */}
      <span className="sr-only">
        {menuItems.map((item) => (
          <button key={item.key} type="button" onClick={item.onSelect}>{item.label}</button>
        ))}
      </span>
    </div>
  )
}


function DashboardNav({ open = false, onTutup } = {}) {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const berandaPath = selectAppHomePath(state)
  const visibleItems = navItems
    .filter((item) => hasMenuPermission(state, item.menuKey))
    .map((item) => (item.path === 'BERANDA' ? { ...item, path: berandaPath, activePath: berandaPath } : item))
  const roleMap = {
    Superadmin: { roleBg: 'bg-purple-950/80 border border-purple-800/60', roleText: 'text-purple-300', roleDot: 'bg-purple-400' },
    'Admin Unit': { roleBg: 'bg-blue-950/80 border border-blue-800/60', roleText: 'text-blue-300', roleDot: 'bg-blue-400' },
    Guru: { roleBg: 'bg-slate-800 border border-slate-700', roleText: 'text-slate-300', roleDot: 'bg-slate-400' },
    'Petugas Presensi': { roleBg: 'bg-teal-950/80 border border-teal-800/60', roleText: 'text-teal-300', roleDot: 'bg-teal-400' },
  }
  const r = roleMap[currentRole] || roleMap.Guru

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[86vw] flex-col justify-between overflow-y-auto overscroll-contain bg-[#0B132B] border-r border-slate-800/80 pb-safe shadow-2xl transition-transform duration-300 ease-out lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 sticky top-0 z-10 bg-[#0B132B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/40">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-sm font-bold text-white tracking-tight leading-tight">SimPres</span>
              <span className="text-[10px] font-medium text-slate-400 leading-tight mt-0.5">Multi-Unit System</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup menu"
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <UnitScopeSelector />

        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigasi Utama</span>
        </div>
        <nav className="flex flex-col gap-1 px-2.5 py-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === berandaPath}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <span className="material-symbols-outlined text-[19px] shrink-0 opacity-90">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-[#080E21]">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-blue-600/90 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
            <span className="material-symbols-outlined text-[18px]">shield_person</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-100 truncate" title={currentUser?.name || ''}>
              {currentUser?.name || 'Superadmin'}
            </span>
            <span className="text-[11px] text-slate-400 truncate" title={currentUser?.email || ''}>
              {currentUser?.username || currentUser?.niy || currentUser?.email || 'superadmin@simpres.sch.id'}
            </span>
            <span className={`mt-1 self-start inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${r.roleBg} ${r.roleText}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${r.roleDot}`} />
              {currentRole}
            </span>
          </div>
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}

export default DashboardNav

