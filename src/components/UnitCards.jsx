import { useSimPres, selectVisibleUnits } from '../store/simPresStore.jsx'

function UnitCards() {
  const { state } = useSimPres()
  // Hanya unit dalam scope aktif yang tampil, dan jumlahnya menyesuaikan.
  const visibleUnits = selectVisibleUnits(state)
  const cards = visibleUnits.map((u) => {
    const staffInUnit = state.staff.filter((s) => s.unitId === u.id).length
    return {
      icon: u.icon,
      label: u.nama,
      count: staffInUnit,
      subtitle: u.id === 'tk' ? '100% Terverifikasi Presensi'
        : u.id === 'sd' ? 'Unit Terbesar (Paralel 4)'
        : u.id === 'smp' ? 'Guru Mapel & Wali Kelas'
        : 'Termasuk Biro Pusat',
    }
  })

  return (
    <div className={`grid grid-cols-1 gap-4 ${visibleUnits.length > 1 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1'}`}>
      {cards.map((unit) => (
        <div
          key={unit.label}
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50/80 border border-blue-100/60 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[22px]">{unit.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{unit.label}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">{unit.count}</span>
              <span className="text-xs text-slate-500 font-medium">Pegawai</span>
            </div>
            <span className="text-[11px] text-slate-400 truncate mt-1">{unit.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UnitCards
