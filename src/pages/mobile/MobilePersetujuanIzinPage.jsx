import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import DocumentViewerModal from '../../components/DocumentViewerModal.jsx'
import { formatDocumentSize } from '../../services/leaveAttachmentService.js'
import {
  isLeavePending,
  isLeaveApproved,
  isLeaveRejected,
} from '../../data/jenisIzinCuti.js'
import {
  useSimPresOptional, selectLeavesEnriched, selectSelfStaff,
  addActivityLog, hasPermission, selectCurrentUserRole, ROLE_SUPERADMIN,
} from '../../store/simPresStore.jsx'
import { EmptyState, LoadingState } from '../../components/mobile/Feedback.jsx'

function BarisStatus({ status }) {
  const isApproved = isLeaveApproved(status)
  const isRejected = isLeaveRejected(status)
  const warna = isApproved
    ? 'bg-status-success-soft text-status-success-text'
    : isRejected
    ? 'bg-status-danger-soft text-status-danger-text'
    : 'bg-status-warning-soft text-status-warning-text'
  const label = status === 'Menunggu Superadmin' ? 'Menunggu Superadmin (2/2)' : status === 'Menunggu Kepsek' ? 'Menunggu Kepsek (1/2)' : status
  return <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm ${warna}`}>{label}</span>
}

function MobilePersetujuanIzinPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const [pesan, setPesan] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [activeTab, setActiveTab] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('all')

  const selfStaff = state ? selectSelfStaff(state) : null
  const userUnitId = selfStaff?.unitId || state?.currentUser?.unitId
  const currentRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentRole === ROLE_SUPERADMIN

  const canApprove = state ? (isSuperadmin || hasPermission(state, currentRole, 'pengajuanIzinCuti', 'edit')) : false

  // 1. Ambil seluruh data izin sesuai wewenang role (Superadmin = semua unit, Kepala Sekolah = unitnya)
  const baseList = useMemo(() => {
    if (!state) return []
    let list = selectLeavesEnriched(state)
    if (!isSuperadmin) {
      if (userUnitId) {
        list = list.filter((l) => l.unitId === userUnitId)
      }
    } else if (selectedUnit !== 'all') {
      list = list.filter((l) => l.unitId === selectedUnit)
    }
    return list
  }, [state, isSuperadmin, userUnitId, selectedUnit])

  // 2. Hitung statistik tab (Semua, Menunggu, Disetujui, Ditolak)
  const counts = useMemo(() => {
    const total = baseList.length
    const pending = baseList.filter((l) => isLeavePending(l.status)).length
    const approved = baseList.filter((l) => isLeaveApproved(l.status)).length
    const rejected = baseList.filter((l) => isLeaveRejected(l.status)).length
    return { total, pending, approved, rejected }
  }, [baseList])

  // 3. Terapkan filter tab aktif dan pencarian teks
  const daftar = useMemo(() => {
    let list = baseList
    if (activeTab === 'menunggu') {
      list = list.filter((l) => isLeavePending(l.status))
    } else if (activeTab === 'disetujui') {
      list = list.filter((l) => isLeaveApproved(l.status))
    } else if (activeTab === 'ditolak') {
      list = list.filter((l) => isLeaveRejected(l.status))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((l) =>
        l.name?.toLowerCase().includes(q) ||
        l.niy?.toLowerCase().includes(q) ||
        l.jenis?.toLowerCase().includes(q) ||
        l.alasan?.toLowerCase().includes(q) ||
        l.keterangan?.toLowerCase().includes(q) ||
        l.unitName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [baseList, activeTab, searchQuery])

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Persetujuan" detail="Mengambil data pengajuan…" />
      </div>
    )
  }

  const handleApprove = (id) => {
    const leave = state.leaves.find((l) => l.id === id)
    const staff = leave ? state.staff.find((s) => s.id === leave.staffId) : null
    const approverName = state.currentUser?.name || selfStaff?.name || (isSuperadmin ? 'Superadmin' : 'Kepala Sekolah')

    if (!isSuperadmin) {
      // Approval Tahap 1 oleh Kepala Sekolah -> lanjut ke Superadmin
      dispatch({
        type: 'UPDATE_LEAVE_STATUS',
        id,
        status: 'Menunggu Superadmin',
        tahapApproval: 2,
        approvalKepsek: {
          status: 'Disetujui',
          approverName,
          approverRole: 'Kepala Sekolah',
          tanggal: new Date().toISOString(),
          catatan: 'Disetujui oleh Kepala Sekolah',
        },
      })
      if (leave && staff) {
        addActivityLog(dispatch, state, 'Persetujuan Tahap 1', `Cuti/Izin • ${staff.name}`, `Kepala Sekolah (${approverName}) menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}. Menunggu persetujuan Superadmin.`, approverName, currentRole, staff.unitId)
      }
      setPesan('Pengajuan disetujui Kepala Sekolah. Menunggu persetujuan akhir dari Superadmin.')
    } else {
      // Approval oleh Superadmin -> Final Disetujui
      dispatch({
        type: 'UPDATE_LEAVE_STATUS',
        id,
        status: 'Disetujui',
        tahapApproval: 3,
        approvalSuperadmin: {
          status: 'Disetujui',
          approverName,
          approverRole: 'Superadmin',
          tanggal: new Date().toISOString(),
          catatan: 'Disetujui penuh oleh Superadmin',
        },
      })
      if (leave && staff) {
        addActivityLog(dispatch, state, 'Persetujuan Final', `Cuti/Izin • ${staff.name}`, `Superadmin (${approverName}) menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}. Status pengajuan: Disetujui Penuh.`, approverName, currentRole, staff.unitId)
      }
      setPesan('Pengajuan disetujui penuh oleh Superadmin.')
    }
    setTimeout(() => setPesan(''), 4000)
  }

  const handleReject = (id) => {
    const leave = state.leaves.find((l) => l.id === id)
    const staff = leave ? state.staff.find((s) => s.id === leave.staffId) : null
    const approverName = state.currentUser?.name || selfStaff?.name || (isSuperadmin ? 'Superadmin' : 'Kepala Sekolah')

    dispatch({
      type: 'UPDATE_LEAVE_STATUS',
      id,
      status: 'Ditolak',
      tahapApproval: 3,
      rejectedStage: isSuperadmin ? 'superadmin' : 'kepsek',
      ...(isSuperadmin
        ? {
            approvalSuperadmin: {
              status: 'Ditolak',
              approverName,
              approverRole: 'Superadmin',
              tanggal: new Date().toISOString(),
              catatan: 'Ditolak oleh Superadmin',
            },
          }
        : {
            approvalKepsek: {
              status: 'Ditolak',
              approverName,
              approverRole: 'Kepala Sekolah',
              tanggal: new Date().toISOString(),
              catatan: 'Ditolak oleh Kepala Sekolah',
            },
          }),
    })
    if (leave && staff) {
      addActivityLog(dispatch, state, 'Penolakan', `Cuti/Izin • ${staff.name}`, `${isSuperadmin ? 'Superadmin' : 'Kepala Sekolah'} (${approverName}) menolak pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}`, approverName, currentRole, staff.unitId)
    }
    setPesan('Pengajuan ditolak.')
    setTimeout(() => setPesan(''), 3000)
  }

  const tabs = [
    { id: 'semua', label: 'Semua', count: counts.total },
    { id: 'menunggu', label: 'Menunggu', count: counts.pending },
    { id: 'disetujui', label: 'Disetujui', count: counts.approved },
    { id: 'ditolak', label: 'Ditolak', count: counts.rejected },
  ]

  return (
    <div className="sp-page pb-8">
      <section className="sp-hero sp-page-container pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/mobile/home"
            className="w-8 h-8 rounded-xl bg-white border border-primary-border flex items-center justify-center text-primary shadow-2xs active:scale-95 shrink-0"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="font-headline-sm text-headline-sm text-sp-ink font-bold tracking-tight">
              Persetujuan Izin &amp; Cuti
            </h1>
            <span className="font-label-sm text-label-sm text-primary-muted truncate">
              {counts.total} total pengajuan • {counts.pending} menunggu verifikasi {isSuperadmin ? '(Superadmin)' : '(Kepala Sekolah)'}
            </span>
          </div>
        </div>

        {/* Filter Unit khusus Superadmin */}
        {isSuperadmin && (
          <div className="mt-2.5">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-white/90 dark:bg-card border border-primary/20 text-xs font-semibold text-foreground outline-none shadow-2xs"
            >
              <option value="all">Semua Unit ({state.units.length} Unit Sekolah)</option>
              {state.units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search Bar Input */}
        <div className="mt-2 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pegawai, NIY, jenis izin..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/90 dark:bg-card border border-primary/20 text-xs text-foreground placeholder:text-muted-foreground outline-none shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-7 h-7 rounded-full flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          )}
        </div>

        {/* Tab Status Filter (Semua, Menunggu, Disetujui, Ditolak) */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white/80 dark:bg-card text-muted-foreground border border-primary-border/60 hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-3 pb-2">
        {pesan && (
          <p className="rounded-2xl bg-status-success-soft text-status-success-bright border border-status-success-border px-3.5 py-3 font-body-sm text-body-sm">{pesan}</p>
        )}

        {daftar.length ? (
          <ul className="flex flex-col gap-2.5">
            {daftar.map((item) => {
              const pending = isLeavePending(item.status)
              const approved = isLeaveApproved(item.status)
              const rejected = isLeaveRejected(item.status)

              return (
                <li key={item.id} className="sp-list-card flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{item.name}</span>
                    <BarisStatus status={item.status} />
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">{item.niy} • {item.unitName}</div>
                  <div className="font-body-sm text-body-sm text-on-surface">{item.jenis} • {item.periode} • {item.durasi}</div>
                  {(item.keterangan || item.alasan) && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{item.keterangan || item.alasan}</p>
                  )}

                  {/* Bukti Lampiran Surat Izin / Cuti */}
                  {(item.lampiran || item.lampiranUrl || item.lampiran_url) && (
                    <div className="p-2.5 rounded-xl bg-primary/5 dark:bg-card border border-primary/20 dark:border-primary-border flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Icon name="description" className="text-[18px]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground text-xs block truncate">
                            {item.lampiranNama || item.lampiran_nama || item.lampiran}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground block">
                            {item.lampiranUkuran ? formatDocumentSize(item.lampiranUkuran) : 'Dokumen Bukti Resmi'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDocument(item)}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-strong text-white font-label-sm text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        <Icon name="visibility" className="text-[14px]" />
                        <span>Lihat Bukti</span>
                      </button>
                    </div>
                  )}

                  {/* Info status 2 tahap */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Tahap 1 (Kepala Sekolah):</span>
                      <span className={`font-semibold text-[11px] ${
                        item.approvalKepsek?.status === 'Disetujui' ? 'text-emerald-600 dark:text-emerald-400' : item.approvalKepsek?.status === 'Ditolak' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {item.approvalKepsek?.status || 'Menunggu'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-muted-foreground text-[11px]">Tahap 2 (Superadmin):</span>
                      <span className={`font-semibold text-[11px] ${
                        approved ? 'text-emerald-600 dark:text-emerald-400' : rejected ? 'text-destructive' : 'text-sky-600 dark:text-sky-400'
                      }`}>
                        {approved ? 'Disetujui Penuh' : rejected ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </div>
                    {item.approvalKepsek?.catatan && (
                      <p className="text-[10.5px] text-muted-foreground italic mt-0.5">
                        &ldquo;{item.approvalKepsek.catatan}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Tombol Aksi Verifikasi hanya untuk yang Menunggu */}
                  {pending && canApprove ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        className="flex-1 h-9 rounded-xl bg-status-success text-white font-label-md text-label-md px-4 py-2 shadow-2xs active:scale-95 transition-all"
                      >
                        {isSuperadmin ? 'Setujui (Final)' : 'Setujui (Lanjut Superadmin)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        className="flex-1 h-9 rounded-xl bg-status-danger text-white font-label-md text-label-md px-4 py-2 shadow-2xs active:scale-95 transition-all"
                      >
                        Tolak
                      </button>
                    </div>
                  ) : approved ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                        <Icon name="check_circle" className="text-[14px]" />
                        Telah Disetujui Penuh oleh Yayasan
                      </span>
                      <span className="text-muted-foreground text-[10px]">Selesai</span>
                    </div>
                  ) : rejected ? (
                    <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs flex items-center justify-between">
                      <span className="text-destructive text-[11px] font-semibold flex items-center gap-1">
                        <Icon name="cancel" className="text-[14px]" />
                        Pengajuan Ditolak
                      </span>
                      <span className="text-muted-foreground text-[10px]">Selesai</span>
                    </div>
                  ) : (
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Menunggu persetujuan kepala sekolah / admin.</p>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="sp-card p-4">
            <EmptyState
              ikon="task_alt"
              judul="Tidak ada pengajuan"
              detail={
                activeTab === 'semua'
                  ? 'Belum ada pengajuan izin/cuti yang tercatat.'
                  : `Tidak ada pengajuan dengan status "${activeTab}".`
              }
            />
          </div>
        )}
      </div>

      {/* Modal Pratinjau Surat Izin untuk Kepala Sekolah & Superadmin */}
      <DocumentViewerModal
        isOpen={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        leave={selectedDocument}
      />
    </div>
  )
}

export default MobilePersetujuanIzinPage
