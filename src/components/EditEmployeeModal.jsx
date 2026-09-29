import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import EmployeeFormFields from './EmployeeFormFields.jsx'
import { toEmployeeForm, validateEmployee } from '../data/employeeSchema.js'

function EditEmployeeModal({ staff, onClose, onSave }) {
  const { state } = useSimPres()
  const [form, setForm] = useState(() => toEmployeeForm(staff, state))
  const [errors, setErrors] = useState({})

  const handleSave = () => {
    const found = validateEmployee(form, {
      staff: state.staff,
      units: state.units,
      excludeId: staff?.id,
    })
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
      id: staff.id,
      // Field presensi bukan milik form ini dan harus tetap terjaga.
      masuk: staff.masuk,
      method: staff.method,
      late: staff.late,
      alpha: staff.alpha,
      outsideRadius: staff.outsideRadius,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
              Edit Pegawai
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Perbarui data {staff?.name} (NIY {staff?.niy}).
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg overflow-y-auto">
          <EmployeeFormFields form={form} setForm={setForm} errors={errors} />
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-between gap-space-md">
          <span className="text-xs text-on-surface-variant">
            {Object.keys(errors).length > 0
              ? `${Object.keys(errors).length} kolom perlu diperbaiki`
              : 'Perubahan langsung tercermin di tabel.'}
          </span>
          <div className="flex items-center gap-space-md">
            <button
              onClick={onClose}
              className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              id="btnSaveEmployee"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditEmployeeModal
