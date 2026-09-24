import { useState, useMemo, useEffect } from 'react'
import { useSimPres, selectUnitName, initialsOf, ROLE_OPTIONS } from '../store/simPresStore.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const roleMap = {
  Superadmin: { roleBg: 'bg-purple-50', roleText: 'text-purple-700', roleDot: 'bg-purple-600', unitIcon: 'account_balance' },
  'Admin Unit': { roleBg: 'bg-blue-50', roleText: 'text-secondary', roleDot: 'bg-secondary', unitIcon: 'school' },
  Guru: { roleBg: 'bg-slate-100', roleText: 'text-slate-700', roleDot: 'bg-slate-500', unitIcon: 'school' },
}

function AdminUserPage() {
  const { state, dispatch } = useSimPres()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editedUser, setEditedUser] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', niy: '', role: 'Admin Unit', unitId: '', status: 'Aktif', password: '', forceChange: true,
  })
  const [formErrors, setFormErrors] = useState({})

  const [confirm, setConfirm] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const pageSize = 10
  const [page, setPage] = useState(1)

  const nextId = state.adminUsers.length === 0 ? 1 : Math.max(0, ...state.adminUsers.map((u) => u.id)) + 1
  const generatePassword = () => `SimPres#${Math.floor(1000 + Math.random() * 9000)}!rj`

  const generateLogTime = () => {
    const now = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const day = String(now.getDate()).padStart(2, '0')
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${year}, ${hours}:${minutes}`
  }

  const addLog = (action, target, desc) => {
    const logId = state.logs.length === 0 ? 1 : Math.max(0, ...state.logs.map((l) => l.id)) + 1
    dispatch({
      type: 'ADD_LOG',
      payload: {
        id: logId,
        time: generateLogTime(),
        actor: 'Superadmin Pusat',
        role: 'Superadmin',
        action,
        target,
        desc,
      },
    })
  }

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
        statusBg: u.status === 'Aktif' ? 'bg-emerald-100' : 'bg-rose-100',
        statusText: u.status === 'Aktif' ? 'text-emerald-800' : 'text-rose-800',
        statusDot: u.status === 'Aktif' ? 'bg-emerald-600' : 'bg-rose-600',
        rowBg: u.id % 2 === 0 ? 'bg-surface-container-low/30' : '',
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
    if (!form.niy.trim()) e.niy = 'NIY wajib diisi'
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
        },
      })
      addLog('Tambah', `Akun • ${form.name.trim()}`, `Buat akun ${form.role} baru atas NIY ${form.niy.trim()}`)
    } else if (editedUser) {
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
        },
      })
      addLog('Ubah', `Akun • ${form.name.trim()}`, `Perbarui data akun: peran ${form.role}, unit ${selectUnitName(state, form.unitId)}`)
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
        addLog('Hapus', `Akun • ${row.name}`, `Hapus akun ${row.role} atas NIY ${row.niy}`)
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
        addLog(
          row.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan',
          `Akun • ${row.name}`,
          `Akun ${row.role} di-${action} statusnya menjadi ${newStatus}`,
        )
      },
    )
  }

  const openResetPassword = (row) => {
    confirmAction(
      'default',
      'Reset Password',
      `Reset kata sandi akun "${row.name}"? Kata sandi baru akan disetel dan kredensial dikirim via email.`,
      () => {
        const pwd = generatePassword()
        dispatch({ type: 'UPDATE_ADMIN_USER', payload: { id: row.id, mustReset: true } })
        addLog('Reset Password', `Akun • ${row.name}`, `Reset kata sandi akun ${row.role} atas NIY ${row.niy}`)
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

  const startIdx = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = filtered.length === 0 ? 0 : startIdx + rows.length - 1

  return (
    <div className="flex flex-col w-full">
      <div className="w-full bg-surface-container-lowest px-space-xl py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="hover:text-secondary cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface font-body-md-medium text-body-md-medium">Manajemen Admin & User</span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Server Pusat: Normal</span>
          </div>
          <span className="text-outline-variant">|</span>
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">database</span>
            <span>Sinkronisasi Terakhir: 14:02 WIB</span>
          </div>
        </div>
      </div>

      <div className="p-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div>
              <h1 className="font-headline-md text-headline-md text-primary tracking-tight">Manajemen Admin & User</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-3xl">
                Kelola hak akses akun sistem, penugasan per unit sekolah, otentikasi peran, dan kredensial pengguna terpusat.
              </p>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={openAdd}
                className="flex items-center gap-space-xs px-space-md py-2.5 bg-emerald-600 hover:bg-emerald-700 text-on-primary font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span>+ Tambah Admin/User Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Total Akun Aktif</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-sm text-headline-sm text-primary leading-tight">{state.adminUsers.length}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Pengguna</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm">+12 bulan ini</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">terverifikasi</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Superadmin Pusat</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-sm text-headline-sm text-primary leading-tight">{state.adminUsers.filter((u) => u.role === 'Superadmin').length}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-purple-700 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  <span>Hak akses penuh sistem</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Admin Unit Sekolah</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-sm text-headline-sm text-primary leading-tight">{state.adminUsers.filter((u) => u.role === 'Admin Unit').length}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">apartment</span>
                  <span>{state.units.length} unit sekolah terdaftar</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Guru & Staf Akun</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-on-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-sm text-headline-sm text-primary leading-tight">{state.staff.filter((s) => s.status === 'Aktif').length}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-slate-600 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">phonelink_setup</span>
                  <span>Terhubung mobile app SimPres</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs flex-1">
            <div className="relative min-w-[260px] flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
                placeholder="Cari nama, email, atau NIY..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Semua Role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="all">Semua Unit</option>
                {state.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select
                className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs justify-end">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 h-10 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors font-body-md-medium text-body-md-medium cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span>Reset Filter</span>
            </button>
            <button className="flex items-center gap-1.5 h-10 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Ekspor Data</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 px-space-md py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
            <span>{successMessage}</span>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider leading-tight">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input className="rounded w-4 h-4 text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
                  </th>
                  <th className="py-3.5 px-5 w-56 font-semibold">Nama & Profil Pengguna</th>
                  <th className="py-3.5 px-5 w-64 font-semibold">Email & NIY</th>
                  <th className="py-3.5 px-4 w-40 font-semibold">Role Sistem</th>
                  <th className="py-3.5 px-5 w-44 font-semibold">Unit Penugasan</th>
                  <th className="py-3.5 px-4 w-28 font-semibold">Status</th>
                  <th className="py-3.5 px-4 w-36 font-semibold text-right">Aksi & Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-md text-body-md">
                {rows.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-container-low/50 transition-colors ${user.rowBg}`}>
                    <td className="py-3.5 px-4 text-center w-10">
                      <input className="rounded w-4 h-4 text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
                    </td>
                    <td className="py-3.5 px-5 w-56">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-headline-sm text-headline-sm flex items-center justify-center font-semibold flex-shrink-0 ${user.roleBg} ${user.roleText}`}>
                          {user.initials}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{user.name}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">NIK: {user.nik}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 w-64">
                      <div className="flex flex-col min-w-0">
                        <span className="font-body-sm text-body-sm text-on-surface truncate">{user.email}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">NIY {user.niy}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 w-40">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md font-medium ${user.roleBg} ${user.roleText}`}>
                        <span className={`w-2 h-2 rounded-full ${user.roleDot}`}></span>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 w-44">
                      <div className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">{user.unitIcon}</span>
                        <span className="font-body-sm-medium text-body-sm-medium truncate">{user.unit}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 w-28">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm ${user.statusBg} ${user.statusText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.statusDot}`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 w-36 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(user)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                          title="Edit Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => openResetPassword(user)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-600 hover:bg-surface-container transition-colors cursor-pointer"
                          title="Reset Password"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                        </button>
                        {user.status === 'Aktif' ? (
                          <button
                            onClick={() => toggleStatus(user)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-surface-container transition-colors cursor-pointer"
                            title="Nonaktifkan Akun"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatus(user)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-surface-container transition-colors cursor-pointer"
                            title="Aktifkan Kembali"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                        )}
                        <button
                          onClick={() => openDelete(user)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-surface-container transition-colors cursor-pointer"
                          title="Hapus Pengguna"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="px-space-xl py-space-xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[32px] text-outline mb-2">search_off</span>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Tidak ada pengguna ditemukan</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-sm">
                Tidak ada akun yang cocok dengan filter pencarian Anda. Hapus beberapa filter atau reset pencarian.
              </p>
              <button
                onClick={resetFilters}
                className="mt-3 flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                <span>Reset Filter</span>
              </button>
            </div>
          )}

          <div className="px-space-md py-space-sm bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{startIdx}</span> - <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{endIdx}</span> dari <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length}</span> pengguna terdaftar
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={pNum === page
                    ? 'w-8 h-8 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm'
                    : 'w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm transition-colors'}
                  type="button"
                >
                  {pNum}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-space-md bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">Panduan Kebijolan Hak Akses Yayasan</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                Admin Unit hanya memiliki wewenang approval presensi dan penyesuaian jadwal pada unit bersangkutan. Otoritas penambahan akun guru dan reset kata sandi massal dipegang oleh Superadmin Pusat.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-surface-container-lowest hover:bg-white text-secondary font-body-sm-medium text-body-sm-medium rounded-lg shadow-sm whitespace-nowrap transition-colors cursor-pointer" type="button">
            Lihat Matriks Role & Izin
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={closeForm}>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-space-lg py-space-md bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{formMode === 'add' ? 'person_add' : 'edit'}</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary leading-tight">{formMode === 'add' ? 'Tambah User Baru' : 'Edit User'}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {formMode === 'add' ? 'Buat akun pengguna baru dan atur hak akses peran serta unit sekolah.' : 'Perbarui data akun pengguna dan konfigurasi hak aksesnya.'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg overflow-y-auto flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                  Nama Lengkap Beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">badge</span>
                  <input
                    className={`w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 ${formErrors.name ? 'focus:ring-rose-500/20' : 'focus:ring-secondary/20'}`}
                    placeholder="e.g. Wisna Yunita, S.Pd"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                {formErrors.name && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.name}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Alamat Email Resmi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                    <input
                      className={`w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 ${formErrors.email ? 'focus:ring-rose-500/20' : 'focus:ring-secondary/20'}`}
                      placeholder="wisna.y@sd.raudhatuljannah.sch.id"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                    />
                  </div>
                  {formErrors.email && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.email}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    NIY (Nomor Induk Yayasan) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">numbers</span>
                    <input
                      className={`w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 ${formErrors.niy ? 'focus:ring-rose-500/20' : 'focus:ring-secondary/20'}`}
                      placeholder="e.g. 049001054"
                      type="text"
                      value={form.niy}
                      onChange={(e) => updateField('niy', e.target.value)}
                    />
                  </div>
                  {formErrors.niy && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.niy}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Role / Peran Sistem <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full h-10 pl-3 pr-8 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none appearance-none cursor-pointer ${formErrors.role ? 'ring-2 ring-rose-500/30' : ''}`}
                      value={form.role}
                      onChange={(e) => updateField('role', e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                  </div>
                  {formErrors.role && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.role}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Unit Penugasan Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full h-10 pl-3 pr-8 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none appearance-none cursor-pointer ${formErrors.unitId ? 'ring-2 ring-rose-500/30' : ''}`}
                      value={form.unitId}
                      onChange={(e) => updateField('unitId', e.target.value)}
                    >
                      <option value="">Pilih Unit Penugasan</option>
                      {state.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.nama}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                  </div>
                  {formErrors.unitId && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.unitId}</span>}
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant -mt-2">
                Pilihan unit wajib untuk akun dengan peran <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Admin Unit</span> dan <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Guru/Pegawai</span>.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                  Status Akun <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">toggle_on</span>
                  <select
                    className={`w-full h-10 pl-10 pr-8 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none appearance-none cursor-pointer ${formErrors.status ? 'ring-2 ring-rose-500/30' : ''}`}
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                </div>
                {formErrors.status && <span className="font-body-sm text-body-sm text-rose-500">{formErrors.status}</span>}
              </div>

              {formMode === 'add' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                      Password Sementera
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">key</span>
                        <input
                          className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-mono font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest"
                          id="tempPasswordInput"
                          type="text"
                          value={form.password}
                          onChange={(e) => updateField('password', e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => updateField('password', generatePassword())}
                        className="h-10 px-3.5 bg-surface-container-low hover:bg-surface-container text-secondary font-body-sm-medium text-body-sm-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">autorenew</span>
                        <span>+ Generate Otomatis</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-space-md bg-surface-container-low rounded-xl flex items-start justify-between gap-space-sm">
                    <div className="flex flex-col">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">Wajib ganti password saat login pertama</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Pengguna akan diminta membuat password baru segera setelah pertama kali masuk ke portal web atau mobile app SimPres.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                      <input
                        checked={form.forceChange}
                        onChange={(e) => updateField('forceChange', e.target.checked)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="px-space-lg py-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">mark_email_read</span>
                <span>{formMode === 'add' ? 'Kredensial otomatis terkirim via notifikasi email.' : 'Perubahan tersimpan dan berlaku untuk login berikutnya.'}</span>
              </div>
              <div className="flex items-center gap-space-xs w-full sm:w-auto justify-end">
                <button
                  onClick={closeForm}
                  className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
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
    </div>
  )
}

export default AdminUserPage
