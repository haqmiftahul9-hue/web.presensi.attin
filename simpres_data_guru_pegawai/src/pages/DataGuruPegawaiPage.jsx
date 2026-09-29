import { useState } from 'react'
import BreadcrumbHeader from '../components/BreadcrumbHeader.jsx'
import ActionToolbar from '../components/ActionToolbar.jsx'
import StaffTable from '../components/StaffTable.jsx'
import UnitCards from '../components/UnitCards.jsx'
import ImportModal from '../components/ImportModal.jsx'

function DataGuruPegawaiPage() {
  const [showImport, setShowImport] = useState(false)
  const [unitFilter, setUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const handleResetFilters = () => {
    setUnitFilter('all')
    setSearchTerm('')
    setStatusFilter('all')
  }

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg w-full min-w-0">
      <BreadcrumbHeader />
      <ActionToolbar
        onImport={() => setShowImport(true)}
        unitFilter={unitFilter}
        setUnitFilter={setUnitFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onResetFilters={handleResetFilters}
        setCurrentPageReset={setCurrentPage}
      />
      <StaffTable
        unitFilter={unitFilter}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <UnitCards />
      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => setCurrentPage(1)}
      />
    </div>
  )
}

export default DataGuruPegawaiPage
