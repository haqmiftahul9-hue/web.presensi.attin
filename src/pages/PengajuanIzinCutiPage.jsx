import { useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../utils/download.js'
import { useSimPres, selectLeavesEnriched, selectActiveStaff, selectCurrentUserRole, addActivityLog, selectUnitName, selectActiveUnitId, selectCanSwitchUnit, selectIsAllUnits, ALL_UNITS, selectSearchTerm, hasPermission } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'
import { selectLeavesByStatus, selectPendingLeaves, selectApprovedLeaves, selectRejectedLeaves } from '../store/simPresStore.jsx'
import LeaveRequestModal from '../components/LeaveRequestModal.jsx'
import LeaveDetailModal from '../components/LeaveDetailModal.jsx'
import DocumentViewerModal from '../components/DocumentViewerModal.jsx'
import { hasAttachment, getAttachmentName } from '../services/leaveAttachmentService.js'
import {
  JENIS_UTAMA, SEMUA_JENIS, kelompokIzinCuti,
  WARNA_STATUS_PORTAL, WARNA_TITIK_STATUS, hitungSisaKuota,
  isLeavePending, isLeaveApproved, isLeaveRejected, ikonJenis, LABEL_STATUS_PANJANG,
} from '../data/jenisIzinCuti.js'
import { rentangPengajuan } from '../data/presensiMobile.js'

const statusTabs = [
  { id: 'semua', label: 'Semua', count: 0, color: 'bg-muted text-muted-foreground' },
  { id: 'menunggu', label: 'Menunggu', count: 0, color: 'bg-amber-100 text-amber-800' },
  { id: 'disetujui', label: 'Disetujui', count: 0, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'ditolak', label: 'Ditolak', count: 0, color: 'bg-red-100 text-red-800' },
]

// Pilihan jenis terpusat
const jenisOptions = [
  'Semua Jenis Izin/Cuti',
  'Semua Cuti',
  'Semua Izin',
  ...JENIS_UTAMA.map((j) => j.nama),
  'Cuti Penting',
  'Cuti Menikah',
  'Tugas Luar',
]

const statusClassMap = WARNA_STATUS_PORTAL
const statusDotMap = WARNA_TITIK_STATUS
const jenisClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warna]))
const avatarClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warnaAvatar]))

/** Apakah pengajuan punya berkas lampiran (nama berkas maupun URL berkas)? */
const hasLampiran = (leave) => hasAttachment(leave)

/** Nama berkas lampiran untuk ditampilkan di tabel. */
const namaLampiran = (leave) => getAttachmentName(leave) || 'Dokumen lampiran'

function PengajuanIzinCutiPage() {
  const { state, dispatch } = useSimPres()
  const [activeStatusTab, setActiveStatusTab] = useState('semua')
  const searchTerm = selectSearchTerm(state)
  const [filterStatus, setFilterStatus] = useState('Semua Status')
  const [filterJenis, setFilterJenis] = useState('Semua Jenis Izin/Cuti')
  const [filterBulan, setFilterBulan] = useState('Semua Periode')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLeave, setDetailLeave] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [viewerLeave, setViewerLeave] = useState(null)
  
  // State untuk Approval Modal Superadmin
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    leave: null,
    action: 'approve', // 'approve' | 'reject'
    note: '',
  })
  const [feedbackAlert, setFeedbackAlert] = useState(null)

  const staffList = selectActiveStaff(state)
  const currentUserRole = selectCurrentUserRole(state)
  const currentUser = state.currentUser
  const isSuperadmin = currentUserRole === 'Superadmin'
  const isKepsek = currentUserRole === 'Kepala Sekolah'
  const isAdminUnit = currentUserRole === 'Admin Unit' || currentUserRole === 'Admin'
  const canApproveLeave = !isAdminUnit && (isSuperadmin || isKepsek)
  const canSwitchUnit = isSuperadmin
  const userUnitId = selectActiveUnitId(state)
  const selectedUnitObj = state.units.find(u => u.id === userUnitId)
  const unitLabel = selectedUnitObj ? selectedUnitObj.nama : 'Unit'
  const filterUnit = isSuperadmin
    ? (selectedUnitObj ? selectedUnitObj.nama : 'Semua Unit')
    : (selectedUnitObj ? selectedUnitObj.nama : 'Semua Unit')

  // Helper penandatangan
  const settings = state.settings
  const penandatangan = settings.penandatangan || {}
  
  const allLeaves = selectLeavesEnriched(state)

  // 1. Terapkan filter ke allLeaves
  const filtered = allLeaves.filter((l) => {
    // Tab status filter
    if (activeStatusTab !== 'semua') {
      if (activeStatusTab === 'menunggu') {
        if (!isLeavePending(l.status)) return false
      } else if (activeStatusTab === 'disetujui') {
        if (!isLeaveApproved(l.status)) return false
      } else if (activeStatusTab === 'ditolak') {
        if (!isLeaveRejected(l.status)) return false
      }
    }
    // Search filter
    if (searchTerm && !l.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !String(l.staffId).includes(searchTerm) && !l.keterangan?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    // Filter Status dropdown
    if (filterStatus !== 'Semua Status') {
      if (filterStatus === 'Menunggu Persetujuan') {
        if (!isLeavePending(l.status)) return false
      } else if (filterStatus === 'Menunggu Kepsek (Tahap 1)') {
        if (l.status !== 'Menunggu Kepsek' && (l.approvalKepsek?.status !== 'Menunggu' || isLeaveApproved(l.status))) return false
      } else if (filterStatus === 'Menunggu Superadmin (Tahap 2)') {
        if (l.status !== 'Menunggu Superadmin' && (l.approvalKepsek?.status !== 'Disetujui' || isLeaveApproved(l.status))) return false
      } else if (filterStatus === 'Disetujui') {
        if (!isLeaveApproved(l.status)) return false
      } else if (filterStatus === 'Ditolak') {
        if (!isLeaveRejected(l.status)) return false
      }
    }

    // Filter Jenis dropdown
    if (filterJenis === 'Semua Cuti' || filterJenis === 'Semua Izin') {
      if (kelompokIzinCuti(l.jenis) !== filterJenis.replace('Semua ', '')) return false
    } else if (filterJenis !== 'Semua Jenis Izin/Cuti') {
      if (l.jenis !== filterJenis) return false
    }

    // Filter Periode dropdown
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
  const filteredPending = filtered.filter(l => isLeavePending(l.status)).length
  const filteredPendingSuperadmin = filtered.filter(l => l.status === 'Menunggu Superadmin' || (isLeavePending(l.status) && l.approvalKepsek?.status === 'Disetujui')).length
  const filteredPendingKepsek = filtered.filter(l => l.status === 'Menunggu Kepsek' || (isLeavePending(l.status) && l.approvalKepsek?.status !== 'Disetujui')).length
  const filteredApproved = filtered.filter(l => isLeaveApproved(l.status)).length
  const filteredRejected = filtered.filter(l => isLeaveRejected(l.status)).length

  // 3. Update tab counts dari filtered
  const updatedTabs = [
    { ...statusTabs[0], count: filtered.length },
    { ...statusTabs[1], count: filteredPending },
    { ...statusTabs[2], count: filteredApproved },
    { ...statusTabs[3], count: filteredRejected },
  ]

  // 4. Pagination
  const ITEMS_PER_PAGE = 6
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedData = filtered.slice(startIndex, endIndex)

  // Baris tabel dengan informasi alur persetujuan lengkap
  const tableData = paginatedData.map((leave) => {
    const isPending = isLeavePending(leave.status)
    const isApproved = isLeaveApproved(leave.status)
    const isRejected = isLeaveRejected(leave.status)

    const kepsekStatus = leave.approvalKepsek?.status || (isApproved ? 'Disetujui' : leave.status === 'Menunggu Superadmin' ? 'Disetujui' : 'Menunggu')
    const superadminStatus = leave.approvalSuperadmin?.status || (isApproved ? 'Disetujui' : 'Menunggu')

    return {
      ...leave,
      id: leave.id,
      staffId: leave.staffId,
      initials: initialsOf(leave.name),
      name: leave.name,
      niy: leave.niy,
      role: leave.role,
      jenis: leave.jenis,
      periode: leave.periode,
      durasi: leave.durasi,
      lampiran: leave.lampiran,
      status: leave.status,
      keterangan: leave.keterangan || leave.alasan || '-',
      unitName: leave.unitName,
      isPending,
      isApproved,
      isRejected,
      approvalKepsekStatus: kepsekStatus,
      approvalSuperadminStatus: superadminStatus,
      avatarClass: avatarClassMap[leave.jenis] || 'bg-muted text-muted-foreground',
      jenisClass: jenisClassMap[leave.jenis] || 'bg-muted text-muted-foreground',
      statusClass: statusClassMap[leave.status] || (isApproved ? statusClassMap.Disetujui : isRejected ? statusClassMap.Ditolak : statusClassMap.Menunggu),
      statusDot: statusDotMap[leave.status] || (isApproved ? statusDotMap.Disetujui : isRejected ? statusDotMap.Ditolak : statusDotMap.Menunggu),
      statusLabel: LABEL_STATUS_PANJANG[leave.status] || leave.status,
    }
  })

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
    addActivityLog(dispatch, state, 'Pengajuan', `Cuti/Izin • ${staff?.name || newLeave.staffId}`, `${staff?.name || 'Pegawai'} mengajukan ${newLeave.jenis} (${newLeave.durasi}): ${newLeave.keterangan}`, currentUser?.name, currentUserRole, staff?.unitId)
    setFeedbackAlert({
      type: 'success',
      message: `Pengajuan ${newLeave.jenis} untuk ${staff?.name || 'pegawai'} berhasil disimpan.`,
    })
    setTimeout(() => setFeedbackAlert(null), 4000)
  }

  // Buka Modal Approval (Setujui atau Tolak)
  const handleOpenApprovalModal = (leave, action) => {
    if (!canApproveLeave) return
    setApprovalModal({
      isOpen: true,
      leave,
      action,
      note: action === 'approve'
        ? (isSuperadmin ? 'Disetujui penuh oleh Superadmin' : 'Disetujui oleh Kepala Sekolah')
        : '',
    })
  }

  // Eksekusi Konfirmasi Persetujuan / Penolakan (Superadmin atau Kepala Sekolah)
  const handleConfirmApproval = () => {
    if (!canApproveLeave) return
    const { leave, action, note } = approvalModal
    if (!leave) return
    const approverName = currentUser?.name || (isSuperadmin ? 'Superadmin Yayasan' : 'Kepala Sekolah')

    if (action === 'approve') {
      if (!isSuperadmin) {
        // Persetujuan Tahap 1 oleh Kepala Sekolah -> lanjut ke Superadmin
        dispatch({
          type: 'UPDATE_LEAVE_STATUS',
          id: leave.id,
          status: 'Menunggu Superadmin',
          tahapApproval: 2,
          approvalKepsek: {
            status: 'Disetujui',
            approverName,
            approverRole: 'Kepala Sekolah',
            tanggal: new Date().toISOString(),
            catatan: note.trim() || 'Disetujui oleh Kepala Sekolah',
          },
        })
        addActivityLog(
          dispatch,
          state,
          'Persetujuan Tahap 1',
          `Cuti/Izin • ${leave.name}`,
          `Kepala Sekolah (${approverName}) menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${leave.name}. Menunggu persetujuan Superadmin.${note ? ` Catatan: ${note}` : ''}`,
          approverName,
          currentUserRole,
          leave.unitId
        )
        setFeedbackAlert({
          type: 'success',
          message: `Pengajuan ${leave.jenis} untuk ${leave.name} berhasil disetujui Kepala Sekolah. Menunggu persetujuan Superadmin.`,
        })
      } else {
        // Setujui oleh Superadmin (Tahap 2)
        dispatch({
          type: 'UPDATE_LEAVE_STATUS',
          id: leave.id,
          status: 'Disetujui',
          tahapApproval: 3,
          approvalSuperadmin: {
            status: 'Disetujui',
            approverName,
            approverRole: 'Superadmin',
            tanggal: new Date().toISOString(),
            catatan: note.trim() || 'Disetujui penuh oleh Superadmin',
          },
        })
        addActivityLog(
          dispatch,
          state,
          'Persetujuan Final',
          `Cuti/Izin • ${leave.name}`,
          `Superadmin (${approverName}) menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${leave.name}. Status: Disetujui Penuh.${note ? ` Catatan: ${note}` : ''}`,
          approverName,
          currentUserRole,
          leave.unitId
        )
        setFeedbackAlert({
          type: 'success',
          message: `Pengajuan ${leave.jenis} untuk ${leave.name} berhasil disetujui (Status: Disetujui Penuh).`,
        })
      }
    } else {
      // Tolak pengajuan
      const stage = isSuperadmin ? 'superadmin' : 'kepsek'
      dispatch({
        type: 'UPDATE_LEAVE_STATUS',
        id: leave.id,
        status: 'Ditolak',
        tahapApproval: 3,
        rejectedStage: stage,
        ...(isSuperadmin
          ? {
              approvalSuperadmin: {
                status: 'Ditolak',
                approverName,
                approverRole: 'Superadmin',
                tanggal: new Date().toISOString(),
                catatan: note.trim() || 'Ditolak oleh Superadmin',
              },
            }
          : {
              approvalKepsek: {
                status: 'Ditolak',
                approverName,
                approverRole: 'Kepala Sekolah',
                tanggal: new Date().toISOString(),
                catatan: note.trim() || 'Ditolak oleh Kepala Sekolah',
              },
            }),
      })
      addActivityLog(
        dispatch,
        state,
        'Penolakan',
        `Cuti/Izin • ${leave.name}`,
        `${isSuperadmin ? 'Superadmin' : 'Kepala Sekolah'} (${approverName}) menolak pengajuan ${leave.jenis} (${leave.durasi}) untuk ${leave.name}. Alasan: ${note || 'Tidak memenuhi ketentuan'}`,
        approverName,
        currentUserRole,
        leave.unitId
      )
      setFeedbackAlert({
        type: 'error',
        message: `Pengajuan ${leave.jenis} untuk ${leave.name} telah ditolak.`,
      })
    }

    setApprovalModal({ isOpen: false, leave: null, action: 'approve', note: '' })
    setTimeout(() => setFeedbackAlert(null), 4000)
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
    setViewerLeave(leave)
  }

  const handleExportExcel = () => {
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

    const unitLabel = selectIsAllUnits(state)
      ? 'Semua_Unit'
      : (filterUnit || '').replace(/\s+/g, '_')

    const exportData = filtered.map((leave, index) => {
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
        'Tahap 1 (Kepsek)': leave.approvalKepsek?.status || '-',
        'Catatan Kepsek': leave.approvalKepsek?.catatan || '-',
        'Tahap 2 (Superadmin)': leave.approvalSuperadmin?.status || '-',
        'Catatan Superadmin': leave.approvalSuperadmin?.catatan || '-',
        'Status Final': leave.status,
      }
    })

    const wb = XLSX.utils.book_new()
    const titleRow = [['Laporan Pengajuan Izin dan Cuti Pegawai (Sistem Persetujuan 2 Tahap)']]
    const ws = XLSX.utils.aoa_to_sheet(titleRow, { origin: 'A1' })
    XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A3', skipHeader: false })

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
      { wch: 20 },  // Tahap 1 (Kepsek)
      { wch: 25 },  // Catatan Kepsek
      { wch: 22 },  // Tahap 2 (Superadmin)
      { wch: 25 },  // Catatan Superadmin
      { wch: 18 },  // Status Final
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Izin Cuti')
    const fileName = `Laporan_Izin_Cuti_${unitLabel}_${periodLabel}.xlsx`
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                <span>Pengajuan Izin &amp; Cuti</span>
                {isSuperadmin && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-normal">
                    Portal Superadmin (Approval Tingkat 2)
                  </span>
                )}
                {isKepsek && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 tracking-normal">
                    Portal Kepala Sekolah (Approval Tingkat 1)
                  </span>
                )}
                {isAdminUnit && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 tracking-normal">
                    Portal Admin {unitLabel} (Monitoring &amp; Rekap)
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                Kelola, tinjau berkas lampiran, dan proses verifikasi approval persetujuan izin/cuti pegawai melalui 2 tahap: Kepala Sekolah &amp; Superadmin.
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

          {/* Feedback Alert Toast */}
          {feedbackAlert && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all animate-sp-rise ${
              feedbackAlert.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {feedbackAlert.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span className="font-semibold">{feedbackAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackAlert(null)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

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
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Perlu verifikasi</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {filteredPendingSuperadmin} Tahap 2 (Superadmin)
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Disetujui Penuh (Final)</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{filteredApproved}</span>
                    <span className="text-xs font-medium text-muted-foreground">Pegawai</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cakupan Unit:</span>
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
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ditolak / Batal</span>
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
                <span className="text-destructive font-medium">Dokumen tidak lengkap / tidak memenuhi syarat</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto flex-nowrap">
                {updatedTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveStatusTab(tab.id); setCurrentPage(1) }}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
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
              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    className="w-full h-9 pl-2.5 pr-7 bg-card border border-input rounded-lg text-xs font-medium text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                  >
                    <option>Semua Status</option>
                    <option>Menunggu Persetujuan</option>
                    <option>Menunggu Kepsek (Tahap 1)</option>
                    <option>Menunggu Superadmin (Tahap 2)</option>
                    <option>Disetujui</option>
                    <option>Ditolak</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="md:col-span-2">
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

          {/* Table Container - Lebar Responsif Tanpa Berdempet */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
            {/* Banner bantuan swipe/geser untuk tampilan di mobile desktop mode */}
            <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
              <div className="items-center gap-1.5 font-medium flex">
                <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
                <span>Tabel responsif lebar penuh: Geser ke samping untuk melihat seluruh rincian{canApproveLeave ? ' dan tombol approval' : ''}.</span>
              </div>
              <div className="text-[11px] font-semibold text-foreground">
                Menampilkan {filtered.length} pengajuan
              </div>
            </div>

            <div className="sp-table-wrap overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1180px]">
                <thead className="bg-muted/80 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 min-w-[240px]">Pegawai</th>
                    <th className="py-3 px-3 min-w-[95px] whitespace-nowrap">Unit</th>
                    <th className="py-3 px-3 min-w-[145px] whitespace-nowrap">Jenis</th>
                    <th className="py-3 px-3 min-w-[185px] whitespace-nowrap">Periode</th>
                    <th className="py-3 px-2.5 text-center min-w-[85px] whitespace-nowrap">Durasi</th>
                    <th className="py-3 px-3 text-center min-w-[140px] whitespace-nowrap">Lampiran</th>
                    <th className="py-3 px-3 min-w-[210px] whitespace-nowrap">Status &amp; Verifikasi (2-Tahap)</th>
                    <th className="py-3 px-3.5 text-right min-w-[170px] whitespace-nowrap">{canApproveLeave ? 'Aksi Approval' : 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {tableData.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      {/* Pegawai */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                            {row.initials}
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
                            <span className="text-xs font-semibold text-foreground truncate block">{row.name}</span>
                            <span className="text-[10.5px] text-muted-foreground font-mono truncate block mt-0.5">{row.niy} • {row.role}</span>
                            <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                              Sisa Kuota Tahunan: <strong className="text-foreground">{hitungSisaKuota(row.staffId, 'Cuti Tahunan', allLeaves)}</strong> hari
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border/60">
                          {row.unitName || '-'}
                        </span>
                      </td>

                      {/* Jenis */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${row.jenisClass} border border-border/50`}>
                          <span className="material-symbols-outlined text-[14px]">{ikonJenis(row.jenis)}</span>
                          <span>{row.jenis}</span>
                        </span>
                      </td>

                      {/* Periode */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-mono">
                          <span className="material-symbols-outlined text-[15px] text-muted-foreground shrink-0">calendar_month</span>
                          <span>{row.periode}</span>
                        </div>
                      </td>

                      {/* Durasi */}
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs">
                          {row.durasi}
                        </span>
                      </td>

                      {/* Lampiran */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {hasLampiran(row) ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleViewAttachment(row)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/60 transition-colors text-xs font-medium cursor-pointer max-w-[150px] justify-center mx-auto"
                              title={`Lihat bukti: ${namaLampiran(row)}`}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[14px] shrink-0 text-primary">visibility</span>
                              <span className="truncate block">Lihat Bukti</span>
                            </button>
                            <span className="text-[10.5px] text-muted-foreground truncate max-w-[150px] inline-block">
                              {namaLampiran(row)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">- Tidak ada -</span>
                        )}
                      </td>

                      {/* Status & Verifikasi (2-Tahap) */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 min-w-[190px]">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${row.statusClass} w-fit whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot} shrink-0`}></span>
                            {row.statusLabel}
                          </span>
                          {/* 2-tier badge */}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
                              row.approvalKepsekStatus === 'Disetujui'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : row.approvalKepsekStatus === 'Ditolak'
                                ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              <span className="material-symbols-outlined text-[11px]">
                                {row.approvalKepsekStatus === 'Disetujui' ? 'check' : row.approvalKepsekStatus === 'Ditolak' ? 'close' : 'hourglass_empty'}
                              </span>
                              Kepsek
                            </span>
                            <span className="text-muted-foreground/60 text-[10px]">➔</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${
                              row.approvalSuperadminStatus === 'Disetujui'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : row.approvalSuperadminStatus === 'Ditolak'
                                ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}>
                              <span className="material-symbols-outlined text-[11px]">
                                {row.approvalSuperadminStatus === 'Disetujui' ? 'check' : row.approvalSuperadminStatus === 'Ditolak' ? 'close' : 'hourglass_empty'}
                              </span>
                              Superadmin
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Aksi Approval */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApproveLeave && (isSuperadmin ? row.isPending : (row.isPending && row.approvalKepsekStatus !== 'Disetujui' && row.status !== 'Menunggu Superadmin')) ? (
                            <>
                              <button
                                onClick={() => handleOpenApprovalModal(row, 'approve')}
                                className="h-7.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                type="button"
                                title={isSuperadmin ? "Setujui Pengajuan Ini (Superadmin Final)" : "Setujui Pengajuan Ini (Kepala Sekolah - Lanjut Superadmin)"}
                              >
                                <span className="material-symbols-outlined text-[15px]">check</span>
                                <span>{isSuperadmin ? 'Setujui' : 'Setujui (Lanjut Superadmin)'}</span>
                              </button>
                              <button
                                onClick={() => handleOpenApprovalModal(row, 'reject')}
                                className="h-7.5 px-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                type="button"
                                title="Tolak Pengajuan Ini"
                              >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                                <span>Tolak</span>
                              </button>
                              <button
                                onClick={() => handleDetail(row)}
                                className="h-7.5 w-7.5 rounded-lg bg-card hover:bg-muted text-foreground border border-border inline-flex items-center justify-center transition-colors cursor-pointer"
                                type="button"
                                title="Lihat Berkas &amp; Detail"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDetail(row)}
                                className="h-7.5 px-2.5 rounded-lg bg-card hover:bg-muted text-foreground border border-border inline-flex items-center gap-1 font-medium text-xs transition-colors cursor-pointer"
                                type="button"
                                title="Lihat Berkas &amp; Detail"
                              >
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                                <span>Detail &amp; Bukti</span>
                              </button>
                              {canApproveLeave && isSuperadmin && (
                                <button
                                  onClick={() => handleOpenApprovalModal(row, row.status === 'Disetujui' ? 'reject' : 'approve')}
                                  className="h-7.5 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border text-[11px] font-medium transition-colors cursor-pointer"
                                  type="button"
                                  title="Ubah Keputusan Persetujuan"
                                >
                                  <span>Ubah</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
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

          {/* Pedoman & Kuota Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Aturan &amp; Ketentuan Alur Persetujuan 2 Tahap</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Pedoman verifikasi otomatis berdasarkan SK Direktur Yayasan Pendidikan Attin Sumbar No. 42/SK-DIR/2025.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">1</span>
                      Tahap 1: Persetujuan Kepala Sekolah
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Kepala Sekolah unit bersangkutan memvalidasi kesiapan jadwal piket mengajar dan lampiran surat dokter/dokumen dinas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[11px] font-bold">2</span>
                      Tahap 2: Persetujuan Superadmin (Yayasan)
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Superadmin Pusat/Yayasan memberikan otorisasi final setelah memeriksa sisa kuota cuti tahunan dan rekap kehadiran yayasan.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Waktu Otorisasi Standar: <strong className="text-foreground">1 x 24 Jam Kerja per Tahap</strong></span>
                <span className="text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>Otorisasi Resmi Terenkripsi</span>
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Status Antrean Approval</h3>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">Realtime</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Ringkasan beban verifikasi izin/cuti yayasan hari ini.
                </p>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Menunggu Superadmin (Tahap 2)</span>
                      <span className="font-semibold text-sky-600 dark:text-sky-400">{filteredPendingSuperadmin} Berkas</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${filteredPending ? (filteredPendingSuperadmin / filteredPending) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Menunggu Kepala Sekolah (Tahap 1)</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{filteredPendingKepsek} Berkas</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${filteredPending ? (filteredPendingKepsek / filteredPending) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="material-symbols-outlined text-emerald-600 text-[17px]">sync</span>
                <span>Sinkronisasi Data SimPres: <strong className="text-foreground">Aktif</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval & Rejection Modal for Superadmin */}
      {approvalModal.isOpen && approvalModal.leave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setApprovalModal({ isOpen: false, leave: null, action: 'approve', note: '' })}
        >
          <div
            className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              approvalModal.action === 'approve'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  approvalModal.action === 'approve'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-destructive text-destructive-foreground shadow-2xs'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {approvalModal.action === 'approve' ? 'check_circle' : 'cancel'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {approvalModal.action === 'approve'
                      ? 'Konfirmasi Persetujuan Izin/Cuti'
                      : 'Konfirmasi Penolakan Izin/Cuti'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {approvalModal.action === 'approve'
                      ? (isSuperadmin ? 'Persetujuan Tingkat 2 (Final oleh Superadmin)' : 'Persetujuan Tingkat 1 (Kepala Sekolah - Lanjut Superadmin)')
                      : 'Keputusan penolakan izin/cuti pegawai'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovalModal({ isOpen: false, leave: null, action: 'approve', note: '' })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Pegawai & Unit summary */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
                    {initialsOf(approvalModal.leave.name)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground text-xs block truncate">
                      {approvalModal.leave.name}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground font-mono block">
                      NIY: {approvalModal.leave.niy} • {approvalModal.leave.role}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-card border border-border text-foreground shrink-0">
                  {approvalModal.leave.unitName}
                </span>
              </div>

              {/* Rincian Pengajuan */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-card rounded-xl border border-border/80">
                <div>
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Jenis Izin/Cuti
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {approvalModal.leave.jenis}
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Durasi &amp; Periode
                  </span>
                  <span className="text-xs font-semibold text-primary mt-0.5 block">
                    {approvalModal.leave.durasi} ({approvalModal.leave.periode})
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-border/60">
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Alasan Pengajuan
                  </span>
                  <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed bg-muted/30 p-2 rounded-lg border border-border/40">
                    {approvalModal.leave.keterangan || approvalModal.leave.alasan || '-'}
                  </p>
                </div>
                {approvalModal.leave.lampiran && (
                  <div className="col-span-2 pt-1 flex items-center justify-between bg-secondary/40 p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-primary shrink-0">attach_file</span>
                      <span className="text-xs text-foreground font-medium truncate">
                        {approvalModal.leave.lampiran}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewAttachment(approvalModal.leave)}
                      className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border text-[11px] font-medium text-foreground cursor-pointer shrink-0 transition-colors"
                    >
                      Buka Dokumen
                    </button>
                  </div>
                )}
              </div>

              {/* Status Alur 2-Tahap Saat Ini */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-primary">flowsheet</span>
                  Status Verifikasi Saat Ini
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-medium">1. Kepala Sekolah:</span>
                    <span className={`font-semibold inline-flex items-center gap-1 mt-0.5 ${
                      approvalModal.leave.approvalKepsekStatus === 'Disetujui'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : approvalModal.leave.approvalKepsekStatus === 'Ditolak'
                        ? 'text-destructive'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {approvalModal.leave.approvalKepsekStatus === 'Disetujui' ? 'check_circle' : 'hourglass_empty'}
                      </span>
                      {approvalModal.leave.approvalKepsekStatus || 'Menunggu'}
                    </span>
                    {approvalModal.leave.approvalKepsek?.catatan && (
                      <p className="text-[10.5px] text-muted-foreground italic mt-0.5 truncate">
                        &ldquo;{approvalModal.leave.approvalKepsek.catatan}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-medium">2. Superadmin:</span>
                    <span className={`font-semibold inline-flex items-center gap-1 mt-0.5 ${
                      approvalModal.leave.approvalSuperadminStatus === 'Disetujui'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : approvalModal.leave.approvalSuperadminStatus === 'Ditolak'
                        ? 'text-destructive'
                        : 'text-sky-600 dark:text-sky-400'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {approvalModal.leave.approvalSuperadminStatus === 'Disetujui' ? 'check_circle' : 'hourglass_empty'}
                      </span>
                      {approvalModal.action === 'approve' ? 'Menunggu Keputusan Anda' : 'Akan Ditolak'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Catatan / Alasan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    {approvalModal.action === 'approve'
                      ? (isSuperadmin ? 'Catatan Persetujuan Superadmin (Opsional):' : 'Catatan Persetujuan Kepala Sekolah (Opsional):')
                      : 'Alasan Penolakan (Wajib Diisi):'}
                  </span>
                  {approvalModal.action === 'reject' && (
                    <span className="text-destructive text-[11px] font-normal">* Wajib diisi</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={approvalModal.note}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder={
                    approvalModal.action === 'approve'
                      ? (isSuperadmin ? 'Tambahkan pesan atau instruksi untuk guru/pegawai (opsional)...' : 'Catatan persetujuan Kepala Sekolah untuk Superadmin & guru...')
                      : 'Contoh: Dokumen surat dokter belum berstempel resmi, kuota cuti tahunan telah habis...'
                  }
                  className="w-full p-2.5 bg-card border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
              <button
                onClick={() => setApprovalModal({ isOpen: false, leave: null, action: 'approve', note: '' })}
                className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                type="button"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={approvalModal.action === 'reject' && !approvalModal.note.trim()}
                className={`h-9 px-4 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {approvalModal.action === 'approve' ? 'check' : 'close'}
                </span>
                <span>
                  {approvalModal.action === 'approve' ? (isSuperadmin ? 'Konfirmasi Setujui (Final)' : 'Konfirmasi Setujui (Lanjut Superadmin)') : 'Konfirmasi Tolak'}
                </span>
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
        canApprove={canApproveLeave}
        onApprove={(l) => handleOpenApprovalModal(l, 'approve')}
        onReject={(l) => handleOpenApprovalModal(l, 'reject')}
      />

      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLeave}
        staffList={staffList}
        units={state.units}
      />

      {/* Modal Pratinjau Dokumen Lampiran Resmi */}
      <DocumentViewerModal
        isOpen={Boolean(viewerLeave)}
        onClose={() => setViewerLeave(null)}
        leave={viewerLeave}
      />
    </>
  )
}

export default PengajuanIzinCutiPage
