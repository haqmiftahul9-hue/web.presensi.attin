import { Navigate, useLocation } from 'react-router-dom'
import {
  useSimPres,
  hasMenuPermission,
  resolvePostLoginPath,
  selectCurrentUser,
  selectIsAuthenticated,
  ROUTE_MENU_KEYS,
} from '../store/simPresStore.jsx'

function ProtectedRoute({ children }) {
  const { state } = useSimPres()
  const location = useLocation()

  if (!selectIsAuthenticated(state)) {
    // Simpan tujuan awal supaya setelah loginGuard membalas ke halaman itu,
    // selama role-nya memang berwenang.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const menuKey = ROUTE_MENU_KEYS[location.pathname]
  if (!menuKey || hasMenuPermission(state, menuKey)) {
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
