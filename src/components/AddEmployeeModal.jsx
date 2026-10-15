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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug" id="modalTitle">
              Tambah Pegawai Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi formulir data pegawai baru. Bertanda <span className="text-rose-500">*</span> wajib diisi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <EmployeeFormFields form={form} setForm={setForm} errors={errors} />
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {Object.keys(errors).length > 0
              ? `${Object.keys(errors).length} kolom perlu diperbaiki`
              : 'Data akan langsung tersimpan ke sistem.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
