import { Link } from 'react-router-dom'
import { useSimPres, selectCurrentUser, selectCurrentUserRole } from '../store/simPresStore.jsx'

/**
 * Halaman "akses tidak tersedia".
 *
 * Fungsinya sebagai jaring pengaman redirect: kalau permission role berubah
 * sampai role tidak lagi boleh membuka beranda pun, halaman ini yang menangkap.
 * Tanpa tujuan terminal yang selalu boleh dibuka, guard akan mengarahkan ke
 * path yang juga ditolak — dan itu berarti loop.
 */
function AccessDeniedPage() {
  const { state } = useSimPres()
  const user = selectCurrentUser(state)
  const role = selectCurrentUserRole(state)

  return (
    <div className="min-h-[100dvh] bg-background font-body antialiased">
      <div className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
        <div className="w-full max-w-[430px] rounded-2xl bg-surface-container-lowest p-6 text-center shadow-md ring-1 ring-outline-variant/30 animate-sp-rise">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <span className="material-symbols-outlined text-[26px] text-amber-600">lock</span>
          </span>
          <h1 className="mt-3 font-headline-sm text-headline-sm text-on-surface">Akses tidak tersedia</h1>
          <p className="mt-1.5 text-body-sm text-body-sm text-on-surface-variant">
            Akun {user?.name || 'ini'} ({role || 'tanpa role'}) belum memiliki hak akses ke halaman manapun
            pada mode aplikasi yang sedang aktif.
          </p>
          <p className="mt-2 text-body-sm text-body-sm text-on-surface-variant">
            Hubungi Superadmin SimPres untuk memeriksa konfigurasi peran dan unit kerja Anda.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3 text-label-md text-label-md text-on-primary transition-transform active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Kembali ke halaman masuk
            </Link>
            <span className="text-label-sm text-label-sm text-on-surface-variant">
              Masuk kembali untuk masuk sebagai akun lain.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessDeniedPage