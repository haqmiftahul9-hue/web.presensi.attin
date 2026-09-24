import { useState } from 'react'
import { useSimPres, selectTrendByRange } from '../store/simPresStore.jsx'

function WeeklyTrend() {
  const { state } = useSimPres()
  const [range, setRange] = useState(7)
  const trend = selectTrendByRange(state, range)
  const count = trend.length
  const maxVal = Math.max(...trend.map((d) => d.hadir + d.terlambat), 1)
  const isCompact = count <= 7
  const step = isCompact ? 68 : Math.max(16, 470 / count)
  const barWidth = isCompact ? 14 : Math.min(14, Math.max(3, step - 3))
  const labelInterval = count > 15 ? 7 : 1
  const minX = isCompact ? 466 : Math.min(58 + (count - 1) * step + barWidth + 8, 500)
  const rataRataKehadiran = trend.length > 0
    ? ((trend.reduce((sum, d) => sum + d.hadir / Math.max(d.hadir + d.terlambat, 1), 0) / trend.length) * 100).toFixed(1)
    : '0.0'
  const hadirStaff = state.staff.filter((s) => s.status === 'Aktif' && s.masuk)
  const sebelumTujuh = hadirStaff.filter((s) => (s.masuk || '') < '07:00').length
  const kepatuhan = hadirStaff.length > 0 ? ((sebelumTujuh / hadirStaff.length) * 100).toFixed(1) : '0.0'

  const btnClass = (active) =>
    active
      ? 'px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm'
      : 'px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors'

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{range === 30 ? 'Tren Kehadiran 30 Hari' : 'Tren Kehadiran Mingguan'}</h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata kehadiran {range === 30 ? '30 hari' : 'mingguan'}: <strong className="text-on-surface font-body-sm-medium text-body-sm-medium">{rataRataKehadiran}%</strong></span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir</span>
            <span className="w-2.5 h-2.5 rounded-full bg-outline-variant ml-2"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
          </div>
          <div className="inline-flex bg-surface-container-low p-1 rounded-lg">
            <button onClick={() => setRange(7)} className={btnClass(range === 7)}>7 Hari</button>
            <button onClick={() => setRange(30)} className={btnClass(range === 30)}>30 Hari</button>
          </div>
        </div>
      </div>

      <div className="w-full pt-4">
        <svg aria-label="Grafik Kehadiran" className="w-full h-48 overflow-visible font-label-sm text-label-sm" viewBox="0 0 540 210">
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="20" y2="20"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="65" y2="65"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="110" y2="110"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeWidth="1" x1="30" x2="520" y1="155" y2="155"></line>
          <text fill="#75777e" fontSize="10" x="5" y="24">100%</text>
          <text fill="#75777e" fontSize="10" x="10" y="69">75%</text>
          <text fill="#75777e" fontSize="10" x="10" y="114">50%</text>
          <text fill="#75777e" fontSize="10" x="16" y="159">0%</text>
          {trend.map((d, i) => {
            const hadirH = Math.max(1, (d.hadir / maxVal) * 135)
            const lateH = Math.max(0, (d.terlambat / maxVal) * 135)
            const x = 58 + i * step
            const yHadir = 159 - hadirH
            const yLate = 159 - hadirH - lateH
            const showLabel = i % labelInterval === 0 || i === count - 1
            return (
              <g key={d.day}>
                <rect fill="#0051d5" height={hadirH} rx="3" width={barWidth} x={x} y={yHadir}></rect>
                {lateH > 0 && <rect fill="#c5c6ce" height={lateH} rx="3" width={barWidth} x={x + barWidth + 2} y={yLate}></rect>}
                {showLabel && <text fill="#44474e" fontSize="11" textAnchor="middle" x={x + barWidth / 2} y="176">{d.day}</text>}
              </g>
            )
          })}
          <rect fill="#0051d5" height={25} opacity="0.3" rx="3" width="14" x={minX} y="130"></rect>
          <rect fill="#c5c6ce" height={5} opacity="0.3" rx="3" width="14" x={minX + 16} y="150"></rect>
          <text fill="#75777e" fontSize="11" textAnchor="middle" x={minX + 7} y="176">Min (Piket)</text>
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
