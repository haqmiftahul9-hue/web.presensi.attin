import { useSimPres, selectCurrentUser, selectCurrentUserRole } from '../store/simPresStore.jsx'

function Header() {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)

  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
      <div className="flex items-center gap-space-md w-full max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
            placeholder="Cari pegawai, NIP, atau data presensi..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors relative">
          <span className="material-symbols-outlined text-[20px]">chat</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary"></span>
        </button>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error"></span>
        </button>
        <div className="h-6 w-px bg-surface-variant"></div>
        <div className="flex items-center gap-space-xs cursor-pointer p-1 rounded-lg hover:bg-surface-container transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="font-body-sm-medium text-body-sm-medium text-on-surface leading-tight">{currentRole}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-1">{currentUser?.unitId ? 'Unit ' + currentUser.unitId.toUpperCase() : 'Yayasan Pendidikan'}</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">arrow_drop_down</span>
        </div>
      </div>
    </header>
  )
}

export default Header