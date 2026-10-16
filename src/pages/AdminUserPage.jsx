import { useState, useMemo, useEffect } from 'react'
import { useSimPres, selectUnitName, initialsOf, ROLE_OPTIONS, MENU_OPTIONS, PERMISSION_ACTIONS, getRolePermissions, addActivityLog, selectScopedAdminUsers, selectCanSwitchUnit, selectActiveUnitId, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const roleMap = {
  Superadmin: { roleBg: 'bg-primary/10', roleText: 'text-primary', roleDot: 'bg-primary', unitIcon: 'account_balance' },
  'Admin Unit': { roleBg: 'bg-blue-500/10', roleText: 'text-blue-600 dark:text-blue-400', roleDot: 'bg-blue-500', unitIcon: 'school' },
  Guru: { roleBg: 'bg-muted', roleText: 'text-muted-foreground', roleDot: 'bg-muted-foreground', unitIcon: 'school' },
}

function AdminUserPage() {
  const { state, dispatch } = useSimPres()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // Unit daftar akun mengikuti unit terpilih di store utama.
  const canSwitchUnit = selectCanSwitchUnit(state)
  const [unitFilter, setUnitFilter] = useState(() => (canSwitchUnit ? ALL_UNITS : selectActiveUnitId(state)))

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editedUser, setEditedUser] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', niy: '', role: 'Admin Unit', unitId: '', status: 'Aktif', password: '', forceChange: true,
  })
  const [formErrors, setFormErrors] = useState({})

  const [confirm, setConfirm] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showMatrix, setShowMatrix] = useState(false)
  const [matrixPerms, setMatrixPerms] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailUser, setDetailUser] = useState(null)

  const pageSize = 10
  const [page, setPage] = useState(1)

  const nextId = state.adminUsers.length === 0 ? 1 : Math.max(0, ...state.adminUsers.map((u) => u.id)) + 1
  const generatePassword = () => `SimPres#${Math.floor(1000 + Math.random() * 9000)}!rj`

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return state.adminUsers.filter((u) => {
      const matchesSearch = !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        String(u.niy).toLowerCase().includes(term)
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesUnit = unitFilter === 'all' || u.unitId === unitFilter
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter
      return matchesSearch && matchesRole && matchesUnit && matchesStatus
    })
  }, [state.adminUsers, searchTerm, roleFilter, unitFilter, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, roleFilter, unitFilter, statusFilter])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize],
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const rows = useMemo(() => {
    return paged.map((u) => {
      const r = roleMap[u.role] || roleMap.Guru
      return {
        id: u.id,
        initials: initialsOf(u.name),
        name: u.name,
        nik: `3201${u.niy.slice(1, 13)}`,
        email: u.email,
        niy: u.niy,
        role: u.role,
        roleBg: r.roleBg,
        roleText: r.roleText,
        roleDot: r.roleDot,
        unit: selectUnitName(state, u.unitId),
        unitId: u.unitId,
        unitIcon: r.unitIcon,
        status: u.status,
        statusBg: u.status === 'Aktif' ? 'bg-emerald-500/10' : 'bg-destructive/10',
        statusText: u.status === 'Aktif' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
        statusDot: u.status === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive',
        rowBg: '',
      }
    })
  }, [paged, state])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const resetForm = () => {
    setForm({ name: '', email: '', niy: '', role: 'Admin Unit', unitId: '', status: 'Aktif', password: '', forceChange: true })
    setFormErrors({})
  }

  const openAdd = () => {
    setFormMode('add')
    setEditedUser(null)
    setForm({ name: '', email: '', niy: '', role: 'Admin Unit', unitId: '', status: 'Aktif', password: generatePassword(), forceChange: true })
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (row) => {
    setFormMode('edit')
    setEditedUser(row)
    setForm({ name: row.name, email: row.email, niy: row.niy, role: row.role, unitId: row.unitId, status: row.status, password: '', forceChange: false })
    setFormErrors({})
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  const validateForm = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nama lengkap wajib diisi'
    if (!form.email.trim()) e.email = 'Email wajib diisi'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Format email tidak valid'
    // NIY opsional - boleh kosong, boleh diisi
    if (form.niy && form.niy.trim() && !/^\d+$/.test(form.niy.trim())) e.niy = 'NIY harus berupa angka'
    if (!form.role) e.role = 'Role wajib dipilih'
    if (!form.unitId) e.unitId = 'Unit penugasan wajib dipilih'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return
    if (formMode === 'add') {
      dispatch({
        type: 'ADD_ADMIN_USER',
        payload: {
          id: nextId,
          name: form.name.trim(),
          email: form.email.trim(),
          niy: form.niy.trim(),
          role: form.role,
          unitId: form.unitId,
          status: form.status,
          // Field kredensial ini dibaca auth store (findAccountByIdentifier ->
          // authenticateCredentials), jadi isi form kredensial tidak disimpan
          // sebagai data mati.
          password: form.password || undefined,
          mustChangePassword: Boolean(form.forceChange),
        },
      })
      addActivityLog(dispatch, state, 'Tambah', `Akun • ${form.name.trim()}`, `Buat akun ${form.role} baru atas NIY ${form.niy.trim()}`, null, null, form.unitId)
    } else if (editedUser) {
      const roleChanged = editedUser.role !== form.role
      const oldRole = editedUser.role
      const newRole = form.role
      // Field kosong pada form edit = "jangan sentuh", bukan "hapus kata sandi".
      const credentialPayload = form.password
        ? { password: form.password, mustChangePassword: Boolean(form.forceChange) }
        : {}

      dispatch({
        type: 'UPDATE_ADMIN_USER',
        payload: {
          id: editedUser.id,
          name: form.name.trim(),
          email: form.email.trim(),
          niy: form.niy.trim(),
          role: form.role,
          unitId: form.unitId,
          status: form.status,
          ...credentialPayload,
        },
      })

      if (roleChanged) {
        addActivityLog(dispatch, state, 'Ubah Role', `Akun • ${form.name.trim()}`, `Mengubah peran dari ${oldRole} menjadi ${newRole}`, null, null, form.unitId)
      } else {
        addActivityLog(dispatch, state, 'Ubah', `Akun • ${form.name.trim()}`, `Perbarui data akun: peran ${form.role}, unit ${selectUnitName(state, form.unitId)}`, null, null, form.unitId)
      }
    }
    closeForm()
  }

  const confirmAction = (variant, title, message, onConfirm) => {
    setConfirm({ variant, title, message, onConfirm })
  }

  const closeConfirm = () => setConfirm(null)

  const openDelete = (row) => {
    confirmAction(
      'danger',
      'Hapus Pengguna',
      `Anda yakin ingin menghapus akun "${row.name}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus akses pengguna ke seluruh sistem.`,
      () => {
        dispatch({ type: 'DELETE_ADMIN_USER', payload: row.id })
        addActivityLog(dispatch, state, 'Hapus', `Akun • ${row.name}`, `Hapus akun ${row.role} atas NIY ${row.niy}`, null, null, row.unitId)
      },
    )
  }

  const toggleStatus = (row) => {
    const newStatus = row.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    const action = row.status === 'Aktif' ? 'menonaktifkan' : 'mengaktifkan kembali'
    confirmAction(
      'warning',
      `${row.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} Akun`,
      `Anda yakin ingin ${action} akun "${row.name}"?`,
      () => {
        dispatch({ type: 'UPDATE_ADMIN_USER', payload: { id: row.id, status: newStatus } })
        addActivityLog(
          dispatch,
          state,
          row.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan',
          `Akun • ${row.name}`,
          `Akun ${row.role} di-${action} statusnya menjadi ${newStatus}`,
          null, null, row.unitId
        )
      },
    )
  }

  const openResetPassword = (row) => {
    confirmAction(
      'default',
      'Reset Password',
      `Reset kata sandi akun "${row.name}"? Kata sandi baru akan disetel dan pengguna wajib menggantinya saat login berikutnya.`,
      () => {
        const pwd = generatePassword()
        // Kata sandi ikut ditulis ke akun agar kredensial di bawah benar-benar
        // bisa dipakai, dan mustChangePassword mengarahkan pengguna ke form
        // ganti kata sandi sebelum masuk ke sistem.
        dispatch({ type: 'UPDATE_ADMIN_USER', payload: { id: row.id, password: pwd, mustChangePassword: true } })
        addActivityLog(dispatch, state, 'Reset Password', `Akun • ${row.name}`, `Reset kata sandi akun ${row.role} atas NIY ${row.niy}`, null, null, row.unitId)
        setSuccessMessage(`Password akun "${row.name}" telah direset. Kredensial baru: ${pwd}`)
        setTimeout(() => setSuccessMessage(''), 6000)
      },
    )
  }

  const resetFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setUnitFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const handleExport = () => {
    const headers = ['Nama', 'Email', 'NIY', 'Role', 'Unit', 'Status']
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.niy,
      u.role,
      selectUnitName(state, u.unitId),
      u.status,
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `manajemen-admin-user-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    addActivityLog(dispatch, state, 'Ekspor', 'Admin User', 'Ekspor data admin/user ke CSV', null, null, currentUser?.unitId)
  }

  const openMatrix = () => {
    setMatrixPerms(JSON.parse(JSON.stringify(state.permissionMatrix)))
    setShowMatrix(true)
  }

  const closeMatrix = () => {
    setShowMatrix(false)
    setMatrixPerms(null)
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

  const saveMatrix = () => {
    dispatch({ type: 'UPDATE_PERMISSIONS', payload: matrixPerms })
    addActivityLog(dispatch, state, 'Ubah', 'Matriks Role & Izin', 'Memperbarui hak akses peran sistem', null, null, currentUser?.unitId)
    setSuccessMessage('Perubahan izin berhasil disimpan')
    setTimeout(() => setSuccessMessage(''), 3000)
    closeMatrix()
  }

  const resetMatrix = () => {
    setMatrixPerms(JSON.parse(JSON.stringify(state.permissionMatrix)))
  }

  const openDetail = (user) => {
    setDetailUser(user)
    setShowDetail(true)
  }

  const closeDetail = () => {
    setShowDetail(false)
    setDetailUser(null)
  }

  const startIdx = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = filtered.length === 0 ? 0 : startIdx + rows.length - 1

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
            <span className="text-foreground font-semibold">Manajemen Admin &amp; User</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide">Server Pusat: Normal</span>
          </div>
        </div>

        {/* Title and Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Manajemen Admin &amp; User</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
              Kelola hak akses akun sistem, penugasan per unit sekolah, otentikasi peran, dan kredensial pengguna terpusat.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={openAdd}
              className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Tambah Admin/User Baru</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Akun Aktif</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.adminUsers.filter((u) => u.status === 'Aktif').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Terverifikasi aktif
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Aktif</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Superadmin Pusat</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.adminUsers.filter((u) => u.role === 'Superadmin' && u.status === 'Aktif').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">shield_person</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs text-primary font-medium">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              <span>Hak akses penuh sistem</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Admin Unit Sekolah</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.adminUsers.filter((u) => u.role === 'Admin Unit' && u.status === 'Aktif').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[15px] text-blue-600 dark:text-blue-400">apartment</span>
              <span>{state.units.length} unit sekolah</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Guru &amp; Staf Akun</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.adminUsers.filter((u) => u.role === 'Guru' && u.status === 'Aktif').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted border border-border text-foreground flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[15px] text-muted-foreground">phonelink_setup</span>
              <span>Mobile app SimPres</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 space-y-3 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px]">search</span>
              <input
                className="w-full h-9 pl-8 pr-3 bg-muted/40 border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-colors"
                placeholder="Cari nama, email, atau NIY..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-muted/40 border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Semua Role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-muted/40 border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                {selectCanSwitchUnit(state) && <option value={ALL_UNITS}>Semua Unit</option>}
                {selectUnitOptionsById(state).map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-9 pl-2.5 pr-7 bg-muted/40 border border-input text-foreground rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
            </div>
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-lg border border-border hover:bg-muted text-foreground transition-colors text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset</span>
            </button>
            <button
              onClick={handleExport}
              className="h-9 px-3.5 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 sm:ml-auto"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">file_download</span>
              <span>Ekspor Data</span>
            </button>
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
                  <th className="py-3 px-3.5">Peran</th>
                  <th className="py-3 px-3.5">Unit</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right w-44">Aksi</th>
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
                          <span className="text-[10.5px] text-muted-foreground font-mono mt-0.5">NIK: {user.nik}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 max-w-[240px]">
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground truncate">{user.email}</span>
                        <span className="text-[10.5px] text-muted-foreground font-mono mt-0.5">NIY {user.niy}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${user.roleBg} ${user.roleText} border border-border/60`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.roleDot}`}></span>
                        {user.role}
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
                          className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors cursor-pointer"
                          title="Detail Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => openResetPassword(user)}
                          className="w-7 h-7 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center transition-colors cursor-pointer"
                          title="Reset Password"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                        </button>
                        {user.status === 'Aktif' ? (
                          <button
                            onClick={() => toggleStatus(user)}
                            className="w-7 h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                            title="Nonaktifkan Akun"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">block</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatus(user)}
                            className="w-7 h-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-colors cursor-pointer"
                            title="Aktifkan Kembali"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          </button>
                        )}
                        <button
                          onClick={() => openDelete(user)}
                          className="w-7 h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[32px] text-muted-foreground mb-2">search_off</span>
              <h4 className="text-xs font-semibold text-foreground">Tidak ada pengguna ditemukan</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Tidak ada akun yang cocok dengan filter pencarian Anda. Hapus beberapa filter atau reset pencarian.
              </p>
              <button
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                <span>Reset Filter</span>
              </button>
            </div>
          )}

          <div className="px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Menampilkan <span className="font-semibold text-foreground">{startIdx}</span>–<span className="font-semibold text-foreground">{endIdx}</span> dari <span className="font-semibold text-foreground">{filtered.length}</span> akun
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
                      : 'text-foreground hover:bg-muted'
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

        <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground leading-snug">Panduan Kebijakan Hak Akses Yayasan</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Admin Unit hanya memiliki wewenang approval presensi dan penyesuaian jadwal pada unit bersangkutan. Otoritas penambahan akun guru dan reset kata sandi massal dipegang oleh Superadmin Pusat.
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={closeForm}>
          <div className="relative w-full max-w-2xl bg-card text-foreground rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{formMode === 'add' ? 'person_add' : 'edit'}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">{formMode === 'add' ? 'Tambah User Baru' : 'Edit User'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formMode === 'add' ? 'Buat akun pengguna baru dan atur hak akses peran serta unit sekolah.' : 'Perbarui data akun pengguna dan konfigurasi hak aksesnya.'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nama Lengkap Beserta Gelar <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">badge</span>
                  <input
                    className={`w-full h-9 pl-9 pr-3 bg-card border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${formErrors.name ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                    placeholder="e.g. Wisna Yunita, S.Pd"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                {formErrors.name && <span className="text-xs text-destructive mt-0.5">{formErrors.name}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Alamat Email Resmi <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">mail</span>
                    <input
                      className={`w-full h-9 pl-9 pr-3 bg-card border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${formErrors.email ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                      placeholder="wisna.y@sd.raudhatuljannah.sch.id"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                    />
                  </div>
                  {formErrors.email && <span className="text-xs text-destructive mt-0.5">{formErrors.email}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    NIY (Nomor Induk Yayasan) <span className="text-muted-foreground font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">numbers</span>
                    <input
                      className={`w-full h-9 pl-9 pr-3 bg-card border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${formErrors.niy ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                      placeholder="e.g. 049001054"
                      type="text"
                      value={form.niy}
                      onChange={(e) => updateField('niy', e.target.value)}
                    />
                  </div>
                  {formErrors.niy && <span className="text-xs text-destructive mt-0.5">{formErrors.niy}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Role / Peran Sistem <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full h-9 pl-3 pr-8 bg-card border rounded-lg text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer transition-all ${formErrors.role ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                      value={form.role}
                      onChange={(e) => updateField('role', e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">expand_more</span>
                  </div>
                  {formErrors.role && <span className="text-xs text-destructive mt-0.5">{formErrors.role}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Unit Penugasan Sekolah <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full h-9 pl-3 pr-8 bg-card border rounded-lg text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer transition-all ${formErrors.unitId ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                      value={form.unitId}
                      onChange={(e) => updateField('unitId', e.target.value)}
                    >
                      <option value="">Pilih Unit Penugasan</option>
                      {state.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.nama}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">expand_more</span>
                  </div>
                  {formErrors.unitId && <span className="text-xs text-destructive mt-0.5">{formErrors.unitId}</span>}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground -mt-1.5">
                Pilihan unit wajib untuk akun dengan peran <strong className="text-foreground font-semibold">Admin Unit</strong> dan <strong className="text-foreground font-semibold">Guru/Pegawai</strong>.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status Akun <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    className={`w-full h-9 pl-3 pr-8 bg-card border rounded-lg text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer transition-all ${formErrors.status ? 'border-destructive focus:ring-1 focus:ring-destructive' : 'border-input focus:ring-1 focus:ring-ring'}`}
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">expand_more</span>
                </div>
                {formErrors.status && <span className="text-xs text-destructive mt-0.5">{formErrors.status}</span>}
              </div>

              {formMode === 'add' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Password Sementara
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">key</span>
                        <input
                          className="w-full h-9 pl-9 pr-3 bg-muted/40 border border-input rounded-lg font-mono text-xs text-foreground focus:outline-none focus:bg-card focus:border-ring"
                          id="tempPasswordInput"
                          type="text"
                          value={form.password}
                          onChange={(e) => updateField('password', e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => updateField('password', generatePassword())}
                        className="h-9 px-3 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">autorenew</span>
                        <span>Acak Otomatis</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">Wajib ganti password saat login pertama</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        Pengguna akan diminta membuat password baru segera setelah pertama kali masuk ke portal web atau mobile app SimPres.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        checked={form.forceChange}
                        onChange={(e) => updateField('forceChange', e.target.checked)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-10 h-5.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">mark_email_read</span>
                <span>{formMode === 'add' ? 'Kredensial otomatis terkirim via notifikasi email.' : 'Perubahan tersimpan dan berlaku untuk login berikutnya.'}</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={closeForm}
                  className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                  type="button"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{formMode === 'add' ? 'Simpan Pengguna' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {showMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setShowMatrix(false)}>
          <div className="relative w-full max-w-4xl bg-card text-foreground rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">security</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Matriks Peran & Hak Akses</h3>
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
                      <th className="py-2.5 px-4 text-center font-bold">Superadmin</th>
                      <th className="py-2.5 px-4 text-center font-bold">Admin Unit</th>
                      <th className="py-2.5 px-4 text-center font-bold">Guru / Staf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {MENU_OPTIONS.map((menu, idx) => {
                      const superPerms = matrixPerms?.Superadmin?.[menu.key] || []
                      const unitPerms = matrixPerms?.['Admin Unit']?.[menu.key] || []
                      const guruPerms = matrixPerms?.Guru?.[menu.key] || []
                      return (
                        <tr key={menu.key} className={idx % 2 === 0 ? 'bg-muted/20' : 'bg-card'}>
                          <td className="py-2.5 px-4 font-semibold text-foreground">{menu.label}</td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {PERMISSION_ACTIONS.map((perm) => (
                                <label key={perm} className="flex items-center justify-center cursor-pointer p-0.5">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-primary rounded border-input focus:ring-ring accent-primary"
                                    checked={superPerms.includes(perm)}
                                    onChange={() => togglePerm('Superadmin', menu.key, perm)}
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {PERMISSION_ACTIONS.map((perm) => (
                                <label key={perm} className="flex items-center justify-center cursor-pointer p-0.5">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-primary rounded border-input focus:ring-ring accent-primary"
                                    checked={unitPerms.includes(perm)}
                                    onChange={() => togglePerm('Admin Unit', menu.key, perm)}
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {PERMISSION_ACTIONS.map((perm) => (
                                <label key={perm} className="flex items-center justify-center cursor-pointer p-0.5">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-primary rounded border-input focus:ring-ring accent-primary"
                                    checked={guruPerms.includes(perm)}
                                    onChange={() => togglePerm('Guru', menu.key, perm)}
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <h4 className="text-xs font-bold text-foreground mb-2.5">Keterangan Izin Operasi</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                    </span>
                    <span className="font-medium text-foreground">Lihat (View)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <span className="material-symbols-outlined text-[13px]">add</span>
                    </span>
                    <span className="font-medium text-foreground">Tambah (Create)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                    </span>
                    <span className="font-medium text-foreground">Edit (Update)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/20">
                      <span className="material-symbols-outlined text-[13px]">delete</span>
                    </span>
                    <span className="font-medium text-foreground">Hapus (Delete)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary font-semibold">Catatan:</strong> Superadmin memiliki akses penuh ke seluruh modul sistem. Admin Unit dibatasi pada unit sekolah penugasan. Guru/Staf dibatasi pada modul presensi pribadi dan pengajuan izin/cuti.
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

      {showDetail && detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={closeDetail}>
          <div className="relative w-full max-w-lg bg-card text-foreground rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Detail Pengguna</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Informasi lengkap akun dan matriks hak akses</p>
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
                <div className={`w-16 h-16 rounded-2xl text-lg font-bold flex items-center justify-center shadow-xs ${
                  detailUser.role === 'Superadmin' ? 'bg-primary/10 text-primary border border-primary/20' :
                  detailUser.role === 'Admin Unit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                  'bg-muted text-foreground border border-border'
                }`}>
                  {detailUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-foreground">{detailUser.name}</h4>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${
                    detailUser.role === 'Superadmin' ? 'bg-primary/10 text-primary border border-primary/20' :
                    detailUser.role === 'Admin Unit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                    'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {detailUser.role}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <h5 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Informasi Kredensial</h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Email</span>
                    <span className="font-semibold text-foreground truncate block">{detailUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">NIY</span>
                    <span className="font-mono font-semibold text-foreground">{detailUser.niy || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Unit Penugasan</span>
                    <span className="font-semibold text-foreground">{selectUnitName(state, detailUser.unitId)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${detailUser.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${detailUser.status === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
                      {detailUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 bg-muted border-b border-border">
                  <h5 className="text-xs font-bold text-foreground">Hak Akses Modul Aktif</h5>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted border-b border-border text-muted-foreground text-[10.5px] font-bold uppercase tracking-wider">
                        <th className="py-2 px-3 font-semibold">Menu / Modul</th>
                        <th className="py-2 px-3 text-center font-semibold">Izin Aktif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {MENU_OPTIONS.map((menu) => {
                        const userPerms = state.permissionMatrix?.[detailUser.role]?.[menu.key] || []
                        return (
                          <tr key={menu.key} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 font-medium text-foreground">{menu.label}</td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {PERMISSION_ACTIONS.map((perm) => (
                                  <span
                                    key={perm}
                                    title={perm}
                                    className={`w-5 h-5 rounded flex items-center justify-center ${userPerms.includes(perm) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground/30'}`}
                                  >
                                    {perm === 'view' && <span className="material-symbols-outlined text-[11px]">visibility</span>}
                                    {perm === 'add' && <span className="material-symbols-outlined text-[11px]">add</span>}
                                    {perm === 'edit' && <span className="material-symbols-outlined text-[11px]">edit</span>}
                                    {perm === 'delete' && <span className="material-symbols-outlined text-[11px]">delete</span>}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end">
              <button
                onClick={closeDetail}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span>Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserPage