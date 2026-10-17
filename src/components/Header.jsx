import { useSimPres, selectCurrentUser, selectActiveUnitLabel, selectIsAllUnits, selectSearchTerm } from '../store/simPresStore.jsx'

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
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const settings = state.settings
  const searchTerm = selectSearchTerm(state)

  return (
    <header className="sp-portal-header fixed top-0 left-0 right-0 lg:left-[260px] z-40 flex items-center justify-between gap-3 bg-card/95 backdrop-blur-md border-b border-border px-4 md:px-6 pt-safe shadow-xs">
      <div className="flex items-center gap-2.5 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onBukaMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">search</span>
          <input
            aria-label="Cari pegawai, NIY, atau data presensi"
            className="w-full h-9 pl-9 pr-12 bg-card border border-input hover:border-primary/60 focus:border-ring focus:ring-1 focus:ring-ring rounded-lg text-xs md:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-2xs"
            placeholder="Cari pegawai, NIY, atau data presensi..."
            type="search"
            value={searchTerm}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded shadow-2xs pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Pesan"
          className="relative hidden sm:flex w-9 h-9 rounded-lg border border-border bg-card items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all shadow-2xs"
          title="Pesan internal"
        >
          <span className="material-symbols-outlined text-[19px]">chat</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        <button
          type="button"
          aria-label="Notifikasi"
          className="relative w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all shadow-2xs"
          title="Notifikasi sistem"
        >
          <span className="material-symbols-outlined text-[19px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={settings.namaAplikasi || 'SIMPEG'}
              className="w-7 h-7 rounded-md object-cover border border-border shadow-2xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[16px]">domain</span>
            </div>
          )}
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight">
              {settings.namaAplikasi || 'SIMPEG'}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground leading-tight">
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