import { useState } from 'react'
import BreadcrumbHeader from '../components/BreadcrumbHeader.jsx'
import ActionToolbar from '../components/ActionToolbar.jsx'
import StaffTable from '../components/StaffTable.jsx'
import UnitCards from '../components/UnitCards.jsx'
import ImportModal from '../components/ImportModal.jsx'

function DataGuruPegawaiPage() {
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
      <BreadcrumbHeader />
      <ActionToolbar onImport={() => setShowImport(true)} />
      <StaffTable />
      <UnitCards />
      <ImportModal show={showImport} onClose={() => setShowImport(false)} />
    </div>
  )
}

export default DataGuruPegawaiPage