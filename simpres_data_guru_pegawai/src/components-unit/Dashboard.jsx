import { useEffect, useState } from 'react'
import NoticeBar from './NoticeBar.jsx'
import WelcomeBanner from './WelcomeBanner.jsx'
import StatCards from './StatCards.jsx'
import AttendanceTable from './AttendanceTable.jsx'
import BottomCards from './BottomCards.jsx'

function Dashboard() {
  return (
    <div className="flex flex-col w-full">
      <NoticeBar />
      <div className="px-space-xl py-space-md flex flex-col gap-space-lg">
        <WelcomeBanner />
        <StatCards />
        <AttendanceTable />
        <BottomCards />
      </div>
    </div>
  )
}

export default Dashboard