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
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-xl border border-slate-200/80">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 mb-4">
          <span className="material-symbols-outlined text-[28px]">lock</span>
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Akses Tidak Tersedia</h1>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Akun <strong className="text-slate-800 font-semibold">{user?.name || 'ini'}</strong> ({role || 'tanpa role'}) belum memiliki hak akses ke halaman manapun pada mode aplikasi yang sedang aktif.
        </p>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          Hubungi Superadmin SimPres untuk memeriksa konfigurasi peran dan unit kerja Anda.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            <span>Kembali ke Halaman Masuk</span>
          </Link>
          <span className="text-[11px] text-slate-400">
            Masuk kembali untuk masuk sebagai akun lain.
          </span>
        </div>
      </div>
    </div>
  )
}

export default AccessDeniedPage