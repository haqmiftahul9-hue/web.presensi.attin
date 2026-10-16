import { useState } from 'react'
import { useSimPres, nextStaffId } from '../store/simPresStore.jsx'
import EmployeeFormFields from './EmployeeFormFields.jsx'
import { toEmptyEmployee, validateEmployee } from '../data/employeeSchema.js'

function AddEmployeeModal({ onClose, onSave }) {
  const { state } = useSimPres()
  const [form, setForm] = useState(() => toEmptyEmployee(state))
  const [errors, setErrors] = useState({})

  const handleSave = () => {
    const found = validateEmployee(form, { staff: state.staff, units: state.units })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0]
      document.getElementById(`emp-${firstKey}`)?.focus()
      return
    }

    const trimmed = {}
    for (const [key, value] of Object.entries(form)) {
      trimmed[key] = typeof value === 'string' ? value.trim() : value
    }

    onSave({
      ...trimmed,
      id: nextStaffId(state),
      masuk: null,
      method: null,
      lateMinutes: 0,
      alpha: false,
      outsideRadius: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div>
            <h2 className="text-base font-bold text-foreground leading-snug" id="modalTitle">
              Tambah Pegawai Baru
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Isi formulir data pegawai baru. Bertanda <span className="text-destructive">*</span> wajib diisi.
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

        <div className="p-6 overflow-y-auto">
          <EmployeeFormFields form={form} setForm={setForm} errors={errors} />
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {Object.keys(errors).length > 0
              ? `${Object.keys(errors).length} kolom perlu diperbaiki`
              : 'Data akan langsung tersimpan ke sistem.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              id="btnSaveEmployee"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Simpan Pegawai</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddEmployeeModal
