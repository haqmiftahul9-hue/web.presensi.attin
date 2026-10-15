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
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug" id="modalTitle">
                {isAktif ? 'Nonaktifkan / Hapus Pegawai' : 'Hapus Pegawai'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {staff.name} &middot; NIY: {staff.niy}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs">
          <p className="text-slate-600">
            Pilih tindakan untuk pegawai ini. Seluruh aksi akan dicatat dalam Log Audit Aktivitas.
          </p>
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Nonaktifkan</strong>: Status diubah menjadi Nonaktif, seluruh riwayat tetap tersimpan dan akun dapat diaktifkan kembali.
              </p>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Hapus</strong>: Data pegawai dihapus permanen dari sistem dan tidak dapat dipulihkan kembali.
              </p>
            </div>
          </div>
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
          <button
            onClick={onCancel}
            disabled={pending !== null}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            type="button"
          >
            Batal
          </button>
          {isAktif && (
            <button
              onClick={() => run('toggle')}
              disabled={pending !== null}
              className="h-9 px-3.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
            className="h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
