import { Navigate, useLocation } from 'react-router-dom'
import {
  useSimPres,
  canAccessPath,
  resolvePostLoginPath,
  selectCurrentUser,
  selectCurrentUserRole,
  selectIsAuthenticated,
  selectMustChangePassword,
} from '../store/simPresStore.jsx'
import ChangePasswordGate from './ChangePasswordGate.jsx'

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
  return <Navigate to={resolvePostLoginPath(state, selectCurrentUser(state), location.pathname)} replace />
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