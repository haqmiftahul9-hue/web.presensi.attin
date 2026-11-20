import { useState } from 'react'
import {
  SEMUA_JENIS, WARNA_STATUS_PORTAL, WARNA_TITIK_STATUS, LABEL_STATUS_PANJANG,
  isLeavePending,
} from '../data/jenisIzinCuti.js'
import {
  resolveDocumentUrl,
  isImageDocument,
  isPdfDocument,
  formatDocumentSize,
} from '../services/leaveAttachmentService.js'

function LeaveDetailModal({ isOpen, onClose, leave, canApprove = false, onApprove, onReject }) {
  const [activeTab, setActiveTab] = useState('detail')

  if (!isOpen || !leave) return null

  // Warna status & jenis dibaca dari daftar terpusat
  const statusClassMap = WARNA_STATUS_PORTAL
  const statusDotMap = WARNA_TITIK_STATUS
  const avatarClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warnaAvatar]))
  const jenisClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warna]))

  const initials = leave.name ? leave.name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  const kepsekStatus = leave.approvalKepsek?.status || (leave.status === 'Disetujui' ? 'Disetujui' : leave.status === 'Menunggu Superadmin' ? 'Disetujui' : 'Menunggu')
  const superadminStatus = leave.approvalSuperadmin?.status || (leave.status === 'Disetujui' ? 'Disetujui' : 'Menunggu')

  const formatWaktu = (iso) => {
    if (!iso || iso === '-') return '-'
    try {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  const isPending = isLeavePending(leave.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Detail Pengajuan Izin/Cuti
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Informasi lengkap, alur persetujuan 2 tahap, dan berkas pengajuan pegawai.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Badge & Header */}
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/60">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClassMap[leave.jenis] || 'bg-muted text-muted-foreground'}`}>
                {initials}
              </div>
              <div>
                <span className="text-xs font-bold text-foreground">{leave.name}</span>
                <div className="text-[11px] text-muted-foreground font-medium">NIY: {leave.niy} • {leave.role}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusClassMap[leave.status] || 'bg-muted text-muted-foreground'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotMap[leave.status] || 'bg-muted-foreground'}`}></span>
                {LABEL_STATUS_PANJANG[leave.status] || leave.status}
              </span>
            </div>
          </div>

          {/* Alur Verifikasi 2-Tahap Banner */}
          <div className="p-3.5 bg-card rounded-xl border border-border/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-primary">verified</span>
                Alur Persetujuan Bertingkat (2 Tahap)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Kepala Sekolah ➔ Superadmin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Tahap 1: Kepala Sekolah */}
              <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${
                kepsekStatus === 'Disetujui'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : kepsekStatus === 'Ditolak'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tahap 1: Kepala Sekolah
                  </span>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                    kepsekStatus === 'Disetujui'
                      ? 'bg-emerald-600 text-white'
                      : kepsekStatus === 'Ditolak'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-amber-600 text-white'
                  }`}>
                    {kepsekStatus}
                  </span>
                </div>
                <div className="text-xs text-foreground font-medium">
                  {leave.approvalKepsek?.approverName || (kepsekStatus === 'Disetujui' ? 'Kepala Sekolah' : 'Menunggu Kepala Sekolah')}
                </div>
                {leave.approvalKepsek?.tanggal && (
                  <div className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {formatWaktu(leave.approvalKepsek.tanggal)}
                  </div>
                )}
                {leave.approvalKepsek?.catatan && (
                  <div className="text-[11px] text-foreground/80 bg-background/60 p-1.5 rounded border border-border/40 mt-1 italic">
                    &ldquo;{leave.approvalKepsek.catatan}&rdquo;
                  </div>
                )}
              </div>

              {/* Tahap 2: Superadmin */}
              <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${
                superadminStatus === 'Disetujui'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : superadminStatus === 'Ditolak'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-sky-500/10 border-sky-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tahap 2: Superadmin (Yayasan)
                  </span>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                    superadminStatus === 'Disetujui'
                      ? 'bg-emerald-600 text-white'
                      : superadminStatus === 'Ditolak'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-sky-600 text-white'
                  }`}>
                    {superadminStatus}
                  </span>
                </div>
                <div className="text-xs text-foreground font-medium">
                  {leave.approvalSuperadmin?.approverName || (superadminStatus === 'Disetujui' ? 'Superadmin Yayasan' : 'Menunggu Superadmin')}
                </div>
                {leave.approvalSuperadmin?.tanggal && (
                  <div className="text-[10.5px] text-muted-foreground flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {formatWaktu(leave.approvalSuperadmin.tanggal)}
                  </div>
                )}
                {leave.approvalSuperadmin?.catatan && (
                  <div className="text-[11px] text-foreground/80 bg-background/60 p-1.5 rounded border border-border/40 mt-1 italic">
                    &ldquo;{leave.approvalSuperadmin.catatan}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'detail' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}>
              Detail Pengajuan
            </button>
            <button
              onClick={() => setActiveTab('lampiran')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'lampiran' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}>
              Lampiran &amp; Dokumen
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'detail' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Jenis Izin/Cuti</span>
                  <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-semibold ${jenisClassMap[leave.jenis] || 'bg-muted text-muted-foreground'}`}>
                    {leave.jenis}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unit Kerja</span>
                  <span className="text-xs font-semibold text-foreground">{leave.unitName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Periode Tanggal</span>
                  <span className="text-xs font-medium text-foreground">{leave.periode}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Durasi</span>
                  <span className="text-xs font-bold text-primary">{leave.durasi}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alasan / Keterangan</span>
                <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {leave.keterangan || leave.alasan || '-'}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Diajukan Pada</span>
                <span className="text-xs font-medium text-muted-foreground">{formatWaktu(leave.createdAt) || '-'}</span>
              </div>
            </div>
          )}

          {activeTab === 'lampiran' && (
            <div className="space-y-4 pt-1">
              {(leave.lampiran || leave.lampiranUrl || leave.lampiran_url) ? (
                (() => {
                  const fileName = leave.lampiranNama || leave.lampiran_nama || leave.lampiran || 'dokumen_lampiran.pdf'
                  const fileSize = leave.lampiranUkuran || leave.lampiran_ukuran || null
                  const docUrl = resolveDocumentUrl(leave)
                  const isImage = isImageDocument(docUrl) || isImageDocument(fileName)

                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                            <span className="material-symbols-outlined text-[22px]">description</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-foreground truncate block">{fileName}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {fileSize ? formatDocumentSize(fileSize) : 'Dokumen Bukti Surat Izin / Cuti'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            <span>Buka Tab Baru</span>
                          </button>
                          <button
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = docUrl
                              a.download = fileName
                              document.body.appendChild(a)
                              a.click()
                              a.remove()
                            }}
                            className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            <span>Unduh</span>
                          </button>
                        </div>
                      </div>

                      {/* Frame Pratinjau Dokumen Inline */}
                      <div className="p-3 bg-slate-900/10 dark:bg-black/30 rounded-xl border border-border/70 flex flex-col items-center justify-center min-h-[220px] max-h-[360px] overflow-auto">
                        <img
                          src={docUrl}
                          alt={`Pratinjau ${fileName}`}
                          className="max-h-[340px] max-w-full object-contain rounded-lg border border-border shadow-xs"
                        />
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-xl border border-dashed border-border">
                  <span className="material-symbols-outlined text-[28px] text-muted-foreground/60 mb-1 block">attachment_off</span>
                  <span>Tidak ada dokumen lampiran yang diunggah untuk pengajuan ini.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-2.5">
          <div>
            {canApprove && isPending && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Tindakan persetujuan Superadmin:
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canApprove && isPending && onReject && (
              <button
                onClick={() => { onClose(); onReject(leave) }}
                className="h-9 px-3.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Tolak</span>
              </button>
            )}
            {canApprove && isPending && onApprove && (
              <button
                onClick={() => { onClose(); onApprove(leave) }}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Setujui (Final)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>Tutup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaveDetailModal