import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { useSimPres, selectAppHomePath, selectIsAuthenticated } from './store/simPresStore.jsx'
import Layout from './Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UnitAdminSDPage from './pages/UnitAdminSDPage.jsx'
import DataGuruPegawaiPage from './pages/DataGuruPegawaiPage.jsx'
import CetakKartuIdPage from './pages/CetakKartuIdPage.jsx'
import AdminUserPage from './pages/AdminUserPage.jsx'
import RekapLaporanPage from './pages/RekapLaporanPage.jsx'
import RankingKehadiranPage from './pages/RankingKehadiranPage.jsx'
import LogAktivitasPage from './pages/LogAktivitasPage.jsx'
import PengaturanGlobalPage from './pages/PengaturanGlobalPage.jsx'
import PengajuanIzinCutiPage from './pages/PengajuanIzinCutiPage.jsx'
import MonitoringPresensiPage from './pages/MonitoringPresensiPage.jsx'
import MobileBerandaPage from './pages/mobile/MobileBerandaPage.jsx'
import MobilePresensiPage from './pages/mobile/MobilePresensiPage.jsx'
import MobileRiwayatPage from './pages/mobile/MobileRiwayatPage.jsx'
import MobileProfilPage from './pages/mobile/MobileProfilPage.jsx'
import MobileSlipPage from './pages/mobile/MobileSlipPage.jsx'
import MobileIzinCutiPage from './pages/mobile/MobileIzinCutiPage.jsx'
import MobileLayout from './components/mobile/MobileLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProtectedRoute, { GuestOnlyRoute } from './components/ProtectedRoute.jsx'

/**
 * Path lama tidak dihapus, hanya diarahkan ke path kanonik sesuai mode. Bookmark
 * lama tetap hidup, dan tidak ada dua nama untuk satu halaman.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />

        {/* ===== APLIKASI MOBILE (Guru/Pegawai) =====
            Berdiri sendiri di luar <Layout> portal: header lengket, bottom
            navigation, tanpa sidebar. MobileLayout menolak role portal, dan
            Layout menolak role mobile, jadi tidak ada tumpang tindih. */}
        <Route element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
          <Route path="/mobile/home" element={<MobileBerandaPage />} />
          <Route path="/mobile/presensi" element={<MobilePresensiPage />} />
          <Route path="/mobile/riwayat" element={<MobileRiwayatPage />} />
          <Route path="/mobile/slip" element={<MobileSlipPage />} />
          <Route path="/mobile/izin-cuti" element={<MobileIzinCutiPage />} />
          <Route path="/mobile/profil" element={<MobileProfilPage />} />
        </Route>

        {/* Alias path lama modul mobile -> path kanonik /mobile/*. */}
        <Route path="/beranda-saya" element={<Navigate to="/mobile/home" replace />} />
        <Route path="/presensi-saya" element={<Navigate to="/mobile/presensi" replace />} />
        <Route path="/riwayat-saya" element={<Navigate to="/mobile/riwayat" replace />} />
        <Route path="/slip-kehadiran-saya" element={<Navigate to="/mobile/slip" replace />} />
        <Route path="/izin-cuti-saya" element={<Navigate to="/mobile/izin-cuti" replace />} />
        <Route path="/profil-saya" element={<Navigate to="/mobile/profil" replace />} />

        {/* "/" lama -> beranda sesuai role. */}
        <Route path="/" element={<PortalHome />} />

        {/* ===== APLIKASI DESKTOP (Superadmin / Admin Unit / Petugas) =====
            /superadmin hanya Superadmin (dicek ProtectedRoute lewat ROUTE_ROLES),
            /dashboard untuk role portal lain; keduanya memakai halaman dashboard
            yang sama dan dibedakan oleh cakupan unit dari store. */}
        <Route element={<Layout />}>
          <Route
            path="/superadmin"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route path="/unit-sd-islam-rj" element={<ProtectedRoute><UnitAdminSDPage /></ProtectedRoute>} />
          <Route path="/manajemen-admin-user" element={<ProtectedRoute><AdminUserPage /></ProtectedRoute>} />
          <Route path="/data-guru-dan-pegawai" element={<ProtectedRoute><DataGuruPegawaiPage /></ProtectedRoute>} />
          <Route path="/cetak-kartu-id" element={<ProtectedRoute><CetakKartuIdPage /></ProtectedRoute>} />
          <Route path="/rekap-dan-laporan" element={<ProtectedRoute><RekapLaporanPage /></ProtectedRoute>} />
          <Route path="/ranking-kehadiran" element={<ProtectedRoute><RankingKehadiranPage /></ProtectedRoute>} />
          <Route path="/log-aktivitas" element={<ProtectedRoute><LogAktivitasPage /></ProtectedRoute>} />
          <Route path="/pengaturan-global" element={<ProtectedRoute><PengaturanGlobalPage /></ProtectedRoute>} />
          <Route path="/pengajuan-izin-dan-cuti" element={<ProtectedRoute><PengajuanIzinCutiPage /></ProtectedRoute>} />
          <Route path="/presensi" element={<ProtectedRoute><MonitoringPresensiPage /></ProtectedRoute>} />
        </Route>

        {/* Di luar daftar: kembali ke beranda mode yang sesuai. */}
        <Route path="*" element={<PortalHome />} />
      </Routes>
    </BrowserRouter>
  )
}

/** Beranda portal: Superadmin ke /superadmin, role unit lain ke /dashboard. */
function PortalHome() {
  const { state } = useSimPres()
  if (!selectIsAuthenticated(state)) return <Navigate to="/login" replace />
  return <Navigate to={selectAppHomePath(state)} replace />
}

export default App