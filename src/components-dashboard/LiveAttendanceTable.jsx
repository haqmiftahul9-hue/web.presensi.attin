import { useSimPres, selectRecentActivity, selectUnitName } from '../store/simPresStore.jsx'
import { calculateAttendanceStatus } from '../data/jamKerja.js'
import { initialsOf } from '../data/seed.js'

/**
 * Tabel "Presensi Terbaru" yang membangun barisnya dari data store sungguhan
 * (bukan array statis), mengikuti unit terpilih. Status Tepat Waktu / Terlambat
 * dihitung ulang lewat calculateAttendanceStatus — satu sumber kebenaran yang
 * sama dengan halaman mobile & laporan.
 */

const unitColorCycle = [
  'bg-secondary-fixed/50 text-secondary',
  'bg-surface-container-highest text-on-surface',
  'bg-surface-container text-on-surface-variant',
]

function LiveAttendanceTable() {
  const { state } = useSimPres()
  const rows = selectRecentActivity(state).slice(0, 6)
  const totalHadir = selectRecentActivity(state).length

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-slate-900 font-headline-sm">Presensi Terbaru</h2>
          <span className="text-xs text-slate-500 mt-0.5">Catatan presensi masuk hari ini secara real-time</span>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Live Feed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Pegawai</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Jam Masuk</th>
              <th className="py-3 px-4">Metode</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {rows.map((s) => {
              const hasil = calculateAttendanceStatus(new Date(), s.masuk)
              const terlambat = hasil.terlambat
              return (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {initialsOf(s.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 truncate leading-snug">{s.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">NIY: {s.niy}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 border border-slate-200/60 text-slate-700">
                      {selectUnitName(state, s.unitId)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">{s.masuk}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[15px]">{s.method === 'QR Code' ? 'qr_code_2' : 'face'}</span>
                      <span>{s.method || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      terlambat
                        ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${terlambat ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      {terlambat ? `Terlambat ${hasil.lateMinutes}m` : 'Tepat Waktu'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Menampilkan <strong className="font-semibold text-slate-800">{rows.length}</strong> dari <strong className="font-semibold text-slate-800">{totalHadir}</strong> presensi masuk hari ini
        </span>
      </div>
    </div>
  )
}

export default LiveAttendanceTable
