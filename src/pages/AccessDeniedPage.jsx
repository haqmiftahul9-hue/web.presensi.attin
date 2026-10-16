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
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-7 text-center shadow-xl border border-border">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">
          <span className="material-symbols-outlined text-[28px]">lock</span>
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Akses Tidak Tersedia</h1>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Akun <strong className="text-foreground font-semibold">{user?.name || 'ini'}</strong> ({role || 'tanpa role'}) belum memiliki hak akses ke halaman manapun pada mode aplikasi yang sedang aktif.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
          Hubungi Superadmin SimPres untuk memeriksa konfigurasi peran dan unit kerja Anda.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            <span>Kembali ke Halaman Masuk</span>
          </Link>
          <span className="text-[11px] text-muted-foreground">
            Masuk kembali untuk masuk sebagai akun lain.
          </span>
        </div>
      </div>
    </div>
  )
}

export default AccessDeniedPage