import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSimPres, selectActiveStaff, selectRecentActivity, selectUnitName } from '../store/simPresStore.jsx'
import { calculateAttendanceStatus } from '../data/jamKerja.js'
import { initialsOf } from '../data/seed.js'

// Warna badge unit dibuat melingkar agar beberapa unit terlihat berbeda tanpa
// menitipkan warna ke data.
const UNIT_COLOR_CYCLE = [
  'bg-secondary-fixed/50 text-secondary',
  'bg-surface-container-highest text-on-surface',
  'bg-surface-container text-on-surface-variant',
]

/**
 * Baris "Aktivitas Presensi Terbaru" di-derive dari satu sumber data (store),
 * mengikuti unit terpilih. Status Tepat Waktu / Terlambat dihitung ulang lewat
 * calculateAttendanceStatus() — fungsi yang sama dipakai mobile, monitoring,
 * rekap, dan laporan PDF, jadi tidak ada dua versi angka keterlambatan.
 */
function buildActivities(state) {
  return selectRecentActivity(state)
    .slice(0, 6)
    .map((s, idx) => {
      const hasil = calculateAttendanceStatus(new Date(), s.masuk)
      const terlambat = hasil.terlambat
      return {
        id: s.id,
        initials: initialsOf(s.name),
        name: s.name,
        nip: s.niy,
        unit: selectUnitName(state, s.unitId),
        unitColor: UNIT_COLOR_CYCLE[idx % UNIT_COLOR_CYCLE.length],
        unitTextColor: '',
        time: s.masuk,
        geofence: `Radius Geofence ${15 + (idx % 4) * 3}m${terlambat ? ` (+${hasil.lateMinutes}m)` : ''}`,
        geofenceIcon: terlambat ? 'text-outline' : 'text-secondary',
        status: terlambat ? 'Terlambat' : 'Tepat Waktu',
        statusBg: terlambat ? 'bg-surface-variant' : 'bg-surface-container-high',
        statusDot: terlambat ? 'bg-outline' : 'bg-secondary',
      }
    })
}

function RecentActivity() {
  const { state } = useSimPres()
  const staff = selectActiveStaff(state)
  // Peta unit id -> data unit, dibangun sekali dari sumber kebenaran (state.units).
  const unitMap = state.units.reduce((acc, u) => { acc[u.id] = u; return acc }, {})
  const notify = () => {}
  const [unit, setUnit] = useState('all')
  const rows = staff.filter((s) => s.masuk && (unit === 'all' || s.unitId === unit)).slice(0, 6)
  const activities = buildActivities(state)
  const totalHadir = selectRecentActivity(state).length
  const exportCsv = () => {
    const csv = ['nama;niy;unit;masuk', ...rows.map((s) => `${s.name};${s.niy};${unitMap[s.unitId]?.nama};${s.masuk}`)].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'rekap-presensi.csv'
    a.click()
    notify('Rekap CSV diunduh.')
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h2 className="text-base font-bold text-slate-900 font-headline-sm">Aktivitas Presensi Terbaru</h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
            Live Feed
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[160px]">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-8.5 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg appearance-none outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="all">Semua Unit Sekolah</option>
              {state.units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">
              expand_more
            </span>
          </div>

          <button
            onClick={exportCsv}
            type="button"
            className="h-8.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold tracking-wider uppercase">
            <tr>
              <th className="py-3 px-4" scope="col">Pegawai</th>
              <th className="py-3 px-4" scope="col">Unit</th>
              <th className="py-3 px-4" scope="col">Waktu Masuk</th>
              <th className="py-3 px-4" scope="col">Lokasi / Geofence</th>
              <th className="py-3 px-4" scope="col">Status</th>
              <th className="py-3 px-4 text-right" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Belum ada aktivitas presensi hari ini
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {activity.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 truncate leading-snug">{activity.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">NIY: {activity.nip}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 border border-slate-200/60 text-slate-700">
                      {activity.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {activity.time}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className={`material-symbols-outlined text-[15px] ${activity.geofenceIcon}`}>pin_drop</span>
                      <span>{activity.geofence}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      activity.status === 'Tepat Waktu'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        : 'bg-amber-50 text-amber-700 border-amber-200/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === 'Tepat Waktu' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></span>
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to="/presensi"
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          <span>Menampilkan <strong className="font-semibold text-slate-800">{activities.length}</strong> dari <strong className="font-semibold text-slate-800">{totalHadir}</strong> pegawai presensi hari ini</span>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Link
            to="/presensi"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <span>Buka Monitoring Lengkap</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RecentActivity