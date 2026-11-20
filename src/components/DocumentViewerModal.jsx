import { useState, useEffect } from 'react'
import Icon from './Icon.jsx'
import {
  resolveDocumentUrl,
  isImageDocument,
  isPdfDocument,
  formatDocumentSize,
} from '../services/leaveAttachmentService.js'

function DocumentViewerModal({ isOpen, onClose, leave }) {
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setZoom(1)
    }
  }, [isOpen, leave])

  if (!isOpen || !leave) return null

  const fileName = leave.lampiranNama || leave.lampiran_nama || leave.lampiran || 'surat_keterangan.pdf'
  const fileSize = leave.lampiranUkuran || leave.lampiran_ukuran || null
  const documentUrl = resolveDocumentUrl(leave)
  const isImage = isImageDocument(documentUrl) || isImageDocument(fileName)
  const isPdf = isPdfDocument(documentUrl) || isPdfDocument(fileName)

  const handleDownload = () => {
    try {
      const a = document.createElement('a')
      a.href = documentUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      window.open(documentUrl, '_blank')
    }
  }

  const handleOpenExternal = () => {
    window.open(documentUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Icon name="description" className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                Bukti Dokumen Surat Izin &amp; Cuti
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {leave.name ? `${leave.name} • ` : ''}{leave.jenis} ({leave.periode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Tutup pratinjau"
            type="button"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Informasi Berkas */}
        <div className="px-5 py-2.5 bg-secondary/30 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">attach_file</span>
            <span className="font-semibold text-foreground truncate max-w-[260px] sm:max-w-[400px]">
              {fileName}
            </span>
            {fileSize ? (
              <span className="text-[11px] text-muted-foreground shrink-0">
                ({formatDocumentSize(fileSize)})
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 bg-card border border-border/80 rounded-lg p-0.5 mr-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
                  title="Perkecil"
                >
                  <Icon name="zoom_out" className="text-[16px]" />
                </button>
                <span className="text-[10px] font-mono px-1 text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
                  title="Perbesar"
                >
                  <Icon name="zoom_in" className="text-[16px]" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenExternal}
              className="h-8 px-2.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka di tab baru"
            >
              <Icon name="open_in_new" className="text-[14px]" />
              <span className="hidden sm:inline">Buka Tab Baru</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="h-8 px-2.5 rounded-lg bg-primary hover:bg-primary-strong text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Unduh dokumen"
            >
              <Icon name="download" className="text-[14px]" />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/10 dark:bg-black/30 min-h-[300px] sm:min-h-[460px]">
          {isImage ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={documentUrl}
                alt={`Lampiran ${fileName}`}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md border border-border/60 transition-transform duration-150"
              />
            </div>
          ) : isPdf && !documentUrl.startsWith('data:image/') ? (
            <div className="w-full h-[65vh] flex flex-col bg-card rounded-xl overflow-hidden border border-border/80">
              <iframe
                src={documentUrl}
                title={`Dokumen PDF ${fileName}`}
                className="w-full flex-1 border-0"
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            /* Fallback generic document preview */
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={documentUrl}
                alt={`Lampiran ${fileName}`}
                onLoad={() => setLoading(false)}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md border border-border/60 transition-transform duration-150"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Icon name="verified_user" className="text-[15px] text-emerald-600 dark:text-emerald-400" />
            <span>Dokumen bukti pengajuan terverifikasi tersimpan di sistem SIMPRES.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/60 text-xs font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewerModal
