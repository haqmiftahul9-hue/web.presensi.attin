import { useSimPres } from '../store/simPresStore.jsx'

function WeeklyTrend() {
  const { state } = useSimPres()
  const trend = state.weeklyTrend || []
  const maxVal = Math.max(...trend.map((d) => d.hadir + d.terlambat), 1)
  // Label di-derive dari satu sumber data (store), bukan angka hardcoded.
  const rataRataKehadiran = trend.length > 0
    ? ((trend.reduce((sum, d) => sum + d.hadir / Math.max(d.hadir + d.terlambat, 1), 0) / trend.length) * 100).toFixed(1)
    : '0.0'
  const hadirStaff = state.staff.filter((s) => s.status === 'Aktif' && s.masuk)
  const sebelumTujuh = hadirStaff.filter((s) => s.masuk < '07:00').length
  const kepatuhan = hadirStaff.length > 0 ? ((sebelumTujuh / hadirStaff.length) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Tren Kehadiran Mingguan</h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata kehadiran mingguan: <strong className="text-on-surface font-body-sm-medium">{rataRataKehadiran}%</strong></span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir</span>
            <span className="w-2.5 h-2.5 rounded-full bg-outline-variant ml-2"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
          </div>
          <div className="inline-flex bg-surface-container-low p-1 rounded-lg">
            <button className="px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm">7 Hari</button>
            <button className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors">30 Hari</button>
          </div>
        </div>
      </div>

      <div className="w-full pt-4">
        <svg aria-label="Grafik Kehadiran Mingguan" className="w-full h-48 overflow-visible font-label-sm" viewBox="0 0 540 210">
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="20" y2="20"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="65" y2="65"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="110" y2="110"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeWidth="1" x1="30" x2="520" y1="155" y2="155"></line>
          <text fill="#75777e" fontSize="10" x="5" y="24">100%</text>
          <text fill="#75777e" fontSize="10" x="10" y="69">75%</text>
          <text fill="#75777e" fontSize="10" x="10" y="114">50%</text>
          <text fill="#75777e" fontSize="10" x="16" y="159">0%</text>
          {trend.map((d, i) => {
            const total = d.hadir + d.terlambat
            const hadirH = Math.max(1, (d.hadir / maxVal) * 135)
            const lateH = Math.max(0, (d.terlambat / maxVal) * 135)
            const x = 58 + i * 68
            const yHadir = 159 - hadirH
            const yLate = 159 - hadirH - lateH
            return (
              <g key={d.day}>
                <rect fill="#0051d5" height={hadirH} rx="3" width="14" x={x} y={yHadir}></rect>
                {lateH > 0 && <rect fill="#c5c6ce" height={lateH} rx="3" width="14" x={x + 16} y={yLate}></rect>}
                <text fill="#44474e" fontSize="11" textAnchor="middle" x={x + 7} y="176">{d.day}</text>
              </g>
            )
          })}
          <rect fill="#0051d5" height={25} opacity="0.3" rx="3" width="14" x="466" y="130"></rect>
          <rect fill="#c5c6ce" height="5" opacity="0.3" rx="3" width="14" x="482" y="150"></rect>
          <text fill="#75777e" fontSize="11" textAnchor="middle" x="476" y="176">Min (Piket)</text>
        </svg>
      </div>

      <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg mt-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Tingkat kepatuhan waktu masuk sebelum pukul 07.00:</span>
        <span className="font-body-sm-medium text-body-sm-medium text-secondary">{kepatuhan}% (Tinggi)</span>
      </div>
    </div>
  )
}

export default WeeklyTrend
