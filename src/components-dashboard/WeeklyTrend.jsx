import { useState } from 'react'
import { useSimPres, selectTrendByRange, selectActiveStaff } from '../store/simPresStore.jsx'
import { calculateAttendanceStatus, jamKerjaRules } from '../data/jamKerja.js'

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
  // Kepatuhan dihitung dari pegawai pada unit terpilih saja, memakai batas jam
  // masuk hari ini (07:10, atau 07:30 untuk Sabtu).
  const rulesHariIni = jamKerjaRules(new Date())
  const hadirStaff = selectActiveStaff(state).filter((s) => s.status === 'Aktif' && s.masuk)
  const tepatWaktu = hadirStaff.filter((s) => calculateAttendanceStatus(new Date(), s.masuk).lateMinutes === 0).length
  const kepatuhan = hadirStaff.length > 0 ? ((tepatWaktu / hadirStaff.length) * 100).toFixed(1) : '0.0'

  const btnClass = (active) =>
    active
      ? 'px-3 py-1 rounded-md bg-card text-foreground font-semibold text-xs shadow-2xs border border-border'
      : 'px-3 py-1 rounded-md text-muted-foreground hover:text-foreground font-medium text-xs transition-colors'

  return (
    <div className="bg-card rounded-xl border border-border p-5 lg:p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground font-headline-sm">
              {range === 30 ? 'Tren Kehadiran 30 Hari' : 'Tren Kehadiran Mingguan'}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {rataRataKehadiran}% Rata-rata
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">
            Grafik komparasi rasio kehadiran tepat waktu dan keterlambatan pegawai
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              Hadir
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40"></span>
              Terlambat
            </span>
          </div>

          <div className="inline-flex bg-muted p-1 rounded-lg border border-border">
            <button onClick={() => setRange(7)} className={btnClass(range === 7)}>7 Hari</button>
            <button onClick={() => setRange(30)} className={btnClass(range === 30)}>30 Hari</button>
          </div>
        </div>
      </div>

      <div className="w-full pt-4 pb-2">
        <svg aria-label="Grafik Kehadiran" className="w-full h-48 overflow-visible" viewBox="0 0 540 210">
          <line className="text-border" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="30" x2="520" y1="20" y2="20"></line>
          <line className="text-border" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="30" x2="520" y1="65" y2="65"></line>
          <line className="text-border" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="30" x2="520" y1="110" y2="110"></line>
          <line className="text-border" stroke="currentColor" strokeWidth="1" x1="30" x2="520" y1="155" y2="155"></line>
          <text className="text-muted-foreground" fill="currentColor" fontSize="10" fontWeight="500" x="5" y="24">100%</text>
          <text className="text-muted-foreground" fill="currentColor" fontSize="10" fontWeight="500" x="10" y="69">75%</text>
          <text className="text-muted-foreground" fill="currentColor" fontSize="10" fontWeight="500" x="10" y="114">50%</text>
          <text className="text-muted-foreground" fill="currentColor" fontSize="10" fontWeight="500" x="16" y="159">0%</text>
          {trend.map((d, i) => {
            const hadirH = Math.max(1, (d.hadir / maxVal) * 135)
            const lateH = Math.max(0, (d.terlambat / maxVal) * 135)
            const x = 58 + i * step
            const yHadir = 159 - hadirH
            const yLate = 159 - hadirH - lateH
            const showLabel = i % labelInterval === 0 || i === count - 1
            return (
              <g key={d.day}>
                <rect className="text-primary" fill="currentColor" height={hadirH} rx="3" width={barWidth} x={x} y={yHadir}></rect>
                {lateH > 0 && <rect className="text-muted-foreground/30" fill="currentColor" height={lateH} rx="3" width={barWidth} x={x + barWidth + 2} y={yLate}></rect>}
                {showLabel && <text className="text-muted-foreground" fill="currentColor" fontSize="11" fontWeight="500" textAnchor="middle" x={x + barWidth / 2} y="176">{d.day}</text>}
              </g>
            )
          })}
          <rect className="text-primary opacity-25" fill="currentColor" height={25} rx="3" width="14" x={minX} y="130"></rect>
          <rect className="text-muted-foreground opacity-25" fill="currentColor" height={5} rx="3" width="14" x={minX + 16} y="150"></rect>
          <text className="text-muted-foreground" fill="currentColor" fontSize="10" fontWeight="500" textAnchor="middle" x={minX + 7} y="176">Min (Piket)</text>
        </svg>
      </div>

      <div className="flex items-center justify-between bg-muted/50 border border-border px-4 py-2.5 rounded-xl mt-2">
        <span className="text-xs text-foreground flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
          Kepatuhan masuk batas {rulesHariIni.jamMasuk} ({rulesHariIni.hari}):
        </span>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          {kepatuhan}% (Tinggi)
        </span>
      </div>
    </div>
  )
}

export default WeeklyTrend
