import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSimPres, selectAppMode, selectAppHomePath, MODE_MOBILE } from './store/simPresStore.jsx'
import SidebarNav from './components/Sidebar.jsx'
import Header from './components/Header.jsx'

/**
 * Kerangka aplikasi desktop (Superadmin/Admin Unit/Petugas).
 *
 * Responsive, bukan "diperkecil":
 *  - >= 1024px (lg): sidebar tetap 260px seperti biasa, konten digeser 260px.
 *  - < 1024px      : sidebar menjadi drawer (buka/tutup lewat tombol hamburger),
 *                    konten memakai 100% lebar layar dan mengalir normal.
 *
 * Tidak ada transform scale, zoom, atau max-width tetap yang mengecilkan
 * halaman: halaman panjang tetap di-scroll seperti aplikasi mobile biasa.
 * Role mobile (Guru/Pegawai) dialihkan ke modul mobile-nya.
 */
function Layout() {
  const { state } = useSimPres()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Tutup drawer setiap pindah halaman, seperti aplikasi native.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Kunci scroll body saat drawer terbuka agar halaman di belakang tidak
  // ikut bergeser mengikuti jari.
  useEffect(() => {
    if (!drawerOpen) return undefined
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [drawerOpen])

  if (selectAppMode(state) === MODE_MOBILE) {
    return <Navigate to={selectAppHomePath(state)} replace />
  }

  return (
    <div className="min-h-[100dvh] bg-background overflow-x-clip">
      <SidebarNav open={drawerOpen} onTutup={() => setDrawerOpen(false)} />

      {/* Lapisan gelap saat drawer terbuka (hanya layar kecil). */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-primary/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Hanya di layar kecil: sidebar tidak lagi menggeser konten. */}
      <div className="lg:pl-[260px] min-h-[100dvh] flex flex-col">
        <Header onBukaMenu={() => setDrawerOpen(true)} />
        <main className="sp-portal-main w-full flex-1 bg-background min-h-[100dvh]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout