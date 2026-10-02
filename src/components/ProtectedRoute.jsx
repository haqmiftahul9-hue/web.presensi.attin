import { Navigate, useLocation } from 'react-router-dom'
import {
  useSimPres,
  canAccessPath,
  resolvePostLoginPath,
  selectCurrentUser,
  selectCurrentUserRole,
  selectIsAuthenticated,
  selectMustChangePassword,
  ACCESS_DENIED_PATH,
  ROUTE_MENU_KEYS,
} from '../store/simPresStore.jsx'
import ChangePasswordGate from './ChangePasswordGate.jsx'
import AccessDeniedPage from '../pages/AccessDeniedPage.jsx'

/**
 * Gerbang rute. Mengurutkan tiga hal sekaligus:
 *  1. harus sudah masuk (kalau belum, kembali ke login sambil menyimpan tujuan);
 *  2. akun yang wajib mengganti kata sandi tidak boleh melewati halaman lain;
 *  3. role harus berwenang pada path tersebut — dicek lewat canAccessPath(),
 *     satu fungsi yang sama dipakai Layout dan sidebar.
 *
 * Saat tidak berwenang, pengguna dilempar ke beranda mode-nya sendiri, bukan ke
 * login: role Guru/Pegawai tidak pernah diarahkan ke dashboard desktop, dan
 * sebaliknya.
 */
function ProtectedRoute({ children }) {
  const { state } = useSimPres()
  const location = useLocation()

  if (!selectIsAuthenticated(state)) {
    // Simpan tujuan awal supaya setelah login guard membalas ke halaman itu,
    // selama role-nya memang berwenang.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Gate kata sandi: akun yang wajib menggantinya (atau yang memintanya lewat
  // sidebar) tidak bisa melewati halaman mana pun sebelum selesai. Ditempatkan
  // di sini — bukan sebagai rute baru — supaya Layout/Sidebar/Header tetap
  // jadi latar, persis seperti pola redirect yang sudah dipakai guard ini.
  if (selectMustChangePassword(state)) {
    return <ChangePasswordGate />
  }

  if (canAccessPath(state, selectCurrentUserRole(state), location.pathname)) {
    return children
  }

  // Sudah masuk tapi tidak berwenang: lempar ke beranda role, bukan ke login.
  // Bila tujuannya ternyata halaman yang sama (mis. role kehilangan semua
  // permission-nya), jangan mengarahkan ke diri sendiri — render terminal
  // akses-tolak agar tidak terjadi redirect berulang.
  const target = resolvePostLoginPath(state, selectCurrentUser(state), location.pathname)
  if (target === location.pathname) {
    return <AccessDeniedPage />
  }

  // Terminal /403 tidak boleh memantulkan orang yang memang tidak punya akses
  // (dan tidak boleh jadi rantai di antara dua path yang sama-sama ditolak):
  // di sana pun kita langsung merender halaman akses-tolak.
  if (target === ACCESS_DENIED_PATH) {
    return <AccessDeniedPage />
  }

  return <Navigate to={target} replace />
}

// Halaman yang hanya boleh dilihat saat belum masuk (mis. /login).
export function GuestOnlyRoute({ children }) {
  const { state } = useSimPres()
  const location = useLocation()

  if (selectIsAuthenticated(state)) {
    const from = location.state?.from?.pathname
    return <Navigate to={resolvePostLoginPath(state, selectCurrentUser(state), from)} replace />
  }

  return children
}

export default ProtectedRoute