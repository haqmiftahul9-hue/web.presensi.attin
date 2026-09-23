import { useSimPres, selectUnitSummary } from '../store/simPresStore.jsx'

function UnitSummary() {
  const { state } = useSimPres()
  // Ringkasan per unit dari satu sumber data (store).
  const summary = selectUnitSummary(state)

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Ringkasan per Unit</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">{state.units.length} Unit Terdaftar</span>
      </div>
      <div className="flex flex-col gap-space-sm my-space-xs">
        {summary.map((unit) => (
          <div key={unit.id} className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-on-surface">
              <span className="font-body-sm-medium text-body-sm-medium">{unit.name}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {unit.present} / {unit.total} Pegawai <strong className="text-on-surface ml-1 font-body-sm-medium text-body-sm-medium">({unit.percentage}%)</strong>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${unit.percentage}%` }}></div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-space-xs flex justify-end">
        <a className="inline-flex items-center gap-1 font-body-sm-medium text-body-sm-medium text-secondary hover:text-secondary-container transition-colors" href="#">
          Lihat Rekap Lengkap Unit
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </a>
      </div>
    </div>
  )
}

export default UnitSummary
