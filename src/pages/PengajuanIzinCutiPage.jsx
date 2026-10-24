import { useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../utils/download.js'
import { useSimPres, selectLeavesEnriched, selectActiveStaff, selectCurrentUserRole, addActivityLog, selectUnitName, selectActiveUnitId, selectCanSwitchUnit, selectIsAllUnits, ALL_UNITS, selectSearchTerm } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'
import { selectLeavesByStatus, selectPendingLeaves, selectApprovedLeaves, selectRejectedLeaves } from '../store/simPresStore.jsx'
import LeaveRequestModal from '../components/LeaveRequestModal.jsx'
import LeaveDetailModal from '../components/LeaveDetailModal.jsx'
import {
  JENIS_UTAMA, SEMUA_JENIS, kelompokIzinCuti,
  WARNA_STATUS_PORTAL, WARNA_TITIK_STATUS,
} from '../data/jenisIzinCuti.js'
import { rentangPengajuan } from '../data/presensiMobile.js'

const statusTabs = [
  { id: 'semua', label: 'Semua', count: 0, color: 'bg-muted text-muted-foreground' },
  { id: 'menunggu', label: 'Menunggu', count: 0, color: 'bg-amber-100 text-amber-800' },
  { id: 'disetujui', label: 'Disetujui', count: 0, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'ditolak', label: 'Ditolak', count: 0, color: 'bg-red-100 text-red-800' },
]

// Pilihan jenis, warna badge, dan kelas avatar SEMUA membaca daftar jenis
// terpusat (data/jenisIzinCuti.js), bukan daftar lokal yang bisa berbeda dari
// form mobile. Karena itu pengajuan "Cuti Melahirkan" yang dibuat guru langsung
// tampil dengan warna dan filter yang benar di halaman ini.
const jenisOptions = [
  'Semua Jenis Izin/Cuti',
  'Semua Cuti',
  'Semua Izin',
  ...JENIS_UTAMA.map((j) => j.nama),
  'Cuti Penting',
  'Cuti Menikah',
  'Tugas Luar',
]

const periodeOptions = [
  'Semua Periode',
  'Bulan Ini',
  'Tahun Ini',
]

// Peta warna status dipakai bersama dengan modul jenis izin/cuti supaya
// badge "Menunggu / Disetujui / Ditolak" sama di portal dan mobile.
const statusClassMap = WARNA_STATUS_PORTAL
const statusDotMap = WARNA_TITIK_STATUS
const jenisClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warna]))
const avatarClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warnaAvatar]))

function PengajuanIzinCutiPage() {
  const { state, dispatch } = useSimPres()
  const [activeStatusTab, setActiveStatusTab] = useState('semua')
  const searchTerm = selectSearchTerm(state)
  const [filterStatus, setFilterStatus] = useState('Semua Status')
  const [filterJenis, setFilterJenis] = useState('Semua Jenis Izin/Cuti')
  const [filterBulan, setFilterBulan] = useState('Sep 2026')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLeave, setDetailLeave] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [confirmRejectId, setConfirmRejectId] = useState(null)

  const staffList = selectActiveStaff(state)
  const currentUserRole = selectCurrentUserRole(state)
  const currentUser = state.currentUser
  const isSuperadmin = currentUserRole === 'Superadmin'
  const canSwitchUnit = isSuperadmin
  const userUnitId = selectActiveUnitId(state)
  // Unit terpilih (store utama) menggantikan filter unit lokal.
  const selectedUnitObj = state.units.find(u => u.id === userUnitId)
  const filterUnit = isSuperadmin
    ? (selectedUnitObj ? selectedUnitObj.nama : 'Semua Unit')
    : (selectedUnitObj ? selectedUnitObj.nama : 'Semua Unit')

  // Ambil konfigurasi penandatangan dari global settings
  const settings = state.settings
  const penandatangan = settings.penandatangan || {}
  
  // Helper untuk mendapatkan Kepala Sekolah per unit
  const getKepalaSekolah = (unitId) => {
    return penandatangan.kepalaSekolah?.[unitId] || { nama: '', jabatan: `Kepala ${state.units.find(u => u.id === unitId)?.nama || 'Sekolah'}` }
  }
  
  // Helper untuk mendapatkan Admin TU
  const getAdminTU = () => {
    return {
      kepalaTU: penandatangan.adminTU?.kepalaTU || { nama: '', jabatan: 'Kepala Tata Usaha' },
      operatorSistem: penandatangan.adminTU?.operatorSistem || { nama: '', jabatan: 'Operator Sistem' },
    }
  }
  
  // Helper untuk mendapatkan Ketua Yayasan
  const getKetuaYayasan = () => {
    return penandatangan.kepalaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
  }

  // Izin/cuti + identitas pegawai dari satu sumber data (store).
  // selectLeavesEnriched sudah membatasi data ke unit terpilih, jadi halaman
  // ini tidak lagi memfilter unit secara manual.
  const allLeaves = selectLeavesEnriched(state)
  const pendingLeaves = selectPendingLeaves(state)
  const approvedLeaves = selectApprovedLeaves(state)
  const rejectedLeaves = selectRejectedLeaves(state)

  // 1. Terapkan filter ke allLeaves
  const filtered = allLeaves.filter((l) => {
    // Unit sudah dibatasi oleh unit terpilih di store.
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
    // Filter Jenis dropdown: "Semua Cuti"/"Semua Izin" mencocokkan kelompoknya,
    // selain itu cocok nama persis.
    if (filterJenis === 'Semua Cuti' || filterJenis === 'Semua Izin') {
      if (kelompokIzinCuti(l.jenis) !== filterJenis.replace('Semua ', '')) return false
    } else if (filterJenis !== 'Semua Jenis Izin/Cuti') {
      if (l.jenis !== filterJenis) return false
    }
    // Filter Periode dropdown. Pengajuan baru menyimpan tanggal ISO (l.mulai),
    // jadi bulan/tahun dibaca dari sana; pengajuan lama jatuh ke teks periode.
    if (filterBulan !== 'Semua Periode') {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const rentang = rentangPengajuan(l)
      if (!rentang) return false
      const mulai = new Date(`${rentang.mulai}T00:00:00`)
      if (Number.isNaN(mulai.getTime())) return false
      if (filterBulan === 'Bulan Ini') {
        if (mulai.getMonth() !== currentMonth || mulai.getFullYear() !== currentYear) return false
      } else if (filterBulan === 'Tahun Ini') {
        if (mulai.getFullYear() !== currentYear) return false
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
    avatarClass: avatarClassMap[leave.jenis] || 'bg-muted text-muted-foreground',
    jenisClass: jenisClassMap[leave.jenis] || 'bg-muted text-muted-foreground',
    statusClass: statusClassMap[leave.status] || 'bg-muted text-muted-foreground',
    statusDot: statusDotMap[leave.status] || 'bg-muted-foreground',
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

    // Unit label for filename — mengikuti unit terpilih di store
    const unitLabel = selectIsAllUnits(state)
      ? 'Semua_Unit'
      : (filterUnit || '').replace(/\s+/g, '_')

    // Prepare data for export - using filtered data
    const exportData = filtered.map((leave, index) => {
      // Parse periode to get start and end dates
      const periodeParts = leave.periode.split(' - ')
      const tanggalMulai = periodeParts[0] || '-'
      const tanggalSelesai = periodeParts[1] || tanggalMulai

      return {
        No: index + 1,
        'Nama Pegawai': leave.name,
        'NIY': leave.niy,
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
      { wch: 18 },  // NIY
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
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
  }

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
          {/* Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="hover:text-foreground cursor-pointer transition-colors">Home</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Presensi</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="font-semibold text-foreground">Pengajuan Izin/Cuti</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengajuan Izin &amp; Cuti</h1>
              <p className="text-xs text-muted-foreground">
                Kelola, tinjau berkas lampiran, dan proses verifikasi persetujuan dispensasi izin sakit dan cuti pegawai.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="h-9 px-3.5 rounded-lg bg-card hover:bg-accent border border-input text-foreground font-medium text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px] text-muted-foreground">file_download</span>
                <span>Export Laporan (.XLSX)</span>
              </button>
              <button
                onClick={handleOpenModal}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>
                <span>Ajukan Izin Staf (Manual)</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Menunggu Persetujuan</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{filteredPending}</span>
                    <span className="text-xs font-medium text-muted-foreground">Pengajuan</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Perlu tindakan verifikasi hari ini</span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Disetujui Bulan Ini</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{filteredApproved}</span>
                    <span className="text-xs font-medium text-muted-foreground">Pegawai</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Unit:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectIsAllUnits(state)
                    ? `Semua Unit (${state.units.length} Unit)`
                    : `${filterUnit}`
                  }
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ditolak / Dibatalkan</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{filteredRejected}</span>
                    <span className="text-xs font-medium text-muted-foreground">Pengajuan</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">cancel</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs">
                <span className="text-destructive font-medium">Dokumen tidak lengkap / kedaluwarsa</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                {updatedTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveStatusTab(tab.id); setCurrentPage(1) }}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      activeStatusTab === tab.id
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                      activeStatusTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>
                  {`Filter Scope: ${selectIsAllUnits(state) ? 'Semua Unit' : filterUnit}`}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-5 relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px]">search</span>
                <input
                  className="w-full h-9 pl-8 pr-3 bg-card border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                  placeholder="Cari nama pegawai, NIY, atau keterangan..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value }); setCurrentPage(1) }}
                />
              </div>
              <div className="md:col-span-2">
                <div className="relative">
                  <select
                    className="w-full h-9 pl-2.5 pr-7 bg-card border border-input rounded-lg text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                  >
                    <option>Semua Status</option>
                    <option>Menunggu Persetujuan</option>
                    <option>Disetujui</option>
                    <option>Ditolak</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    className="w-full h-9 pl-2.5 pr-7 bg-card border border-input rounded-lg text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring cursor-pointer"
                    value={filterJenis}
                    onChange={(e) => { setFilterJenis(e.target.value); setCurrentPage(1) }}
                  >
                    {jenisOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
                </div>
              </div>
              {canSwitchUnit && (
                <div className="md:col-span-2">
                  <div className="relative">
                    <select
                      className="w-full h-9 pl-2.5 pr-7 bg-card border border-input rounded-lg text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring cursor-pointer"
                      value={userUnitId}
                      onChange={(e) => { dispatch({ type: 'SET_SELECTED_UNIT', payload: e.target.value }); setCurrentPage(1) }}
                    >
                      <option value={ALL_UNITS}>Semua Unit</option>
                      {state.units.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.nama}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="sp-table-wrap">
              <table className="w-full text-left table-fixed">
                <thead className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5 w-[28%]">Pegawai</th>
                    <th className="py-2.5 px-2.5 w-[11%]">Unit</th>
                    <th className="py-2.5 px-2.5 w-[12%]">Jenis</th>
                    <th className="py-2.5 px-2.5 w-[13%]">Periode</th>
                    <th className="py-2.5 px-2.5 text-center w-[7%]">Durasi</th>
                    <th className="py-2.5 px-2.5 text-center w-[11%]">Lampiran</th>
                    <th className="py-2.5 px-2.5 text-center w-[8%]">Status</th>
                    <th className="py-2.5 px-2.5 text-right w-[10%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {tableData.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                            {row.initials}
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
                            <span className="text-xs font-semibold text-foreground truncate block">{row.name}</span>
                            <span className="text-[10.5px] text-muted-foreground font-mono truncate block mt-0.5">{row.niy} • {row.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-xs text-foreground/80 whitespace-nowrap">
                        {row.unitName || '-'}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${row.jenisClass} whitespace-nowrap border border-border/50`}>
                          {row.jenis}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-xs text-foreground/90 font-mono whitespace-nowrap">
                        {row.periode}
                      </td>
                      <td className="py-2.5 px-2.5 text-xs font-semibold text-primary whitespace-nowrap">
                        {row.durasi}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <button onClick={() => handleViewAttachment(row)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 transition-colors text-[11px] font-medium cursor-pointer w-full justify-center" title={row.lampiran}>
                          <span className="material-symbols-outlined text-[13px] flex-shrink-0">attach_file</span>
                          <span className="truncate block max-w-[90px]">{row.lampiran}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${row.statusClass} whitespace-nowrap flex-shrink-0`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot} flex-shrink-0`}></span>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right pr-3">
                        {row.status === 'Menunggu' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleApprove(row.id)} className="h-7 w-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center shadow-xs cursor-pointer flex-shrink-0" type="button" title="Setujui">
                              <span className="material-symbols-outlined text-[15px]">check</span>
                            </button>
                            <button onClick={() => handleReject(row.id)} className="h-7 w-7 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0" type="button" title="Tolak">
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                            <button onClick={() => handleDetail(row)} className="h-7 w-7 rounded-md bg-card text-foreground hover:bg-muted border border-border transition-colors flex items-center justify-center cursor-pointer flex-shrink-0" type="button" title="Detail">
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button onClick={() => handleDetail(row)} className="h-7 w-7 rounded-md bg-card hover:bg-muted text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0" type="button" title="Detail">
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-muted-foreground text-xs">
                        Tidak ada pengajuan izin &amp; cuti yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                Menampilkan <span className="font-semibold text-foreground">{startIndex + 1}</span>–{startIndex + paginatedData.length > filtered.length ? filtered.length : startIndex + paginatedData.length} dari <span className="font-semibold text-foreground">{filtered.length}</span> pengajuan
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                  disabled={currentPage === 1}
                  type="button"
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                    type="button"
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Aturan &amp; Ketentuan Cuti Pegawai Yayasan</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Pedoman verifikasi otomatis berdasarkan SK Direktur Yayasan Pendidikan No. 42/SK-DIR/2025.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground">1. Izin Sakit &gt; 2 Hari</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Wajib melampirkan surat keterangan dokter atau klinik dengan cap stempel basah / QR barcode verifikasi digital faskes.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground">2. Cuti Melahirkan &amp; Bersalin</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Maksimal 90 hari kalender, diajukan paling lambat 14 hari sebelum hari perkiraan lahir (HPL) dari dokter spesialis.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Batas Waktu Validasi Unit: <strong className="text-foreground">2 x 24 Jam Kerja</strong></span>
              <a className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer">
                <span>Unduh Pedoman Lengkap (PDF)</span>
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </a>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight">Statistik Kuota Cuti</h3>
                <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">T.A 2026/2027</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Monitor utilisasi jatah tahunan staf dan guru tetap.
              </p>
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Cuti Tahunan Digunakan</span>
                    <span className="font-semibold text-foreground">64% (292 / 456 Hari)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Tingkat Ketidakhadiran Izin/Sakit</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">1.8% (Sangat Sehat)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-muted-foreground text-[17px]">verified_user</span>
              <span>Sinkronisasi Data SimPres Pusat: <strong className="text-foreground">Realtime</strong></span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Confirm Reject Dialog */}
      {confirmRejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={handleCancelReject}>
          <div className="relative w-full max-w-sm bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="text-sm font-bold text-foreground">Konfirmasi Tolak Pengajuan</h3>
              <button onClick={handleCancelReject} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
              </div>
              <p className="text-sm font-bold text-foreground mb-1">Tolak pengajuan izin/cuti ini?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Status akan diperbarui menjadi <strong className="text-destructive font-semibold">Ditolak</strong>. Keputusan ini akan dicatat dan dapat dilihat oleh pegawai.</p>
            </div>
            <div className="px-5 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
              <button onClick={handleCancelReject} className="h-8.5 px-3.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer" type="button">
                Batal
              </button>
              <button onClick={handleConfirmReject} className="h-8.5 px-3.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Tolak Pengajuan</span>
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
