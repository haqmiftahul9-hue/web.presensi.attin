import { useState } from 'react'

function DeleteConfirmationModal({ staff, onCancel, onDelete }) {
  const handleDelete = () => {
    onDelete(staff.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
              Hapus Pegawai
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5" id="modalSubtitle">
              Apakah Anda yakin ingin menghapus pegawai {staff.name}? Tindakan ini tidak dapat diurungkan.
            </p>
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

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
          <button
            onClick={onCancel}
            className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            className="px-space-md py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            id="btnDeleteEmployee"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Hapus Pegawai</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal