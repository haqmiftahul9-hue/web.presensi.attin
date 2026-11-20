import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import DocumentViewerModal from '../../components/DocumentViewerModal.jsx'
import { formatDocumentSize } from '../../services/leaveAttachmentService.js'
import {
  useSimPresOptional, selectLeavesEnriched, selectSelfStaff,
  addActivityLog, hasPermission, selectCurrentUserRole, ROLE_SUPERADMIN,
} from '../../store/simPresStore.jsx'
import { EmptyState, LoadingState } from '../../components/mobile/Feedback.jsx'

function BarisStatus({ status }) {
  const isApproved = status === 'Disetujui'
  const isRejected = status === 'Ditolak'
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

  const selfStaff = state ? selectSelfStaff(state) : null
  const userUnitId = selfStaff?.unitId || state?.currentUser?.unitId
  const currentRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentRole === ROLE_SUPERADMIN

  const canApprove = state ? (isSuperadmin || hasPermission(state, currentRole, 'pengajuanIzinCuti', 'edit')) : false

  const daftar = useMemo(() => {
    if (!state) return []
    let list = selectLeavesEnriched(state)
    // Filter berdasarkan role:
    if (!isSuperadmin) {
      // Kepala Sekolah: tampilkan yang belum disetujui Kepsek
      list = list.filter((l) => l.status !== 'Disetujui' && l.status !== 'Ditolak' && l.approvalKepsek?.status !== 'Disetujui')
      if (userUnitId) {
        list = list.filter((l) => l.unitId === userUnitId)
      }
    } else {
      // Superadmin: tampilkan semua yang masih pending
      list = list.filter((l) => l.status !== 'Disetujui' && l.status !== 'Ditolak')
    }
    return list
  }, [state, isSuperadmin, userUnitId])

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

  return (
    <div className="sp-page pb-8">
      <section className="sp-hero sp-page-container pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/mobile/home"
            className="w-8 h-8 rounded-xl bg-white border border-primary-border flex items-center justify-center text-primary shadow-2xs active:scale-95"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="font-headline-sm text-headline-sm text-sp-ink font-bold tracking-tight">
              Persetujuan Izin &amp; Cuti
            </h1>
            <span className="font-label-sm text-label-sm text-primary-muted">
              {daftar.length} pengajuan menunggu verifikasi {isSuperadmin ? '(Superadmin)' : '(Kepala Sekolah)'}
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-3 pb-2">
        {pesan && (
          <p className="rounded-2xl bg-status-success-soft text-status-success-bright border border-status-success-border px-3.5 py-3 font-body-sm text-body-sm">{pesan}</p>
        )}

        {daftar.length ? (
          <ul className="flex flex-col gap-2.5">
            {daftar.map((item) => (
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
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Status Tahap:</span>
                  <span className="font-semibold text-foreground text-[11px]">
                    {item.approvalKepsek?.status === 'Disetujui' ? '✓ Disetujui Kepsek (Menunggu Superadmin)' : 'Menunggu Persetujuan Kepsek'}
                  </span>
                </div>

                {canApprove ? (
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
                ) : (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Menunggu persetujuan kepala sekolah / admin.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="sp-card p-4">
            <EmptyState ikon="task_alt" judul="Tidak ada pengajuan menunggu" detail="Semua pengajuan izin/cuti unit Anda sudah diproses." />
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
