import { useSimPres } from '../store/simPresStore.jsx'

function ActionToolbar({ onImport }) {
  const { state } = useSimPres()
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm">
      <div className="p-space-md bg-surface-container-lowest flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-xs">
          <button
            onClick={onImport}
            className="h-10 px-space-md rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-body-md-medium text-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Import Pegawai</span>
          </button>
          <button
            className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-md-medium text-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
            <span>Download Template</span>
          </button>
          <button
            className="h-10 px-space-md rounded-lg bg-primary-container hover:bg-[#132c54] text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm ml-auto sm:ml-0"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tambah Pegawai Baru</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-space-xs">
          <div className="relative w-full sm:w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">domain</span>
            <select className="w-full h-10 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest appearance-none cursor-pointer">
              <option value="all">Semua Unit ({state.units.length} Unit)</option>
              {state.units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-10 pl-9 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
              placeholder="Cari Nama / Jabatan / NIY..."
              type="text"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActionToolbar