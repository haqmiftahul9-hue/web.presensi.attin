import { useState, useEffect } from 'react'
import EditUnitModal from '../components/EditUnitModal.jsx'
import { useSimPres } from '../store/simPresStore.jsx'

function UnitAdminSDPage() {
  const { state, dispatch } = useSimPres()
  const [searchTerm, setSearchTerm] = useState('')
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
    masuk: u.masuk,
    pulang: u.pulang,
    pegawai: state.staff.filter((s) => s.unitId === u.id).length,
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
    const headers = ['Nama Unit', 'Kode', 'Alamat', 'Radius (m)', 'Jam Masuk', 'Jam Pulang', 'Jumlah Pegawai', 'Status', 'Latitude', 'Longitude', 'Geofence']
    const rows = unitData.map((u) => [
      u.nama,
      u.kode,
      u.alamat,
      u.radius,
      u.masuk,
      u.pulang,
      u.pegawai,
      'Aktif',
      u.latitude?.toFixed(5) || '',
      u.longitude?.toFixed(5) || '',
      u.geofenceActive ? 'Aktif' : 'Nonaktif',
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
          masuk: data.jamMasuk,
          pulang: data.jamPulang,
          latitude: data.latitude,
          longitude: data.longitude,
          geofenceActive: data.geofenceActive,
        },
      })
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
        masuk: data.jamMasuk,
        pulang: data.jamPulang,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceActive: data.geofenceActive,
        total: 0,
        hadir: 0,
        icon: 'domain',
      }
      dispatch({ type: 'ADD_UNIT', payload: newUnit })
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
      dispatch({ type: 'DELETE_UNIT', payload: deleteTarget.id })
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
    const pegawaiList = state.staff.filter((s) => s.unitId === unit.id)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailUnit(null)}>
        <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary leading-snug">Detail Unit: {unit.nama}</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Informasi lengkap unit dan daftar pegawai.</p>
            </div>
            <button onClick={() => setDetailUnit(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="p-space-lg overflow-y-auto space-y-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Nama Unit</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.nama}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Kode Unit</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.kode}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Alamat</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.alamat}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Radius Geofence</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.radius} meter</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Latitude</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.latitude?.toFixed(5) || '-'}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Longitude</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.longitude?.toFixed(5) || '-'}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Geofence</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.geofenceActive ? 'Aktif' : 'Nonaktif'}</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Jam Masuk</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.masuk} WIB</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Jam Pulang</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.pulang} WIB</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Total Pegawai</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">{unit.pegawai} orang</p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Status</label>
                <p className="font-body-md text-body-md text-on-surface mt-1">Aktif</p>
              </div>
            </div>
            <div className="pt-4 border-t border-outline/20">
              <h3 className="font-body-md-medium text-body-md-medium text-on-surface mb-3">Daftar Pegawai ({pegawaiList.length})</h3>
              <div className="max-h-60 overflow-y-auto">
                {pegawaiList.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-8">Belum ada pegawai di unit ini</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline/30 text-on-surface-variant">
                        <th className="pb-2 pr-4">NIY</th>
                        <th className="pb-2 pr-4">Nama</th>
                        <th className="pb-2 pr-4">Jabatan</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/20">
                      {pegawaiList.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 pr-4 font-body-sm text-body-sm text-on-surface">{p.niy}</td>
                          <td className="py-2 pr-4 font-body-sm text-body-sm text-on-surface">{p.name}</td>
                          <td className="py-2 pr-4 font-body-sm text-body-sm text-on-surface-variant">{p.role}</td>
                          <td className="py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
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
          <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex justify-end">
            <button onClick={() => setDetailUnit(null)} className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-body-md-medium text-body-md-medium transition-colors cursor-pointer" type="button">Tutup</button>
          </div>
        </div>
      </div>
    )
  }

  const DeleteConfirmModal = () => {
    if (!deleteTarget) return null
    const unit = deleteTarget
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
        <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-error leading-snug">Hapus Unit?</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <button onClick={() => setDeleteTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="p-space-lg space-y-space-md">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px] text-rose-600">warning</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Hapus "{unit.nama}"?</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">Data unit dan informasi terkait akan dihapus. Apakah Anda yakin?</p>
            </div>
          </div>
          <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
            <button onClick={() => setDeleteTarget(null)} className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium text-body-md-medium transition-colors cursor-pointer" type="button">
              Batal
            </button>
            <button onClick={confirmDelete} className="px-space-md py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Hapus Unit</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      <NotifToast />
      <div className="px-space-xl py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="hover:text-secondary cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface font-body-md-medium text-body-md-medium">Manajemen Unit</span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Server Pusat: Normal</span>
          </div>
        </div>
      </div>

      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[24px]">apartment</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Manajemen Unit</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Kelola entitas unit sekolah di bawah naungan yayasan, parameter radius geofence, dan jam kerja operasional.</p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs self-start md:self-auto">
            <button
              onClick={handleExport}
              className="flex items-center gap-space-xs px-space-md py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Ekspor Data</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-space-xs px-space-md py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Filter: {filterStatus === 'all' ? 'Semua' : 'Aktif'}</span>
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-lg shadow-lg border border-outline/30 py-1 z-10">
                  <button
                    onClick={() => { setFilterStatus('all'); setShowFilter(false) }}
                    className={`w-full px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${filterStatus === 'all' ? 'bg-secondary/10 text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                    type="button"
                  >
                    Semua Status
                  </button>
                  <button
                    onClick={() => { setFilterStatus('active'); setShowFilter(false) }}
                    className={`w-full px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${filterStatus === 'active' ? 'bg-secondary/10 text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                    type="button"
                  >
                    Aktif
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-secondary"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Unit Terdaftar</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{state.units.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">domain</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                Semua berstatus aktif
              </span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">Aktif</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-emerald-600"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Pegawai</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{state.staff.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                Tersebar di {state.units.length} unit
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-amber-500"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Rata-rata Radius</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{Math.round(state.units.reduce((sum, u) => sum + u.radius, 0) / state.units.length)}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">radar</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                Toleransi standar
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-secondary"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Kepatuhan Geofence</span>
                <h3 className="font-headline-lg text-headline-lg text-secondary mt-1 leading-tight">98.4%</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                Zona kehadiran valid
              </span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">Valid</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
          <button
            onClick={() => { setEditingUnit(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-body-md-medium text-body-md-medium shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>+ Tambah Unit Baru</span>
          </button>
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-3 font-body-sm text-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
              placeholder="Cari nama unit, kode, atau alamat..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline/50 text-on-surface-variant font-label-md text-label-md uppercase tracking-wider leading-tight">
                  <th className="py-3 px-4">Nama Unit</th>
                  <th className="py-3 px-4">Alamat Lengkap</th>
                  <th className="py-3 px-4">Radius</th>
                  <th className="py-3 px-4">Jam Operasional</th>
                  <th className="py-3 px-4 text-center">Pegawai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/20 font-body-md text-body-md">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center text-on-surface-variant">
                      Tidak ada data unit
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((unit) => {
                    const kodePrefix = unit.kode.split('-')[1] || unit.kode.substring(0, 2)
                    const iconKey = kodePrefix.toUpperCase()
                    return (
                      <tr key={unit.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-label-md text-label-md font-semibold flex-shrink-0">
                              {iconKey}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug truncate max-w-xs">{unit.nama}</span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">Kode: {unit.kode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <p className="font-body-sm text-body-sm text-on-surface truncate" title={unit.alamat}>{unit.alamat}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm border border-secondary/20">
                            <span className="material-symbols-outlined text-[14px]">radar</span>
                            {unit.radius} m
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-on-surface font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                            <span>{unit.masuk} – {unit.pulang} WIB</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">{unit.pegawai}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant ml-1">Orang</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-label-sm text-label-sm font-label-sm">
                            Aktif
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetail(unit)}
                              className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Detail"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button
                              onClick={() => openEdit(unit)}
                              className="w-8 h-8 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(unit)}
                              className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                              type="button"
                              title="Hapus"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
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

          <div className="py-3 px-4 bg-surface-container-lowest border-t border-outline/30 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)}</strong> dari <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length}</strong> unit
            </span>
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                  className="h-8 px-2 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded border border-outline/30 focus:outline-none focus:ring-2 focus:ring-secondary/20 cursor-pointer"
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="px-2 font-body-sm text-body-sm text-on-surface-variant">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
