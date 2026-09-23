import { useSimPres } from '../store/simPresStore.jsx'

function UnitCards() {
  const { state } = useSimPres()
  // Icon & nama unit dari satu sumber data (store); subtitle tetap copy tampilan.
  const cards = state.units.slice(0, 4).map((u) => {
    const staffInUnit = state.staff.filter((s) => s.unitId === u.id).length
    return {
      icon: u.icon,
      label: u.nama,
      count: `${staffInUnit} Pendidik/Staf`,
      subtitle: u.id === 'tk' ? '100% Terverifikasi Presensi'
        : u.id === 'sd' ? 'Unit Terbesar (Paralel 4)'
        : u.id === 'smp' ? 'Guru Mapel & Wali Kelas'
        : 'Termasuk Biro Pusat',
    }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
      {cards.map((unit) => (
        <div key={unit.label} className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">{unit.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{unit.label}</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">{unit.count}</span>
            <span className="font-body-sm text-body-sm text-secondary truncate">{unit.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UnitCards
