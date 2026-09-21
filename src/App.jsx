import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import UnitAdminSDPage from './pages/UnitAdminSDPage.jsx'
import DataGuruPegawaiPage from './pages/DataGuruPegawaiPage.jsx'
import AdminUserPage from './pages/AdminUserPage.jsx'
import RekapLaporanPage from './pages/RekapLaporanPage.jsx'
import RankingKehadiranPage from './pages/RankingKehadiranPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/unit-sd-islam-rj" element={<UnitAdminSDPage />} />
          <Route path="/manajemen-admin-user" element={<AdminUserPage />} />
          <Route path="/data-guru-dan-pegawai" element={<DataGuruPegawaiPage />} />
          <Route path="/rekap-dan-laporan" element={<RekapLaporanPage />} />
          <Route path="/ranking-kehadiran" element={<RankingKehadiranPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App