import { Link } from 'react-router-dom'
import { useSimPres, selectUnitSummary, selectIsAllUnits } from '../store/simPresStore.jsx'

function UnitSummary() {
  const { state } = useSimPres()
  // Ringkasan per unit dari satu sumber data (store), mengikuti unit terpilih.
  const summary = selectUnitSummary(state)
  const isAllUnits = selectIsAllUnits(state)

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 lg:p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-headline-sm">Ringkasan per Unit</h2>
            <p className="text-xs text-slate-500 mt-0.5">Persentase kehadiran per unit kerja</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-slate-600 font-semibold text-xs">
            {summary.length} Unit {isAllUnits ? 'Terdaftar' : 'Terpilih'}
          </span>
        </div>

        <div className="flex flex-col gap-3.5 my-4">
          {summary.map((unit) => (
            <div key={unit.id} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-50/80 transition-colors">
              <div className="flex justify-between items-center text-slate-800">
                <span className="text-xs font-semibold text-slate-900">{unit.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    {unit.present}/{unit.total} Hadir
                  </span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                    unit.percentage >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {unit.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, unit.percentage))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <Link
          to="/rekap-dan-laporan"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Lihat Rekap Lengkap Unit
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}

export default UnitSummary
