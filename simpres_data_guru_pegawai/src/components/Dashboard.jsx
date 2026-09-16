import BreadcrumbHeader from './BreadcrumbHeader.jsx'
import ActionToolbar from './ActionToolbar.jsx'
import StaffTable from './StaffTable.jsx'
import ImportModal from './ImportModal.jsx'
import UnitCards from './UnitCards.jsx'
import { useState } from 'react'

function Dashboard() {
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

export default Dashboard