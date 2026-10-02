import { useSimPres, selectCurrentUser, selectActiveUnitLabel, selectIsAllUnits } from '../store/simPresStore.jsx'

/**
 * Header portal.
 *
 * - >= 1024px (lg): tinggi tetap 64px, pencarian penuh, konten mulai setelah
 *   sidebar.
 * - < 1024px      : tombol hamburger membuka drawer navigasi, pencarian menyempit,
 *   blok nama aplikasi disembunyikan agar baris tidak berdesakan.
 *
 * Tidak ada fixed width: headernya selalu mengikuti lebar viewport.
 */
function Header({ onBukaMenu } = {}) {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const settings = state.settings

  return (
    <header className="sp-portal-header fixed top-0 left-0 right-0 lg:left-[260px] z-40 flex items-center gap-2 bg-surface-container-lowest px-3 md:px-space-lg pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={onBukaMenu}
        aria-label="Buka menu navigasi"
        className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      <div className="relative w-full max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input
          aria-label="Cari pegawai, NIP, atau data presensi"
          className="w-full h-10 pl-10 pr-3 md:pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
          placeholder="Cari pegawai, NIP, atau data presensi..."
          type="search"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 md:gap-space-md shrink-0">
        <button
          type="button"
          aria-label="Pesan"
          className="relative hidden sm:flex w-11 h-11 rounded-lg items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chat</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />
        </button>
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative w-11 h-11 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error" />
        </button>
        <div className="h-6 w-px bg-surface-variant hidden sm:block" />
        <div className="flex items-center gap-space-xs p-1 rounded-lg">
          {/* Logo hanya dirender bila benar-benar ada URL-nya, supaya tidak
              pernah memunculkan teks alternatif gambar yang rusak. */}
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={settings.namaAplikasi || 'SimPres'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          )}
          <div className="hidden lg:flex flex-col text-left">
            <span className="font-body-sm-medium text-body-sm-medium text-on-surface leading-tight">
              {settings.namaAplikasi || 'SimPres'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-1">
              {selectIsAllUnits(state) ? (settings.namaYayasan || 'Yayasan Pendidikan') : selectActiveUnitLabel(state)}
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden sm:block">arrow_drop_down</span>
        </div>
      </div>

      {/* Nama akun tetap terbaca di layar kecil lewat title, tanpa memadati baris. */}
      <span className="sr-only">{currentUser?.name || ''}</span>
    </header>
  )
}

export default Header