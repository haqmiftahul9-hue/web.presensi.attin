import { useSimPres } from '../store/simPresStore.jsx'
import { useState } from 'react'
import AddEmployeeModal from './AddEmployeeModal.jsx'

function ActionToolbar({ onImport, unitFilter, setUnitFilter, searchTerm, setSearchTerm, statusFilter, setStatusFilter, onResetFilters, setCurrentPageReset }) {
  const { state, dispatch } = useSimPres()
  const [showAddModal, setShowAddModal] = useState(false)
  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Aktif', label: 'Aktif' },
    { value: 'Nonaktif', label: 'Nonaktif' },
  ]

const handleAddEmployee = (newStaff) => {
      dispatch({ type: 'ADD_STAFF', payload: newStaff })
      setShowAddModal(false)
      setCurrentPageReset(1)
    }

  const handleDownloadTemplate = () => {
    const headers = ['NIY', 'Nama', 'Gelar', 'Unit', 'Jabatan', 'Status']
    const unitNames = state.units.map(u => u.nama).join(' | ')
    const exampleRows = [
      ['049001234', 'Budi Santoso, S.Pd', '', state.units[0]?.nama || 'TK IT RJ', 'Guru Kelas', 'Aktif'],
      ['049001235', 'Siti Rahayu, S.Ag', '', state.units[1]?.nama || 'SD Islam RJ', 'Guru PAI', 'Aktif'],
    ]
    const lines = [
      headers.join(','),
      ...exampleRows.map(r => r.join(',')),
    ]
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'template_import_pegawai.csv'
    link.click()
    URL.revokeObjectURL(link.href)
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
             onClick={() => setShowAddModal(prev => true)}
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
              onChange={(e) => setUnitFilter(e.target.value)}
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
              placeholder="Cari Nama / Jabatan / NIY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
            />
          </div>
          <div className="relative w-36">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">edit_note</span>
            <select
              className="w-full h-10 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <button
            onClick={onResetFilters}
            className="h-10 px-4 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-md-medium text-body-md-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">restore</span>
            <span>Reset Filter</span>
          </button>
        </div>
      </div>
{showAddModal && (
         <AddEmployeeModal
           onClose={() => setShowAddModal(prev => false)}
           onSave={handleAddEmployee}
         />
       )}
    </div>
  )
}

export default ActionToolbar