import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useSimPres, selectLeavesEnriched, selectActiveStaff, selectUnitOptions, selectCurrentUserRole, addActivityLog, selectUnitName } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'
import { selectLeavesByStatus, selectPendingLeaves, selectApprovedLeaves, selectRejectedLeaves } from '../store/simPresStore.jsx'
import LeaveRequestModal from '../components/LeaveRequestModal.jsx'
import LeaveDetailModal from '../components/LeaveDetailModal.jsx'

const statusTabs = [
  { id: 'semua', label: 'Semua', count: 0, color: 'bg-surface-container-high text-on-surface-variant' },
  { id: 'menunggu', label: 'Menunggu', count: 0, color: 'bg-amber-100 text-amber-800' },
  { id: 'disetujui', label: 'Disetujui', count: 0, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'ditolak', label: 'Ditolak', count: 0, color: 'bg-red-100 text-red-800' },
]

const jenisOptions = [
  'Semua Jenis Izin/Cuti',
  'Sakit',
  'Izin Pribadi',
  'Cuti',
]

const periodeOptions = [
  'Semua Periode',
  'Bulan Ini',
  'Tahun Ini',
]

const statusClassMap = {
  'Menunggu': 'bg-amber-50 text-amber-700',
  'Disetujui': 'bg-emerald-50 text-emerald-700',
  'Ditolak': 'bg-red-50 text-red-700',
}

const statusDotMap = {
  'Menunggu': 'bg-amber-500',
  'Disetujui': 'bg-emerald-500',
  'Ditolak': 'bg-red-500',
}

const jenisClassMap = {
  'Sakit': 'bg-blue-50 text-blue-700',
  'Izin Pribadi': 'bg-orange-50 text-orange-700',
  'Cuti Penting': 'bg-indigo-50 text-indigo-700',
  'Cuti Bersalin': 'bg-purple-50 text-purple-700',
  'Cuti Besar': 'bg-teal-50 text-teal-700',
}

const avatarClassMap = {
  'Sakit': 'bg-emerald-100 text-emerald-900',
  'Izin Pribadi': 'bg-amber-100 text-amber-900',
  'Cuti Penting': 'bg-indigo-100 text-indigo-900',
  'Cuti Bersalin': 'bg-purple-100 text-purple-900',
  'Cuti Besar': 'bg-teal-100 text-teal-900',
}

function PengajuanIzinCutiPage() {
  const { state, dispatch } = useSimPres()
  const [activeStatusTab, setActiveStatusTab] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua Status')
  const [filterJenis, setFilterJenis] = useState('Semua Jenis Izin/Cuti')
  const [filterBulan, setFilterBulan] = useState('Sep 2026')
  const [filterUnit, setFilterUnit] = useState('Semua Unit')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLeave, setDetailLeave] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [confirmRejectId, setConfirmRejectId] = useState(null)

  const staffList = selectActiveStaff(state)
  const unitOptions = selectUnitOptions(state)
  const currentUserRole = selectCurrentUserRole(state)
  const currentUser = state.currentUser
  const isSuperadmin = currentUserRole === 'Superadmin'
  const userUnitId = currentUser?.unitId

  // Unit options untuk dropdown filter
  const unitFilterOptions = ['Semua Unit', ...state.units.map(u => u.nama)]

  // Izin/cuti + identitas pegawai dari satu sumber data (store).
  const allLeaves = selectLeavesEnriched(state)
  const pendingLeaves = selectPendingLeaves(state)
  const approvedLeaves = selectApprovedLeaves(state)
  const rejectedLeaves = selectRejectedLeaves(state)

  // 1. Terapkan filter ke allLeaves
  const filtered = allLeaves.filter((l) => {
    // Unit filter - Superadmin bisa filter unit, Admin Unit hanya lihat unit sendiri
    if (isSuperadmin) {
      if (filterUnit !== 'Semua Unit' && l.unitName !== filterUnit) return false
    } else {
      // Admin Unit hanya bisa lihat unit sendiri
      if (userUnitId && l.unitId !== userUnitId) return false
    }
    // Tab status filter
    if (activeStatusTab !== 'semua') {
      const statusMap = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' }
      if (l.status !== statusMap[activeStatusTab]) return false
    }
    // Search filter
    if (searchTerm && !l.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !String(l.staffId).includes(searchTerm) && !l.keterangan?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    // Filter Status dropdown
    if (filterStatus !== 'Semua Status') {
      const statusMap = { 'Menunggu Persetujuan': 'Menunggu', 'Disetujui': 'Disetujui', 'Ditolak': 'Ditolak' }
      if (l.status !== statusMap[filterStatus]) return false
    }
    // Filter Jenis dropdown
    if (filterJenis !== 'Semua Jenis Izin/Cuti') {
      const jenisMap = { 'Sakit': 'Sakit', 'Izin Pribadi': 'Izin Pribadi', 'Cuti': 'Cuti' }
      // Match by checking if leave.jenis contains the filter value
      const filterKey = jenisMap[filterJenis]
      if (filterKey) {
        const matched = l.jenis === filterKey || l.jenis.includes(filterKey)
        if (!matched) return false
      }
    }
    // Filter Periode dropdown
    if (filterBulan !== 'Semua Periode') {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      // Parse period from leave.periode (format: "DD Mon YYYY - DD Mon YYYY" or "DD Mon YYYY")
      const periodStartStr = l.periode.split(' - ')[0]
      const periodDate = new Date(periodStartStr.replace(/(\d+) (\w+) (\d+)/, '$2 $1, $3'))
      if (filterBulan === 'Bulan Ini') {
        if (periodDate.getMonth() !== currentMonth || periodDate.getFullYear() !== currentYear) return false
      } else if (filterBulan === 'Tahun Ini') {
        if (periodDate.getFullYear() !== currentYear) return false
      }
    }
    return true
  })

  // 2. Hitung statistik dari filtered
  const filteredPending = filtered.filter(l => l.status === 'Menunggu').length
  const filteredApproved = filtered.filter(l => l.status === 'Disetujui').length
  const filteredRejected = filtered.filter(l => l.status === 'Ditolak').length

  // 3. Update tab counts dari filtered
  const updatedTabs = [
    { ...statusTabs[0], count: filtered.length },
    { ...statusTabs[1], count: filteredPending },
    { ...statusTabs[2], count: filteredApproved },
    { ...statusTabs[3], count: filteredRejected },
  ]

  // 4. Pagination
  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedData = filtered.slice(startIndex, endIndex)

  // Baris tabel memakai hasil join pegawai dari selector store.
  const tableData = paginatedData.map((leave) => ({
    id: leave.id,
    initials: initialsOf(leave.name),
    name: leave.name,
    niy: leave.niy,
    role: leave.role,
    jenis: leave.jenis,
    periode: leave.periode,
    durasi: leave.durasi,
    lampiran: leave.lampiran,
    status: leave.status,
    keterangan: leave.keterangan,
    unitName: leave.unitName,
    avatarClass: avatarClassMap[leave.jenis] || 'bg-surface-container text-on-surface',
    jenisClass: jenisClassMap[leave.jenis] || 'bg-surface-container text-on-surface',
    statusClass: statusClassMap[leave.status] || 'bg-surface-container text-on-surface',
    statusDot: statusDotMap[leave.status] || 'bg-outline',
  }))

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  const handleSaveLeave = (newLeave) => {
    const newId = state.leaves.length > 0 ? Math.max(...state.leaves.map(l => l.id)) + 1 : 1
    const leaveData = { ...newLeave, id: newId }
    dispatch({
      type: 'ADD_LEAVE',
      payload: leaveData,
    })
    const staff = state.staff.find(s => s.id === newLeave.staffId)
    addActivityLog(dispatch, state, 'Pengajuan', `Cuti/Izin • ${staff?.name || newLeave.staffId}`, `${staff?.name || 'Pegawai'} mengajukan ${newLeave.jenis} (${newLeave.durasi}): ${newLeave.keterangan}`, null, null, staff?.unitId)
  }

  const handleApprove = (id) => {
    const leave = state.leaves.find(l => l.id === id)
    const staff = leave ? state.staff.find(s => s.id === leave.staffId) : null
    dispatch({ type: 'UPDATE_LEAVE_STATUS', id, status: 'Disetujui' })
    if (leave && staff) {
      addActivityLog(dispatch, state, 'Persetujuan', `Cuti/Izin • ${staff.name}`, `Menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}`, null, null, staff.unitId)
    }
  }

  const handleReject = (id) => {
    setConfirmRejectId(id)
  }

  const handleConfirmReject = () => {
    if (confirmRejectId) {
      const leave = state.leaves.find(l => l.id === confirmRejectId)
      const staff = leave ? state.staff.find(s => s.id === leave.staffId) : null
      dispatch({ type: 'UPDATE_LEAVE_STATUS', id: confirmRejectId, status: 'Ditolak' })
      if (leave && staff) {
        addActivityLog(dispatch, state, 'Penolakan', `Cuti/Izin • ${staff.name}`, `Menolak pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}`, null, null, staff.unitId)
      }
      setConfirmRejectId(null)
    }
  }

  const handleCancelReject = () => {
    setConfirmRejectId(null)
  }

  const handleDetail = (leave) => {
    setDetailLeave(leave)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setDetailLeave(null)
  }

  const handleViewAttachment = (leave) => {
    // In real app, this would open the file. For now, show detail modal with attachment tab.
    setDetailLeave(leave)
    setIsDetailOpen(true)
  }

  const handleExportExcel = () => {
    // Parse period for filename
    let periodLabel = 'Semua_Periode'
    const now = new Date()
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    if (filterBulan === 'Bulan Ini') {
      periodLabel = `${months[now.getMonth()]}_${now.getFullYear()}`
    } else if (filterBulan === 'Tahun Ini') {
      periodLabel = `Tahun_${now.getFullYear()}`
    } else if (filterBulan && filterBulan !== 'Semua Periode') {
      periodLabel = filterBulan.replace(/\s+/g, '_')
    }

    // Unit label for filename
    let unitLabel = 'Semua_Unit'
    if (!isSuperadmin) {
      const userUnit = state.units.find(u => u.id === userUnitId)
      unitLabel = userUnit?.nama?.replace(/\s+/g, '_') || 'SDIT_Attin_Sumbar'
    } else if (filterUnit !== 'Semua Unit') {
      unitLabel = filterUnit.replace(/\s+/g, '_')
    }

    // Prepare data for export - using filtered data
    const exportData = filtered.map((leave, index) => {
      // Parse periode to get start and end dates
      const periodeParts = leave.periode.split(' - ')
      const tanggalMulai = periodeParts[0] || '-'
      const tanggalSelesai = periodeParts[1] || tanggalMulai

      return {
        No: index + 1,
        'Nama Pegawai': leave.name,
        'NIY/NIP': leave.niy,
        Unit: leave.unitName || '-',
        'Jenis Izin/Cuti': leave.jenis,
        'Tanggal Mulai': tanggalMulai,
        'Tanggal Selesai': tanggalSelesai,
        Durasi: leave.durasi,
        Alasan: leave.keterangan || '-',
        Status: leave.status,
      }
    })

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Title row
    const titleRow = [['Laporan Pengajuan Izin dan Cuti Pegawai']]
    const ws = XLSX.utils.aoa_to_sheet(titleRow, { origin: 'A1' })

    // Add data starting from row 3
    XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A3', skipHeader: false })

    // Set column widths
    const colWidths = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama Pegawai
      { wch: 18 },  // NIY/NIP
      { wch: 25 },  // Unit
      { wch: 25 },  // Jenis Izin/Cuti
      { wch: 18 },  // Tanggal Mulai
      { wch: 18 },  // Tanggal Selesai
      { wch: 12 },  // Durasi
      { wch: 30 },  // Alasan
      { wch: 15 },  // Status
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Izin Cuti')

    // Generate filename
    const fileName = `Laporan_Izin_Cuti_${unitLabel}_${periodLabel}.xlsx`

    // Save file
    XLSX.writeFile(wb, fileName)
  }

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="hover:text-secondary cursor-pointer transition-colors">Presensi</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Pengajuan Izin/Cuti</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">Pengajuan Izin/Cuti</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Kelola, tinjau berkas lampiran, dan proses verifikasi persetujuan dispensasi izin sakit dan cuti pegawai unit sekolah.
            </p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={handleExportExcel}
              className="h-10 px-space-md rounded-lg bg-surface-container-lowest text-primary-container font-body-md-medium text-body-md-medium shadow-sm hover:bg-surface-container-low transition-colors flex items-center gap-space-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Export Laporan (.XLSX)</span>
            </button>
            <button
              onClick={handleOpenModal}
              className="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-md-medium text-body-md-medium shadow-sm hover:bg-primary transition-colors flex items-center gap-space-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Ajukan Izin Staf (Manual TU)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Menunggu Persetujuan</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{filteredPending}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pengajuan</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-body-sm text-body-sm text-amber-700">Perlu tindakan verifikasi hari ini</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Disetujui Bulan Ini</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{filteredApproved}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pegawai</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Unit Terdaftar:</span>
              <span className="font-body-sm-medium text-body-sm-medium text-emerald-700">
                {isSuperadmin 
                  ? (filterUnit === 'Semua Unit' ? 'Semua Unit (4 Unit)' : `${filterUnit} (Tercatat 100%)`)
                  : `${currentUser?.unitId ? state.units.find(u => u.id === currentUser.unitId)?.nama : 'SDIT Attin Sumbar'} (Tercatat 100%)`
                }
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Ditolak / Dibatalkan</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{filteredRejected}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pengajuan</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">cancel</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="font-body-sm text-body-sm text-red-700">Dokumen tidak lengkap / masa kedaluwarsa</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md">
          <div className="flex items-center justify-between flex-wrap gap-space-sm">
            <div className="flex items-center gap-space-2xs bg-surface-container-low p-1 rounded-lg">
              {updatedTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveStatusTab(tab.id); setCurrentPage(1) }}
                  className={`px-space-md py-1.5 rounded-lg flex items-center gap-space-xs font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer ${
                    activeStatusTab === tab.id ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${tab.color}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>
                {isSuperadmin 
                  ? `Filter Aktif: ${filterUnit}` 
                  : `Filter Aktif: Unit ${currentUser?.unitId ? state.units.find(u => u.id === currentUser.unitId)?.nama : 'SDIT Attin Sumbar'}`
                }
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
            <div className="md:col-span-5 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input
                className="w-full h-10 pl-9 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                placeholder="Cari nama pegawai, NIY, atau keterangan..."
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="md:col-span-2">
              <div className="relative">
                <select
                  className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                >
                  <option>Semua Status</option>
                  <option>Menunggu Persetujuan</option>
                  <option>Disetujui</option>
                  <option>Ditolak</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                  value={filterJenis}
                  onChange={(e) => { setFilterJenis(e.target.value); setCurrentPage(1) }}
                >
                  {jenisOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            {isSuperadmin && (
              <div className="md:col-span-2">
                <div className="relative">
                  <select
                    className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                    value={filterUnit}
                    onChange={(e) => { setFilterUnit(e.target.value); setCurrentPage(1) }}
                  >
                    {unitFilterOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <div className="relative">
                <select
                  className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                  value={filterBulan}
                  onChange={(e) => { setFilterBulan(e.target.value); setCurrentPage(1) }}
                >
                  {periodeOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="py-2 px-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[28%]">Pegawai</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[11%]">Unit</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[10%]">Jenis</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[12%]">Periode</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[7%]">Durasi</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[12%]">Lampiran</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w=[10%]">Status</th>
                  <th className="py-2 px-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-[10%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md flex-shrink-0 ${row.avatarClass}`}>
                          {row.initials}
                        </div>
                        <div className="flex flex-col min-w-0 overflow-hidden">
                          <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate block">{row.name}</span>
                          <span className="font-body-xs text-body-xs text-on-surface-variant truncate block">{row.niy} • {row.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-body-xs text-body-xs text-on-surface-variant whitespace-nowrap">
                      {row.unitName || '-'}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-body-xs text-body-xs ${row.jenisClass} whitespace-nowrap`}>
                        {row.jenis}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-body-xs text-body-xs text-on-surface whitespace-nowrap">
                      {row.periode}
                    </td>
                    <td className="py-2 px-2 font-body-xs text-body-xs text-primary whitespace-nowrap">
                      {row.durasi}
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleViewAttachment(row)} className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-surface-container-low text-secondary hover:bg-surface-container hover:text-primary transition-colors font-body-xs text-body-xs cursor-pointer w-full justify-center" title={row.lampiran}>
                        <span className="material-symbols-outlined text-[14px] flex-shrink-0">attach_file</span>
                        <span className="truncate block max-w-[100px]">{row.lampiran}</span>
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body-xs text-body-xs ${row.statusClass} whitespace-nowrap flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot} flex-shrink-0`}></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {row.status === 'Menunggu' ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleApprove(row.id)} className="h-7 w-7 rounded bg-emerald-600 text-on-primary hover:bg-emerald-700 transition-colors flex items-center justify-center shadow-sm cursor-pointer flex-shrink-0" type="button" title="Setujui">
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button onClick={() => handleReject(row.id)} className="h-7 w-7 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0" type="button" title="Tolak">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                          <button onClick={() => handleDetail(row)} className="h-7 w-7 rounded text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer flex-shrink-0" type="button" title="Detail">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <button onClick={() => handleDetail(row)} className="h-7 w-7 rounded bg-surface-container-low hover:bg-surface-container text-secondary flex items-center justify-center transition-colors cursor-pointer flex-shrink-0" type="button" title="Detail">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{startIndex + 1}</span>–{startIndex + paginatedData.length > filtered.length ? filtered.length : startIndex + paginatedData.length} dari <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length}</span> pengajuan izin &amp; cuti
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                className="h-8 px-space-sm rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors flex items-center gap-1 font-body-sm text-body-sm cursor-not-allowed"
                disabled={currentPage === 1}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Sebelumnya</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg font-body-sm-medium text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === pageNum ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                  type="button"
                >
                  {pageNum}
                </button>
              ))}
              <button
                className="h-8 px-space-sm rounded-lg bg-surface-container-low text-on-surface hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm cursor-pointer"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                type="button"
              >
                <span>Berikutnya</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-space-xs mb-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
                <h3 className="font-body-md-medium text-body-md-medium text-primary">Aturan &amp; Ketentuan Cuti Pegawai Yayasan</h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Pedoman verifikasi otomatis berdasarkan SK Direktur Yayasan Pendidikan No. 42/SK-DIR/2025.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                  <span className="font-body-sm-medium text-body-sm-medium text-primary">1. Izin Sakit &gt; 2 Hari</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Wajib melampirkan surat keterangan dokter atau klinik dengan cap stempel basah / QR barcode verifikasi digital faskes.
                  </p>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                  <span className="font-body-sm-medium text-body-sm-medium text-primary">2. Cuti Melahirkan &amp; Bersalin</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Maksimal 90 hari kalender, diajukan paling lambat 14 hari sebelum hari perkiraan lahir (HPL) dari dokter spesialis.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span>Batas Waktu Validasi Unit: <strong className="text-on-surface">2 x 24 Jam Kerja</strong></span>
              <a className="text-secondary hover:underline font-body-sm-medium text-body-sm-medium flex items-center gap-1 cursor-pointer">
                <span>Unduh Pedoman Lengkap (PDF)</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <h3 className="font-body-md-medium text-body-md-medium text-primary">Statistik Kuota SDIT Attin Sumbar</h3>
                <span className="font-label-sm text-label-sm text-secondary bg-blue-50 px-2 py-0.5 rounded-full">T.A 2026/2027</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Monitor utilisasi jatah tahunan 38 guru dan pegawai tetap.
              </p>
              <div className="flex flex-col gap-space-sm">
                <div>
                  <div className="flex justify-between font-body-sm text-body-sm mb-1">
                    <span className="text-on-surface-variant">Cuti Tahunan Digunakan</span>
                    <span className="font-body-sm-medium text-body-sm-medium text-primary">64% (292 / 456 Hari)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-body-sm text-body-sm mb-1">
                    <span className="text-on-surface-variant">Tingkat Ketidakhadiran Izin/Sakit</span>
                    <span className="font-body-sm-medium text-body-sm-medium text-emerald-700">1.8% (Sangat Sehat)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-space-md p-space-xs rounded-lg bg-surface-container-low flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-outline text-[18px]">verified_user</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Sinkronisasi Data SimPres Pusat: <strong className="text-on-surface">Realtime</strong></span>
            </div>
          </div>
</div>
      </div>
      </div>

      {/* Confirm Reject Dialog */}
      {confirmRejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={handleCancelReject}>
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-space-lg py-space-md border-b border-outline/20 flex items-center justify-between bg-surface-container/50">
              <h3 className="font-headline-sm text-headline-sm text-primary">Konfirmasi Tolak</h3>
              <button onClick={handleCancelReject} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg text-center">
              <span className="material-symbols-outlined text-red-500 text-[48px] mb-4 block">help_outline</span>
              <p className="font-body-md text-body-md text-on-surface mb-2">Tolak pengajuan ini?</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Status akan berubah menjadi <strong className="text-red-600">Ditolak</strong>. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
              <button onClick={handleCancelReject} className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium text-body-md-medium transition-colors cursor-pointer" type="button">
                Batal
              </button>
              <button onClick={handleConfirmReject} className="px-space-md py-2 rounded-lg bg-red-600 hover:bg-red-700 text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Tolak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <LeaveDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        leave={detailLeave}
      />

      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLeave}
        staffList={staffList}
        units={state.units}
      />
    </>
  )
}

export default PengajuanIzinCutiPage
