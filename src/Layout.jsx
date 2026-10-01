import { Navigate, Outlet } from 'react-router-dom'
import { useSimPres, selectAppMode, selectAppHomePath, MODE_MOBILE } from './store/simPresStore.jsx'
import SidebarNav from './components/Sidebar.jsx'
import Header from './components/Header.jsx'

/**
 * Kerangka aplikasi desktop: sidebar + header + halaman tabel.
 *
 * Role mobile (Guru/Pegawai) langsung dialihkan ke beranda modul mobile, jadi
 * tidak ada satu pun keadaan di mana akun Guru melihat sidebar desktop.
 */
function Layout() {
  const { state } = useSimPres()

  if (selectAppMode(state) === MODE_MOBILE) {
    return <Navigate to={selectAppHomePath(state)} replace />
  }

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