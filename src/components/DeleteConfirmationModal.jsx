import { useState } from 'react'

function DeleteConfirmationModal({ staff, onCancel, onDelete, onToggleStatus }) {
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  if (!staff) return null

  const isAktif = staff.status === 'Aktif'
  const run = (action) => {
    setPending(action)
    setError('')
    // Kunci tombolselagi request diproses supaya tidak terkirim ganda.
    Promise.resolve()
      .then(() => (action === 'delete' ? onDelete(staff) : onToggleStatus(staff)))
      .catch((err) => {
        setError(err?.message || 'Aksi gagal diproses.')
        setPending(null)
      })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onCancel}>
      <div
        className="relative w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug" id="modalTitle">
                {isAktif ? 'Nonaktifkan / Hapus Pegawai' : 'Hapus Pegawai'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {staff.name} &middot; NIY: {staff.niy}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs">
          <p className="text-muted-foreground">
            Pilih tindakan untuk pegawai ini. Seluruh aksi akan dicatat dalam Log Audit Aktivitas.
          </p>
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Nonaktifkan</strong>: Status diubah menjadi Nonaktif, seluruh riwayat tetap tersimpan dan akun dapat diaktifkan kembali.
              </p>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-border/60">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></span>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Hapus</strong>: Data pegawai dihapus permanen dari sistem dan tidak dapat dipulihkan kembali.
              </p>
            </div>
          </div>
          {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5 flex-wrap">
          <button
            onClick={onCancel}
            disabled={pending !== null}
            className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            type="button"
          >
            Batal
          </button>
          {isAktif && (
            <button
              onClick={() => run('toggle')}
              disabled={pending !== null}
              className="h-9 px-3.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              id="btnToggleEmployee"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">toggle_off</span>
              <span>{pending === 'toggle' ? 'Memproses...' : 'Nonaktifkan'}</span>
            </button>
          )}
          <button
            onClick={() => run('delete')}
            disabled={pending !== null}
            className="h-9 px-3.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            id="btnDeleteEmployee"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>{pending === 'delete' ? 'Memproses...' : 'Hapus Pegawai'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal
