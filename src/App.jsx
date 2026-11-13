import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import AppSplash from './components/AppSplash.jsx'
import {
  useSimPres, selectAppHomePath, selectIsAuthenticated, performLogout,
} from './store/simPresStore.jsx'
import Layout from './Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DashboardOverview from './pages/DashboardOverview.jsx'
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
import AdminPresensiScanPage from './pages/AdminPresensiScanPage.jsx'
import AdminPresensiManualPage from './pages/AdminPresensiManualPage.jsx'
import AttendanceApprovalsPage from './pages/AttendanceApprovalsPage.jsx'
import EditPresensiPage from './pages/EditPresensiPage.jsx'
import TwoFactorSetupPage from './pages/TwoFactorSetupPage.jsx'
import TwoFactorVerifyPage from './pages/TwoFactorVerifyPage.jsx'
import MobileBerandaPage from './pages/mobile/MobileBerandaPage.jsx'
import MobilePresensiPage from './pages/mobile/MobilePresensiPage.jsx'
import MobileRiwayatPage from './pages/mobile/MobileRiwayatPage.jsx'
import MobileProfilPage from './pages/mobile/MobileProfilPage.jsx'
import MobileSlipPage from './pages/mobile/MobileSlipPage.jsx'
import MobileIzinCutiPage from './pages/mobile/MobileIzinCutiPage.jsx'
import MobilePersetujuanIzinPage from './pages/mobile/MobilePersetujuanIzinPage.jsx'
import MobileKartuIdPage from './pages/mobile/MobileKartuIdPage.jsx'
import MobileQrPage from './pages/mobile/MobileQrPage.jsx'
import MobileLayout from './components/mobile/MobileLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AccessDeniedPage from './pages/AccessDeniedPage.jsx'
import ProtectedRoute, { GuestOnlyRoute } from './components/ProtectedRoute.jsx'
import { Toaster } from 'react-hot-toast'

/**
 * Path lama tidak dihapus, hanya diarahkan ke path kanonik sesuai mode. Bookmark
 * lama tetap hidup, dan tidak ada dua nama untuk satu halaman.
 */
function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <BrowserRouter>
      <AppSplash show={showSplash} onDone={() => setShowSplash(false)} />
      <Toaster
        position="top-center"
        reverseOrder={true}
      />
      <Routes>
        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        {/* Bersihkan sesi lama lalu ke halaman login (bantu untuk pengujian). */}
        <Route path="/logout" element={<LogoutRoute />} />

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
          <Route path="/mobile/persetujuan-izin" element={<MobilePersetujuanIzinPage />} />
      {/* Kartu ID dan QR Presensi sengaja dua halaman terpisah, meski memakai
          satu payload QR yang sama (data/employeeCard.js). */}
      <Route path="/mobile/kartu-id" element={<MobileKartuIdPage />} />
      <Route path="/mobile/qr" element={<MobileQrPage />} />
          <Route path="/mobile/profil" element={<MobileProfilPage />} />
        </Route>

        {/* Alias path lama modul mobile -> path kanonik /mobile/*. */}
        <Route path="/beranda-saya" element={<Navigate to="/mobile/home" replace />} />
        <Route path="/presensi-saya" element={<Navigate to="/mobile/presensi" replace />} />
        <Route path="/riwayat-saya" element={<Navigate to="/mobile/riwayat" replace />} />
        <Route path="/slip-kehadiran-saya" element={<Navigate to="/mobile/slip" replace />} />
        <Route path="/izin-cuti-saya" element={<Navigate to="/mobile/izin-cuti" replace />} />
      <Route path="/kartu-id-saya" element={<Navigate to="/mobile/kartu-id" replace />} />
      <Route path="/qr-presensi-saya" element={<Navigate to="/mobile/qr" replace />} />
        <Route path="/profil-saya" element={<Navigate to="/mobile/profil" replace />} />

        {/*="/" lama -> beranda sesuai role. */}
        <Route path="/" element={<PortalHome />} />

        {/* Alias path lama/typo yang sering diketik. Hasilnya tetap ditentukan
            role: Guru/Pegawai -> /mobile/home, role portal -> dashboard. */}
        <Route path="/admin" element={<PortalHome />} />
        <Route path="/data-guru" element={<PortalHome />} />

        {/* Terminal "akses tidak tersedia". Hanya butuh sesi login, tanpa
            permission menu — itulah yang membuat alur redirect selalu punya
            tempat mendarat dan tidak pernah berputar. */}
        <Route path="/403" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />

        {/* ===== DASHBOARD OVERVIEW =====
            Sidebar vertikal sendiri + konten mengisi sisa viewport. Sengaja di
            LUAR <Layout> supaya tidak ada sidebar ganda; gerbang aksesnya tetap
            ProtectedRoute (butuh sesi + izin menu 'dashboard'). */}
        <Route
          path="/dashboard-overview"
          element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>}
        />

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
          <Route path="/presensi-scan" element={<ProtectedRoute><AdminPresensiScanPage /></ProtectedRoute>} />
          <Route path="/presensi-manual" element={<ProtectedRoute><AdminPresensiManualPage /></ProtectedRoute>} />
          <Route path="/attendance-approvals" element={<ProtectedRoute><AttendanceApprovalsPage /></ProtectedRoute>} />
          <Route path="/edit-presensi" element={<ProtectedRoute><EditPresensiPage /></ProtectedRoute>} />
          <Route path="/2fa-setup" element={<ProtectedRoute><TwoFactorSetupPage /></ProtectedRoute>} />
          <Route path="/2fa-verify" element={<ProtectedRoute><TwoFactorVerifyPage /></ProtectedRoute>} />
        </Route>

        {/* Di luar daftar: kembali ke beranda mode yang sesuai. */}
        <Route path="*" element={<PortalHome />} />
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Membersihkan sesi yang tersimpan di peramban lalu kembali ke halaman login.
 *
 * Sesi lama memang sengaja dipakai lagi saat membuka aplikasi (pengguna tidak
 * perlu login ulang di HP), tapi saat browser dipakai bergantian atau setelah
 * pengujian, Cache/Storage bisa menahan sesi lama. Rute ini adalah cara resmi
 * untuk membersihkannya tanpa membuka DevTools.
 */
function LogoutRoute() {
  const { dispatch } = useSimPres()
  const navigate = useNavigate()
  useEffect(() => {
    performLogout(dispatch)
    navigate('/login', { replace: true })
  }, [dispatch, navigate])
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm" aria-live="polite">
      Keluar dari akun…
    </div>
  )
}

/** Beranda portal: Superadmin ke /superadmin, role unit lain ke /dashboard. */
function PortalHome() {
  const { state } = useSimPres()
  if (!selectIsAuthenticated(state)) return <Navigate to="/login" replace />
  return <Navigate to={selectAppHomePath(state)} replace />
}

export default App