import { useState, useMemo, useEffect } from 'react'
import {
  useSimPres, selectUnitName, initialsOf, normalisasiRole,
  addActivityLog, selectScopedStaff, selectActiveUnitId, selectCanSwitchUnit,
  ALL_UNITS, selectSearchTerm, selectCurrentUser,
  ROLE_ADMIN_UNIT, ROLE_KEPALA_SEKOLAH, ROLE_PETUGAS_PRESENSI, ROLE_GURU_PEGAWAI,
  MENU_OPTIONS, PERMISSION_ACTIONS,
} from '../store/simPresStore.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import DetailEmployeeModal from '../components/DetailEmployeeModal.jsx'

// Role yang tampil di halaman Manajemen Admin (hak akses desktop/admin).
const ADMIN_ROLES = [ROLE_ADMIN_UNIT, ROLE_KEPALA_SEKOLAH, ROLE_PETUGAS_PRESENSI]

const ADMIN_ROLE_LABELS = {
  [ROLE_ADMIN_UNIT]: 'Admin',
  [ROLE_KEPALA_SEKOLAH]: 'Kepala Sekolah',
  [ROLE_PETUGAS_PRESENSI]: 'Petugas Presensi',
}

const roleStyles = {
  'Admin Unit': { roleBg: 'bg-blue-500/10', roleText: 'text-blue-600 dark:text-blue-400', roleDot: 'bg-blue-500', unitIcon: 'school' },
  'Kepala Sekolah': { roleBg: 'bg-purple-500/10', roleText: 'text-purple-600 dark:text-purple-400', roleDot: 'bg-purple-500', unitIcon: 'school' },
  'Petugas Presensi': { roleBg: 'bg-teal-500/10', roleText: 'text-teal-600 dark:text-teal-400', roleDot: 'bg-teal-500', unitIcon: 'school' },
  Guru: { roleBg: 'bg-muted', roleText: 'text-muted-foreground', roleDot: 'bg-muted-foreground', unitIcon: 'school' },
}

function AdminUserPage() {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const searchTerm = selectSearchTerm(state)
  const canSwitchUnit = selectCanSwitchUnit(state)
  const [unitFilter, setUnitFilter] = useState(() => (canSwitchUnit ? ALL_UNITS : selectActiveUnitId(state)))
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [detailStaff, setDetailStaff] = useState(null)
  const [showMatrix, setShowMatrix] = useState(false)
  const [matrixPerms, setMatrixPerms] = useState(null)

  const pageSize = 10

  // Semua pegawai dengan role admin-level (di seluruh unit, untuk KPI).
  const adminStaffAll = useMemo(() => {
    return state.staff.filter((s) => ADMIN_ROLES.includes(normalisasiRole(s.role)))
  }, [state.staff])

  // Tabel difilter menurut unit terpilih + pencarian + role + status.
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const scoped = selectScopedStaff(state)
    return scoped.filter((s) => {
      if (!ADMIN_ROLES.includes(normalisasiRole(s.role))) return false
      const matchesSearch = !term ||
        String(s.name || '').toLowerCase().includes(term) ||
        String(s.niy || '').toLowerCase().includes(term) ||
        String(s.email || '').toLowerCase().includes(term)
      const matchesRole = roleFilter === 'all' || normalisasiRole(s.role) === roleFilter
      const matchesUnit = unitFilter === 'all' || s.unitId === unitFilter
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter
      return matchesSearch && matchesRole && matchesUnit && matchesStatus
    })
  }, [state.staff, state.units, state.selectedUnitId, state.currentUser, searchTerm, roleFilter, unitFilter, statusFilter])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  )
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const rows = useMemo(() => {
    return paged.map((s) => {
      const r = roleStyles[normalisasiRole(s.role)] || roleStyles.Guru
      return {
        id: s.id,
        initials: initialsOf(s.name),
        name: s.name,
        niy: s.niy,
        email: s.email,
        role: normalisasiRole(s.role),
        roleLabel: ADMIN_ROLE_LABELS[normalisasiRole(s.role)] || normalisasiRole(s.role),
        roleBg: r.roleBg,
        roleText: r.roleText,
        roleDot: r.roleDot,
        unit: selectUnitName(state, s.unitId),
        unitId: s.unitId,
        unitIcon: r.unitIcon,
        status: s.status,
        statusBg: s.status === 'Aktif' ? 'bg-emerald-500/10' : 'bg-destructive/10',
        statusText: s.status === 'Aktif' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
        statusDot: s.status === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive',
      }
    })
  }, [paged, state])

  const startIdx = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = filtered.length === 0 ? 0 : Math.min(page * pageSize, filtered.length)

  const confirmAction = (variant, title, message, onConfirm) => {
    setConfirm({ variant, title, message, onConfirm })
  }
  const closeConfirm = () => setConfirm(null)

  const handleBatalkanAdmin = (staff) => {
    confirmAction(
      'danger',
      'Batalkan Admin',
      `Anda yakin ingin mencabut hak admin dari "${staff.name}"? Akun ini akan kembali sebagai Guru/Pegawai dan tidak lagi dapat mengakses halaman admin.`,
      () => {
        dispatch({ type: 'UPDATE_STAFF', payload: { id: staff.id, role: ROLE_GURU_PEGAWAI } })
        addActivityLog(
          dispatch, state, 'Cabut Admin', `Pegawai • ${staff.name}`,
          `Cabut hak admin ${staff.name} (${normalisasiRole(staff.role)} → Guru), NIY ${staff.niy}`,
          null, null, staff.unitId,
        )
        setSuccessMessage(`Hak admin ${staff.name} dicabut.`)
        setTimeout(() => setSuccessMessage(''), 4000)
        closeConfirm()
      },
    )
  }

  const handleToggleStatus = (staff) => {
    const nextStatus = staff.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    confirmAction(
      'warning',
      `${staff.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} Akun`,
      `Anda yakin ingin ${staff.status === 'Aktif' ? 'menonaktifkan' : 'mengaktifkan kembali'} akun "${staff.name}"?`,
      () => {
        dispatch({ type: 'UPDATE_STAFF', payload: { id: staff.id, status: nextStatus } })
        addActivityLog(
          dispatch, state, staff.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan',
          `Pegawai • ${staff.name}`,
          `Ubah status ${staff.name} dari ${staff.status} menjadi ${nextStatus}`,
          null, null, staff.unitId,
        )
        setSuccessMessage(`Status ${staff.name} diubah menjadi ${nextStatus}.`)
        setTimeout(() => setSuccessMessage(''), 4000)
        closeConfirm()
      },
    )
  }

  const openDetail = (staff) => {
    setDetailStaff(staff)
    setShowDetail(true)
  }
  const closeDetail = () => {
    setShowDetail(false)
    setDetailStaff(null)
  }

  const openMatrix = () => {
    setMatrixPerms(JSON.parse(JSON.stringify(state.permissionMatrix)))
    setShowMatrix(true)
  }
  const closeMatrix = () => {
    setShowMatrix(false)
    setMatrixPerms(null)
  }
  const resetMatrix = () => {
    setMatrixPerms(JSON.parse(JSON.stringify(state.permissionMatrix)))
  }
  const saveMatrix = () => {
    dispatch({ type: 'UPDATE_PERMISSIONS', payload: matrixPerms })
    addActivityLog(dispatch, state, 'Ubah', 'Matriks Role & Izin', 'Memperbarui hak akses peran sistem', null, null, currentUser?.unitId)
    setSuccessMessage('Perubahan izin berhasil disimpan')
    setTimeout(() => setSuccessMessage(''), 3000)
    closeMatrix()
  }
  const togglePerm = (role, menuKey, action) => {
    setMatrixPerms((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      const perms = next[role]?.[menuKey] || []
      const idx = perms.indexOf(action)
      if (idx >= 0) {
        next[role][menuKey] = perms.filter((a) => a !== action)
      } else {
        next[role][menuKey] = [...perms, action]
      }
      return next
    })
  }

  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
        {/* Header Breadcrumb & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Superadmin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-foreground font-semibold">Manajemen Admin</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide">Server Pusat: Normal</span>
          </div>
        </div>

        {/* Title and Description */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manajemen Admin</h1>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Kelola pegawai yang telah diberikan hak akses admin. Admin diperoleh dengan mengubah role
            pegawai pada halaman Data Guru/Pegawai (Guru/Pegawai → Admin / Kepala Sekolah). Gunakan
            "Batalkan Admin" untuk mencabut hak admin kembali menjadi Guru/Pegawai.
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Admin</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{adminStaffAll.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Hak akses desktop & admin</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Admin Unit</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{adminStaffAll.filter((s) => normalisasiRole(s.role) === ROLE_ADMIN_UNIT).length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Kepala Sekolah</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{adminStaffAll.filter((s) => normalisasiRole(s.role) === ROLE_KEPALA_SEKOLAH).length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Petugas Presensi</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{adminStaffAll.filter((s) => normalisasiRole(s.role) === ROLE_PETUGAS_PRESENSI).length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 space-y-3 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px]">search</span>
              <input
                className="w-full h-9 pl-8 pr-3 bg-card border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                placeholder="Cari nama, NIY, atau email..."
                type="text"
                value={searchTerm}
                onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
              />
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-card border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Semua Role Admin</option>
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-card border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                {canSwitchUnit && <option value={ALL_UNITS}>Semua Unit</option>}
                {state.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-card border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
            <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">mark_email_read</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="sp-table-wrap">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-3.5">Pengguna</th>
                  <th className="py-3 px-3.5">Kontak &amp; NIY</th>
                  <th className="py-3 px-3.5">Role</th>
                  <th className="py-3 px-3.5">Unit</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3.5 max-w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {user.initials}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-foreground truncate">{user.name}</span>
                          <span className="text-[10.5px] text-muted-foreground font-mono mt-0.5">NIY: {user.niy}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 max-w-[240px]">
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground truncate">{user.email || '-'}</span>
                        <span className="text-[10.5px] text-muted-foreground font-mono mt-0.5">NIY {user.niy}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${user.roleBg} ${user.roleText} border border-border/60`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.roleDot}`}></span>
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <div className="flex items-center gap-1.5 text-foreground min-w-0">
                        <span className="material-symbols-outlined text-[15px] text-muted-foreground flex-shrink-0">{user.unitIcon}</span>
                        <span className="font-medium truncate">{user.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${user.statusBg} ${user.statusText} border border-border/60`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.statusDot}`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(user)}
                          className="w-7 h-7 rounded-md bg-card hover:bg-muted border border-border text-foreground flex items-center justify-center transition-colors cursor-pointer"
                          title="Detail Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          onClick={() => handleBatalkanAdmin(user)}
                          className="w-7 h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                          title="Batalkan Admin"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                          <span className="hidden sm:inline">Batalkan</span>
                        </button>
                        {user.status === 'Aktif' ? (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="w-7 h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                            title="Nonaktifkan Akun"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">block</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="w-7 h-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-colors cursor-pointer"
                            title="Aktifkan Kembali"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-muted-foreground text-xs">
                      Tidak ada data admin yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Menampilkan <span className="font-semibold text-foreground">{startIdx}</span>–<span className="font-semibold text-foreground">{endIdx}</span> dari <span className="font-semibold text-foreground">{filtered.length}</span> admin
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    pNum === page
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                  type="button"
                >
                  {pNum}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Role Matrix Banner */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground leading-snug">Panduan Kebijakan Hak Akses Yayasan</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                AdminUnit hanya memiliki wewenang approval presensi dan penyesuaian jadwal pada unit bersangkutan. Kepala Sekolah memiliki fitur tambahan persetujuan izin/cuti. Hak admin diperoleh dengan mengubah role pegawai menjadi Admin / Kepala Sekolah pada Data Guru/Pegawai.
              </p>
            </div>
          </div>
          <button
            onClick={openMatrix}
            className="h-9 px-4 bg-card hover:bg-muted border border-border text-foreground font-medium text-xs rounded-lg shadow-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
            type="button"
          >
            Lihat Matriks Role &amp; Izin
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          show={true}
          variant={confirm.variant}
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Ya, Lanjutkan"
          onConfirm={confirm.onConfirm}
          onClose={closeConfirm}
        />
      )}

      {showDetail && detailStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={closeDetail}>
          <div className="relative w-full max-w-lg bg-card text-foreground rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Detail Admin</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Informasi lengkap akun admin dan role saat ini.</p>
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col items-center text-center p-4 bg-muted/30 rounded-xl border border-border">
                <div className={`w-16 h-16 rounded-2xl text-lg font-bold flex items-center justify-center shadow-xs ${roleStyles[detailStaff.role]?.roleBg || roleStyles.Guru.roleBg} ${roleStyles[detailStaff.role]?.roleText || roleStyles.Guru.roleText} border border-border/60`}>
                  {detailStaff.initials}
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-foreground">{detailStaff.name}</h4>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${roleStyles[detailStaff.role]?.roleBg || roleStyles.Guru.roleBg} ${roleStyles[detailStaff.role]?.roleText || roleStyles.Guru.roleText} border border-border/60`}>
                    {detailStaff.roleLabel}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <h5 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Informasi Kredensial</h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Email</span>
                    <span className="font-mono font-semibold text-foreground truncate block">{detailStaff.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">NIY</span>
                    <span className="font-mono font-semibold text-foreground">{detailStaff.niy || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Unit Penugasan</span>
                    <span className="font-semibold text-foreground">{selectUnitName(state, detailStaff.unitId)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${detailStaff.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${detailStaff.status === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
                      {detailStaff.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end">
              <button
                onClick={closeDetail}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setShowMatrix(false)}>
          <div className="relative w-full max-w-4xl bg-card text-foreground rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">security</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Matriks Peran &amp; Hak Akses</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi izin operasi modul untuk setiap peran pengguna</p>
                </div>
              </div>
              <button
                onClick={() => setShowMatrix(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-bold sticky left-0 z-10 bg-muted">Menu / Fitur</th>
                      {['Superadmin', 'Admin Unit', 'Guru', 'Kepala Sekolah', 'Petugas Presensi'].map((role) => (
                        <th key={role} className="py-2.5 px-4 text-center font-bold">{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {MENU_OPTIONS.map((menu, idx) => {
                      const rowPerms = {}
                      ['Superadmin', 'Admin Unit', 'Guru', 'Kepala Sekolah', 'Petugas Presensi'].forEach((role) => {
                        rowPerms[role] = matrixPerms?.[role]?.[menu.key] || []
                      })
                      return (
                        <tr key={menu.key} className={idx % 2 === 0 ? 'bg-muted/20' : 'bg-card'}>
                          <td className="py-2.5 px-4 font-semibold text-foreground">{menu.label}</td>
                          {['Superadmin', 'Admin Unit', 'Guru', 'Kepala Sekolah', 'Petugas Presensi'].map((role) => (
                            <td key={role} className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {PERMISSION_ACTIONS.map((perm) => (
                                  <label key={perm} className="flex items-center justify-center cursor-pointer p-0.5">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-primary rounded border-input focus:ring-ring accent-primary"
                                      checked={rowPerms[role].includes(perm)}
                                      onChange={() => togglePerm(role, menu.key, perm)}
                                    />
                                  </label>
                                ))}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary font-semibold">Catatan:</strong> Superadmin memiliki akses penuh ke seluruh modul sistem. Admin Unit dibatasi pada unit sekolah penugasan. Guru/Staf dan Kepala Sekolah dibatasi pada aplikasi mobile.
              </div>
            </div>
            <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
              <button
                onClick={resetMatrix}
                className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                type="button"
              >
                Reset Default
              </button>
              <button
                onClick={saveMatrix}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserPage
