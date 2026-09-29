import { useState } from 'react'
import { useSimPres, selectActiveUnitId } from '../store/simPresStore.jsx'
import BreadcrumbHeader from '../components/BreadcrumbHeader.jsx'
import ActionToolbar from '../components/ActionToolbar.jsx'
import StaffTable from '../components/StaffTable.jsx'
import UnitCards from '../components/UnitCards.jsx'
import ImportModal from '../components/ImportModal.jsx'

function DataGuruPegawaiPage() {
  const { state } = useSimPres()
  const [showImport, setShowImport] = useState(false)
  // Unit filter bukan lagi state lokal: dibaca dari unit terpilih di store.
  const unitFilter = selectActiveUnitId(state)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [focusStaffId, setFocusStaffId] = useState(null)

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg w-full min-w-0">
      <BreadcrumbHeader />
      <ActionToolbar
        onImport={() => setShowImport(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onResetFilters={handleResetFilters}
        setCurrentPageReset={setCurrentPage}
        onStaffAdded={setFocusStaffId}
      />
      <StaffTable
        unitFilter={unitFilter}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        focusStaffId={focusStaffId}
      />
      <UnitCards />
      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onImported={(firstAddedId) => {
          // Baris hasil impor berada di urutan terakhir: arahkan tabel ke sana
          // supaya data baru langsung terlihat.
          setCurrentPage(1)
          if (firstAddedId != null) setFocusStaffId(firstAddedId)
        }}
      />
    </div>
  )
}

export default DataGuruPegawaiPage
