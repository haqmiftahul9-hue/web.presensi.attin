import { Navigate, useLocation } from 'react-router-dom'
import { useSimPres, hasMenuPermission } from '../store/simPresStore.jsx'

const routeMenuKeyMap = {
  '/': 'dashboard',
  '/unit-sd-islam-rj': 'manajemenUnit',
  '/manajemen-admin-user': 'manajemenAdminUser',
  '/data-guru-dan-pegawai': 'dataGuruPegawai',
  '/presensi': 'presensi',
  '/rekap-dan-laporan': 'rekapLaporan',
  '/ranking-kehadiran': 'rankingKehadiran',
  '/pengajuan-izin-dan-cuti': 'pengajuanIzinCuti',
  '/log-aktivitas': 'logAktivitas',
  '/pengaturan-global': 'pengaturanGlobal',
}

function ProtectedRoute({ children }) {
  const { state } = useSimPres()
  const location = useLocation()
  const menuKey = routeMenuKeyMap[location.pathname]

  if (!menuKey || hasMenuPermission(state, menuKey)) {
    return children
  }

  return <Navigate to="/" replace />
}

export default ProtectedRoute