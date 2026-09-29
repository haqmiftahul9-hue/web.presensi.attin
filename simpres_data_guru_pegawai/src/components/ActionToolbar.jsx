import { useSimPres, addActivityLog, selectCurrentUser } from '../store/simPresStore.jsx'
import { useState } from 'react'
import AddEmployeeModal from './AddEmployeeModal.jsx'
import { downloadTemplate } from '../data/employeeTemplate.js'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Nonaktif', label: 'Nonaktif' },
]

function ActionToolbar({
  onImport,
  unitFilter, setUnitFilter,
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  onResetFilters, setCurrentPageReset,
}) {
  const { state, dispatch } = useSimPres()
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState(null)

  const flash = (text) => {
    setToast(text)
    setTimeout(() => setToast(null), 4000)
  }

  const handleAddEmployee = (newStaff) => {
    dispatch({ type: 'ADD_STAFF', payload: newStaff })
    addActivityLog(
      dispatch, state, 'Tambah', `Pegawai • ${newStaff.name}`,
      `Tambah pegawai baru NIY ${newStaff.niy} (${newStaff.role}) di ${state.units.find((u) => u.id === newStaff.unitId)?.nama || newStaff.unitId}, kontak ${newStaff.kontak || '-'}, email ${newStaff.email || '-'}`,
      null, null, newStaff.unitId,
    )
    setShowAddModal(false)
    setCurrentPageReset(1)
    setSearchTerm('')
    flash(`Pegawai ${newStaff.name} berhasil ditambahkan.`)
  }

  const handleDownloadTemplate = () => {
    downloadTemplate(state)
    addActivityLog(
      dispatch, state, 'Ekspor', 'Template Import Pegawai',
      'Unduh template Excel import data pegawai',
      null, null, selectCurrentUser(state)?.unitId,
    )
    flash('Template Excel berhasil diunduh.')
  }

  // Setiap perubahan filter mengembalikan tabel ke halaman pertama.
  const withPageReset = (setter) => (value) => {
    setter(value)
    setCurrentPageReset(1)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm">
      <div className="p-space-md bg-surface-container-lowest flex items-center justify-between gap-4 flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onImport}
            className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Import Pegawai</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="h-10 px-4 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
            <span>Download Template</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 px-4 rounded-lg bg-primary-container hover:bg-[#132c54] text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tambah Pegawai Baru</span>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
          <div className="relative w-40">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">domain</span>
            <select
              className="w-full h-10 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest appearance-none cursor-pointer"
              value={unitFilter}
              onChange={(e) => withPageReset(setUnitFilter)(e.target.value)}
            >
              <option value="all">Semua Unit ({state.units.length} Unit)</option>
              {state.units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <div className="relative w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-10 pl-9 pr-4 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
              placeholder="Cari Nama / Jabatan / NIY / Unit..."
              value={searchTerm}
              onChange={(e) => withPageReset(setSearchTerm)(e.target.value)}
              type="search"
            />
          </div>
          <div className="relative w-36">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">edit_note</span>
            <select
              className="w-full h-10 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => withPageReset(setStatusFilter)(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <button
            onClick={() => {
              onResetFilters()
              setCurrentPageReset(1)
            }}
            className="h-10 px-4 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">restore</span>
            <span>Reset Filter</span>
          </button>
        </div>
      </div>
      {toast && (
        <div className="px-space-md py-2 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border-t border-outline/20">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEmployee}
        />
      )}
    </div>
  )
}

export default ActionToolbar
