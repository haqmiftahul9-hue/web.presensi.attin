import { Link } from 'react-router-dom'
import { useSimPres, selectUnitSummary, selectIsAllUnits } from '../store/simPresStore.jsx'

function UnitSummary() {
  const { state } = useSimPres()
  // Ringkasan per unit dari satu sumber data (store), mengikuti unit terpilih.
  const summary = selectUnitSummary(state)
  const isAllUnits = selectIsAllUnits(state)

  return (
    <div className="bg-card rounded-xl border border-border p-5 lg:p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground font-headline-sm">Ringkasan per Unit</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Persentase kehadiran per unit kerja</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border font-semibold text-xs">
            {summary.length} Unit {isAllUnits ? 'Terdaftar' : 'Terpilih'}
          </span>
        </div>

        <div className="flex flex-col gap-3.5 my-4">
          {summary.map((unit) => (
            <div key={unit.id} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex justify-between items-center text-foreground">
                <span className="text-xs font-semibold text-foreground">{unit.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {unit.present}/{unit.total} Hadir
                  </span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    unit.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {unit.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, unit.percentage))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-border flex justify-end">
        <Link
          to="/rekap-dan-laporan"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
        >
          Lihat Rekap Lengkap Unit
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}

export default UnitSummary
