import { Outlet } from 'react-router-dom'
import SidebarNav from './components/Sidebar.jsx'
import Header from './components/Header.jsx'

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="pl-[260px]">
        <Header />
        <main className="w-full pt-16 bg-background min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout