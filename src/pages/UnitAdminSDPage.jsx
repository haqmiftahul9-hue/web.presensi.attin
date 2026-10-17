import { useState, useEffect } from 'react'
import EditUnitModal from '../components/EditUnitModal.jsx'
import { useSimPres, selectUnitName, addActivityLog, selectSearchTerm } from '../store/simPresStore.jsx'
import { daftarJamKerja } from '../data/jamKerja.js'

function ringkasanJamKerja() {
  return daftarJamKerja()
    .map((h) => `${h.hari} ${h.jamKerja}`)
    .join(' • ')
}

function UnitAdminSDPage() {
  const { state, dispatch } = useSimPres()
  const searchTerm = selectSearchTerm(state)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [notification, setNotification] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [detailUnit, setDetailUnit] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const unitData = state.units.map((u) => ({
    id: u.id,
    kode: u.kode,
    nama: u.nama,
    alamat: u.alamat,
    radius: u.radius,
    latitude: u.latitude,
    longitude: u.longitude,
    geofenceActive: u.geofenceActive,
    icon: u.icon,
    pegawai: state.staff.filter((s) => s.unitId === u.id).length,
    admin: state.adminUsers.filter((a) => a.unitId === u.id).length,
    aktif: true,
  }))

  const filtered = unitData.filter((u) => {
    const matchesSearch =
      u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.kode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'active' && u.aktif)
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 2000)
  }

  const openEdit = (unit) => {
    setEditingUnit(unit)
    setShowModal(true)
  }

  const openDetail = (unit) => {
    setDetailUnit(unit)
  }

  const handleExport = () => {
    const headers = ['Nama Unit', 'Kode', 'Alamat', 'Radius (m)', 'Jumlah Pegawai', 'Status', 'Latitude', 'Longitude', 'Geofence', 'Jam Kerja Global']
    const rows = unitData.map((u) => [
      u.nama,
      u.kode,
      u.alamat,
      u.radius,
      u.pegawai,
      'Aktif',
      u.latitude?.toFixed(5) || '',
      u.longitude?.toFixed(5) || '',
      u.geofenceActive ? 'Aktif' : 'Nonaktif',
      ringkasanJamKerja(),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `unit-data-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    showNotification('Data unit berhasil diekspor')
  }

  const handleSave = (data) => {
    if (editingUnit) {
      const isDuplicate = state.units.some(
        (u) => u.id !== editingUnit.id && u.nama.toLowerCase() === data.name.toLowerCase()
      )
      if (isDuplicate) {
        showNotification('Nama unit sudah digunakan', 'error')
        return
      }
      dispatch({
        type: 'UPDATE_UNIT',
        payload: {
          id: editingUnit.id,
          nama: data.name,
          alamat: data.address,
          radius: data.radius,
          latitude: data.latitude,
          longitude: data.longitude,
          geofenceActive: data.geofenceActive,
        },
      })
      addActivityLog(dispatch, state, 'Ubah', `Unit • ${data.name}`, `Memperbarui data unit: radius ${data.radius}m, geofence ${data.geofenceActive ? 'aktif' : 'nonaktif'}`, null, null, editingUnit.unitId)
      showNotification('Unit berhasil diperbarui')
    } else {
      const isDuplicate = state.units.some(
        (u) => u.nama.toLowerCase() === data.name.toLowerCase()
      )
      if (isDuplicate) {
        showNotification('Nama unit sudah digunakan', 'error')
        return
      }
      const newUnit = {
        id: data.name.toLowerCase().replace(/\s+/g, '-'),
        kode: `UNT-${data.name.toUpperCase().replace(/\s+/g, '-').substring(0, 10)}`,
        nama: data.name,
        alamat: data.address,
        radius: data.radius,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceActive: data.geofenceActive,
        total: 0,
        hadir: 0,
        icon: 'domain',
      }
      dispatch({ type: 'ADD_UNIT', payload: newUnit })
      addActivityLog(dispatch, state, 'Tambah', `Unit • ${data.name}`, `Tambah unit baru ${data.name} (radius ${data.radius}m)`, null, null, newUnit.unitId)
      showNotification('Unit baru berhasil ditambahkan')
    }
    setShowModal(false)
    setEditingUnit(null)
  }

  const handleDelete = (unit) => {
    setDeleteTarget(unit)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      const unitName = deleteTarget.nama
      dispatch({ type: 'DELETE_UNIT', payload: deleteTarget.id })
      addActivityLog(dispatch, state, 'Hapus', `Unit • ${unitName}`, `Hapus unit ${unitName} beserta data terkait`, null, null, deleteTarget.unitId)
      showNotification(`Unit ${deleteTarget.nama} berhasil dihapus`)
      setDeleteTarget(null)
    }
  }

  const NotifToast = () => {
    if (!notification) return null
    const colors = {
      success: 'bg-emerald-500',
      info: 'bg-secondary',
      error: 'bg-rose-500',
    }
    return (
      <div className={`fixed top-4 right-4 ${colors[notification.type]} text-on-primary px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[20px]">{notification.type === 'error' ? 'error' : 'check'}</span>
        <span>{notification.message}</span>
      </div>
    )
  }

  const DetailModal = () => {
    if (!detailUnit) return null
    const unit = detailUnit
    const pegawaiList = [...state.staff.filter((s) => s.unitId === unit.id), ...state.adminUsers.filter((a) => a.unitId === unit.id)]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setDetailUnit(null)}>
        <div className="relative w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-card">
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug">Detail Unit: {unit.nama}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Informasi konfigurasi unit dan daftar pegawai.</p>
            </div>
            <button onClick={() => setDetailUnit(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Nama Unit</label>
                <p className="text-xs font-bold text-foreground mt-0.5">{unit.nama}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Kode Unit</label>
                <p className="text-xs font-bold text-foreground mt-0.5 font-mono">{unit.kode}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Alamat</label>
                <p className="text-xs text-foreground mt-0.5">{unit.alamat}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Radius Geofence</label>
                <p className="text-xs font-bold text-primary mt-0.5">{unit.radius} meter</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Geofence Status</label>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5 border ${unit.geofenceActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-secondary text-secondary-foreground border-border'}`}>
                  {unit.geofenceActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Koordinat (Lat, Lng)</label>
                <p className="text-xs text-foreground mt-0.5 font-mono">{unit.latitude?.toFixed(5) || '-'}, {unit.longitude?.toFixed(5) || '-'}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Pegawai Terdaftar</label>
                <p className="text-xs font-bold text-foreground mt-0.5">{unit.pegawai} orang</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center justify-between">
                <span>Daftar Pegawai Terdaftar</span>
                <span className="text-[11px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{pegawaiList.length} Pegawai</span>
              </h3>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
                {pegawaiList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Belum ada pegawai di unit ini</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-2.5 px-3">NIY</th>
                        <th className="py-2.5 px-3">Nama</th>
                        <th className="py-2.5 px-3">Jabatan</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pegawaiList.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3 font-mono text-muted-foreground">{p.niy}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">{p.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{p.role}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex justify-end">
            <button onClick={() => setDetailUnit(null)} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors shadow-xs cursor-pointer" type="button">Tutup</button>
          </div>
        </div>
      </div>
    )
  }

  const DeleteConfirmModal = () => {
    if (!deleteTarget) return null
    const unit = deleteTarget
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setDeleteTarget(null)}>
        <div className="relative w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-card">
            <div>
              <h2 className="text-base font-bold text-destructive leading-snug">Hapus Unit?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <button onClick={() => setDeleteTarget(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3 text-destructive">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">Hapus "{unit.nama}"?</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Seluruh data unit dan radius geofence terkait akan dihapus dari sistem. Lanjutkan penghapusan?</p>
            </div>
          </div>
          <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
            <button onClick={() => setDeleteTarget(null)} className="h-9 px-4 rounded-lg border border-input bg-card hover:bg-accent text-foreground text-xs font-semibold transition-colors shadow-xs cursor-pointer" type="button">
              Batal
            </button>
            <button onClick={confirmDelete} className="h-9 px-4 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>Hapus Unit</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full min-w-0">
      <NotifToast />
      <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
        {/* Header Breadcrumb & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Superadmin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-foreground font-semibold">Manajemen Unit</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Server Pusat: Normal</span>
          </div>
        </div>

        {/* Title and Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Manajemen Unit Sekolah</h1>
              <p className="text-xs text-muted-foreground">Kelola entitas unit sekolah di bawah naungan yayasan, radius geofence, dan koordinat presensi.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={handleExport}
              className="h-9 px-3.5 bg-card hover:bg-accent border border-input text-foreground font-medium text-xs rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px] text-muted-foreground">file_download</span>
              <span>Ekspor Data</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="h-9 px-3.5 bg-card hover:bg-accent border border-input text-foreground font-medium text-xs rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px] text-muted-foreground">tune</span>
                <span>Filter: {filterStatus === 'all' ? 'Semua' : 'Aktif'}</span>
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border py-1 z-10">
                  <button
                    onClick={() => { setFilterStatus('all'); setShowFilter(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${filterStatus === 'all' ? 'bg-primary text-primary-foreground font-semibold' : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'}`}
                    type="button"
                  >
                    Semua Status
                  </button>
                  <button
                    onClick={() => { setFilterStatus('active'); setShowFilter(false) }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${filterStatus === 'active' ? 'bg-primary text-primary-foreground font-semibold' : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'}`}
                    type="button"
                  >
                    Aktif
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { setEditingUnit(null); setShowModal(true) }}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>Tambah Unit Baru</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Unit</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.units.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">domain</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Semua aktif
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Aktif</span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Pegawai</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{state.staff.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">trending_up</span>
                Tersebar di {state.units.length} unit
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rata-rata Radius</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">{Math.round(state.units.reduce((sum, u) => sum + u.radius, 0) / state.units.length)}<span className="text-sm font-semibold text-muted-foreground ml-1">m</span></h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">radar</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-amber-600">location_on</span>
                Toleransi standar
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Kepatuhan Geofence</span>
                <h3 className="text-3xl font-bold tracking-tight text-foreground mt-1.5 leading-none">98.4%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Zona kehadiran valid
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Valid</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px]">search</span>
          <input
            className="w-full h-9 pl-8 pr-3 text-xs bg-card border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring shadow-xs transition-colors"
            placeholder="Cari nama unit, kode, atau alamat..."
            type="text"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
          />
        </div>

        {/* Table Container */}
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="sp-table-wrap">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-3.5">Nama Unit</th>
                  <th className="py-3 px-3.5">Alamat Lengkap</th>
                  <th className="py-3 px-3.5">Radius</th>
                  <th className="py-3 px-3.5">Jam Kerja</th>
                  <th className="py-3 px-3.5 text-center">Pegawai</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-muted-foreground text-xs">
                      Tidak ada data unit yang sesuai.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((unit) => {
                    const kodePrefix = unit.kode.split('-')[1] || unit.kode.substring(0, 2)
                    const iconKey = kodePrefix.toUpperCase()
                    return (
                      <tr key={unit.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {iconKey}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground leading-snug truncate max-w-xs">{unit.nama}</span>
                              <span className="text-[11px] text-muted-foreground font-mono mt-0.5">Kode: {unit.kode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 max-w-xs">
                          <p className="text-muted-foreground truncate" title={unit.alamat}>{unit.alamat}</p>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-secondary-foreground font-mono text-[11px]">
                            <span className="material-symbols-outlined text-[13px] text-muted-foreground">radar</span>
                            {unit.radius} m
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <span className="material-symbols-outlined text-[15px] text-muted-foreground">schedule</span>
                            <span title={ringkasanJamKerja()}>Global (07:00)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono">
                          <span className="font-bold text-foreground">{unit.pegawai}</span>
                          <span className="text-muted-foreground text-[11px] ml-1">Staf</span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openDetail(unit)}
                              className="w-7 h-7 rounded-md bg-card hover:bg-muted border border-border text-foreground flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Detail"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                            <button
                              onClick={() => openEdit(unit)}
                              className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(unit)}
                              className="w-7 h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Hapus"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Menampilkan <strong className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> dari <strong className="font-semibold text-foreground">{filtered.length}</strong> unit
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                  className="h-7 px-2 bg-card text-foreground font-medium rounded border border-input focus:outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-input bg-card flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_left</span>
                </button>
                <span className="px-1 text-foreground font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-input bg-card flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <EditUnitModal
          unit={editingUnit}
          onClose={() => { setShowModal(false); setEditingUnit(null) }}
          onSave={handleSave}
        />
      )}
      <DetailModal />
      <DeleteConfirmModal />
    </div>
  )
}

export default UnitAdminSDPage
