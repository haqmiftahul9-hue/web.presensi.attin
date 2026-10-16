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
    <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-foreground font-headline-sm">Presensi Terbaru</h2>
          <span className="text-xs text-muted-foreground mt-0.5">Catatan presensi masuk hari ini secara real-time</span>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Live Feed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Pegawai</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Jam Masuk</th>
              <th className="py-3 px-4">Metode</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs text-foreground">
            {rows.map((s) => {
              const hasil = calculateAttendanceStatus(new Date(), s.masuk)
              const terlambat = hasil.terlambat
              return (
                <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {initialsOf(s.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate leading-snug">{s.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">NIY: {s.niy}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary border border-border text-secondary-foreground">
                      {selectUnitName(state, s.unitId)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">{s.masuk}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                      <span className="material-symbols-outlined text-[15px]">{s.method === 'QR Code' ? 'qr_code_2' : 'face'}</span>
                      <span>{s.method || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      terlambat
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
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

      <div className="p-3.5 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Menampilkan <strong className="font-semibold text-foreground">{rows.length}</strong> dari <strong className="font-semibold text-foreground">{totalHadir}</strong> presensi masuk hari ini
        </span>
      </div>
    </div>
  )
}

export default LiveAttendanceTable
