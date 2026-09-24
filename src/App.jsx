import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UnitAdminSDPage from './pages/UnitAdminSDPage.jsx'
import DataGuruPegawaiPage from './pages/DataGuruPegawaiPage.jsx'
import AdminUserPage from './pages/AdminUserPage.jsx'
import RekapLaporanPage from './pages/RekapLaporanPage.jsx'
import RankingKehadiranPage from './pages/RankingKehadiranPage.jsx'
import LogAktivitasPage from './pages/LogAktivitasPage.jsx'

import PengaturanGlobalPage from './pages/PengaturanGlobalPage.jsx'
import PengajuanIzinCutiPage from './pages/PengajuanIzinCutiPage.jsx'
import MonitoringPresensiPage from './pages/MonitoringPresensiPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/unit-sd-islam-rj" element={<ProtectedRoute><UnitAdminSDPage /></ProtectedRoute>} />
          <Route path="/manajemen-admin-user" element={<ProtectedRoute><AdminUserPage /></ProtectedRoute>} />
          <Route path="/data-guru-dan-pegawai" element={<ProtectedRoute><DataGuruPegawaiPage /></ProtectedRoute>} />
          <Route path="/rekap-dan-laporan" element={<ProtectedRoute><RekapLaporanPage /></ProtectedRoute>} />
          <Route path="/ranking-kehadiran" element={<ProtectedRoute><RankingKehadiranPage /></ProtectedRoute>} />
          <Route path="/log-aktivitas" element={<ProtectedRoute><LogAktivitasPage /></ProtectedRoute>} />
          <Route path="/pengaturan-global" element={<ProtectedRoute><PengaturanGlobalPage /></ProtectedRoute>} />
          <Route path="/pengajuan-izin-dan-cuti" element={<ProtectedRoute><PengajuanIzinCutiPage /></ProtectedRoute>} />
          <Route path="/presensi" element={<ProtectedRoute><MonitoringPresensiPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App