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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div className="flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
                {isAktif ? 'Nonaktifkan / Hapus Pegawai' : 'Hapus Pegawai'}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {staff.name} &middot; NIY {staff.niy}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-space-sm">
          <p className="font-body-sm text-body-sm text-on-surface">
            Pilih tindakan untuk pegawai ini. Keduanya tercatat pada Log Aktivitas.
          </p>
          <ul className="font-body-sm text-on-surface-variant list-disc pl-5 space-y-1">
            <li>
              <strong className="text-on-surface">Nonaktifkan</strong>: status menjadi Nonaktif, data tetap tersimpan dan bisa diaktifkan kembali.
            </li>
            <li>
              <strong className="text-on-surface">Hapus</strong>: data pegawai dihapus permanen dari tabel dan tidak dapat diurungkan.
            </li>
          </ul>
          {error ? <p className="font-body-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-xs flex-wrap">
          <button
            onClick={onCancel}
            disabled={pending !== null}
            className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer disabled:opacity-50"
            type="button"
          >
            Batal
          </button>
          {isAktif && (
            <button
              onClick={() => run('toggle')}
              disabled={pending !== null}
              className="px-space-md py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-body-md-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              id="btnToggleEmployee"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">toggle_off</span>
              <span>{pending === 'toggle' ? 'Memproses...' : 'Nonaktifkan'}</span>
            </button>
          )}
          <button
            onClick={() => run('delete')}
            disabled={pending !== null}
            className="px-space-md py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            id="btnDeleteEmployee"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>{pending === 'delete' ? 'Memproses...' : 'Hapus Pegawai'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal
