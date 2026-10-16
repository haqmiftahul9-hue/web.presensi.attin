import { useSimPres, addActivityLog, selectCurrentUser, selectCanSwitchUnit, selectActiveUnitId, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
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
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  onResetFilters, setCurrentPageReset,
  onStaffAdded,
}) {
  const { state, dispatch } = useSimPres()
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState(null)

  // Unit terpilih berasal dari store utama; role non-Superadmin tidak punya
  // selector sehingga toolbox ini menampilkan unitnya secara terkunci.
  const canSwitchUnit = selectCanSwitchUnit(state)
  const activeUnitId = selectActiveUnitId(state)
  const unitOptions = selectUnitOptionsById(state)
  const handleUnitChange = (value) => {
    dispatch({ type: 'SET_SELECTED_UNIT', payload: value })
    setCurrentPageReset(1)
  }

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
    setSearchTerm('')
    // Beri tahu tabel agar pegawai baru langsung dibuka, bukan terseset di halaman akhir.
    onStaffAdded?.(newStaff.id)
    setCurrentPageReset(1)
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
    <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 space-y-3 flex flex-col">
      {/* Baris 1 — Aksi: Import, Download Template, Tambah Pegawai Baru */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onImport}
          className="h-9 shrink-0 px-3.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">upload_file</span>
          <span>Import Pegawai</span>
        </button>
        <button
          onClick={handleDownloadTemplate}
          className="h-9 shrink-0 px-3.5 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] leading-none text-muted-foreground">download</span>
          <span>Download Template</span>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 shrink-0 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap sm:ml-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">person_add</span>
          <span>Tambah Pegawai Baru</span>
        </button>
      </div>

      {/* Baris 2 — Filter: Unit, Search, Status, Reset */}
      <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
        {canSwitchUnit ? (
          <div className="relative w-full sm:w-52 sm:flex-none">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">domain</span>
            <select
              className="w-full h-9 pl-8 pr-7 bg-card hover:bg-muted/40 border border-input text-foreground text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer truncate transition-colors"
              value={activeUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
            >
              <option value={ALL_UNITS}>Semua Unit ({state.units.length} Unit)</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">expand_more</span>
          </div>
        ) : (
          <div className="relative w-full sm:w-52 sm:flex-none">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">domain</span>
            <div className="w-full h-9 pl-8 pr-7 bg-muted/60 border border-border flex items-center text-muted-foreground text-xs font-medium rounded-lg truncate cursor-not-allowed" title="Unit mengikuti akun Anda">
              {unitOptions[0]?.nama || 'Semua Unit'}
            </div>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">lock</span>
          </div>
        )}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">search</span>
          <input
            className="w-full h-9 pl-8 pr-3 bg-card hover:bg-muted/40 border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            placeholder="Cari Nama / Jabatan / NIY / Unit..."
            value={searchTerm}
            onChange={(e) => withPageReset(setSearchTerm)(e.target.value)}
            type="search"
          />
        </div>
        <div className="relative w-full sm:w-36 sm:flex-none">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">tune</span>
          <select
            className="w-full h-9 pl-8 pr-7 bg-card hover:bg-muted/40 border border-input text-foreground text-xs font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer truncate transition-colors"
            value={statusFilter}
            onChange={(e) => withPageReset(setStatusFilter)(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px] pointer-events-none leading-none">expand_more</span>
        </div>
        <button
          onClick={() => {
            onResetFilters()
            setCurrentPageReset(1)
          }}
          className="w-full sm:w-auto sm:flex-none h-9 px-3 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          type="button"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">restart_alt</span>
          <span>Reset Filter</span>
        </button>
      </div>
      {toast && (
        <div className="px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
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
