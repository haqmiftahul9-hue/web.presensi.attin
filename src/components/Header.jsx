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
    <header className="sp-portal-header fixed top-0 left-0 right-0 lg:left-[260px] z-40 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 pt-safe shadow-xs">
      <div className="flex items-center gap-2.5 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onBukaMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">search</span>
          <input
            aria-label="Cari pegawai, NIP, atau data presensi"
            className="w-full h-9 pl-9 pr-12 bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100/60 rounded-lg text-xs md:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            placeholder="Cari pegawai, NIP, atau data presensi..."
            type="search"
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Pesan"
          className="relative hidden sm:flex w-9 h-9 rounded-lg border border-slate-200/70 items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
          title="Pesan internal"
        >
          <span className="material-symbols-outlined text-[19px]">chat</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <button
          type="button"
          aria-label="Notifikasi"
          className="relative w-9 h-9 rounded-lg border border-slate-200/70 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
          title="Notifikasi sistem"
        >
          <span className="material-symbols-outlined text-[19px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 px-2 py-1 rounded-lg border border-slate-200/60 bg-slate-50/60 hover:bg-slate-50 transition-colors">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={settings.namaAplikasi || 'SimPres'}
              className="w-7 h-7 rounded-md object-cover border border-slate-200/60 shadow-2xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[16px]">domain</span>
            </div>
          )}
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {settings.namaAplikasi || 'SimPres'}
            </span>
            <span className="text-[11px] font-medium text-slate-500 leading-tight">
              {selectIsAllUnits(state) ? (settings.namaYayasan || 'Yayasan Pendidikan') : selectActiveUnitLabel(state)}
            </span>
          </div>
        </div>
      </div>

      <span className="sr-only">{currentUser?.name || ''}</span>
    </header>
  )
}

export default Header