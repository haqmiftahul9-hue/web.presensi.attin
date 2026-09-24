import { useState, useMemo, Fragment } from 'react'
import { useSimPres, selectRecentActivity, selectIzinCutiSummary } from '../store/simPresStore.jsx'

function downloadCsv(filename, rows) {
  const headers = Object.keys(rows[0] || {})
  if (headers.length === 0) return
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function RecentActivity() {
  const { state, dispatch } = useSimPres()
  const [unitFilter, setUnitFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const pageSize = 6
  const izinCuti = selectIzinCutiSummary(state)

  const filtered = useMemo(
    () =>
      selectRecentActivity(state).filter(
        (s) => unitFilter === '' || s.unitId === unitFilter,
      ),
    [state, unitFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage])

  const activities = paged.map((s) => {
    const unit = state.units.find((u) => u.id === s.unitId)
    const unitName = unit ? unit.nama : '-'
    const unitColor = unit?.id === 'smp' ? 'bg-secondary-fixed/50' : unit?.id === 'sd' ? 'bg-surface-container-highest' : unit?.id === 'pst' ? 'bg-surface-container' : 'bg-secondary-fixed/50'
    const unitTextColor = unit?.id === 'pst' ? 'text-on-surface-variant' : 'text-secondary'
    const isTerlambat = s.late > 0
    return {
      id: s.id,
      initials: s.name.split(' ')[0][0],
      name: s.name,
      nip: s.niy,
      role: s.role,
      unit: unitName,
      unitId: s.unitId,
      unitColor,
      unitTextColor,
      time: s.masuk ? `${s.masuk} WIB` : '-',
      geofence: `Radius Geofence ${15 + (s.id % 20)}${s.outsideRadius ? ' (+8m)' : ''}`,
      geofenceIcon: s.outsideRadius ? 'text-outline' : 'text-secondary',
      status: isTerlambat ? 'Terlambat' : 'Tepat Waktu',
      statusBg: isTerlambat ? 'bg-surface-variant' : 'bg-surface-container-high',
      statusDot: isTerlambat ? 'bg-outline' : 'bg-secondary',
      method: s.method,
      late: s.late,
      pulang: s.masuk ? '15:00 WIB' : '-',
      isTerlambat,
    }
  })

  const handleDownload = () => {
    const rows = (state.logs || []).map((l) => ({
      Waktu: l.time,
      Aktor: l.actor,
      Role: l.role,
      Aksi: l.action,
      Target: l.target,
      Keterangan: l.desc,
    }))
    downloadCsv('rekap-log-simpres.csv', rows)
    dispatch({ type: 'ADD_LOG', payload: { id: Date.now(), time: new Date().toLocaleString('id-ID'), actor: 'Super Admin', role: 'Superadmin', action: 'Ekspor', target: 'Log Aktivitas', desc: 'Download rekap log CSV' } })
  }

  const handleDetail = (a) => {
    setExpandedId((prev) => {
      const opening = prev !== a.id
      if (opening) {
        dispatch({ type: 'ADD_LOG', payload: { id: Date.now() + Math.random(), time: new Date().toLocaleString('id-ID'), actor: 'Super Admin', role: 'Superadmin', action: 'Lihat', target: `Pegawai • ${a.name}`, desc: `Lihat detail presensi NIY ${a.nip}` } })
      }
      return opening ? a.id : null
    })
  }

  const pages = []
  {
    const maxVisible = 3
    let start = Math.max(1, currentPage - 1)
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
    let addedEllipsisBefore = false
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push('ellipsis')
      addedEllipsisBefore = true
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis')
      pages.push(totalPages)
    }
    if (!addedEllipsisBefore && !pages.includes(1)) pages.unshift(1)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Aktivitas Presensi Terbaru</h2>
          <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">Live Feed</span>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="relative min-w-[170px]">
            <select
              className="w-full h-9 pl-space-sm pr-space-lg bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface appearance-none focus:outline-none focus:bg-surface-container"
              value={unitFilter}
              onChange={(e) => { setUnitFilter(e.target.value); setPage(1) }}
            >
              <option value="">Semua Unit Sekolah</option>
              {state.units.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
          </div>
          <button
            onClick={handleDownload}
            className="h-9 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download Rekap Log</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md tracking-wider uppercase">
            <tr>
              <th className="py-space-sm px-space-lg" scope="col">Pegawai</th>
              <th className="py-space-sm px-space-md" scope="col">Unit</th>
              <th className="py-space-sm px-space-md" scope="col">Waktu Masuk</th>
              <th className="py-space-sm px-space-md" scope="col">Lokasi / Geofence</th>
              <th className="py-space-sm px-space-md" scope="col">Status</th>
              <th className="py-space-sm px-space-lg text-right" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-md text-body-md text-on-surface">
            {activities.map((activity) => (
              <Fragment key={activity.id}>
                <tr className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-space-sm px-space-lg">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-md text-label-md flex-shrink-0">
                        {activity.initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface leading-tight">{activity.name}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">NIP: {activity.nip}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-space-sm px-space-md">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-label-sm ${activity.unitColor} ${activity.unitTextColor}`}>
                      {activity.unit}
                    </span>
                  </td>
                  <td className="py-space-sm px-space-md font-body-sm text-body-sm text-on-surface">
                    {activity.time}
                  </td>
                  <td className="py-space-sm px-space-md">
                    <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                      <span className={`material-symbols-outlined text-[16px] ${activity.geofenceIcon}`}>pin_drop</span>
                      <span>{activity.geofence}</span>
                    </div>
                  </td>
                  <td className="py-space-sm px-space-md">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-label-sm ${activity.statusBg} text-on-surface`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${activity.statusDot}`}></span>
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-space-sm px-space-lg text-right">
                    <button
                      onClick={() => handleDetail(activity)}
                      className="font-body-sm-medium text-body-sm-medium text-secondary hover:text-secondary-container transition-colors"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
                {expandedId === activity.id && (
                  <tr className="bg-surface-container-low/30">
                    <td colSpan={6} className="px-space-lg py-space-sm">
                      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-x-space-lg gap-y-space-xs text-xs">
                        <div><span className="text-on-surface-variant">NIY:</span> <span className="text-on-surface"> {activity.nip}</span></div>
                        <div><span className="text-on-surface-variant">Peran:</span> <span className="text-on-surface"> {activity.role}</span></div>
                        <div><span className="text-on-surface-variant">Unit:</span> <span className="text-on-surface"> {activity.unit}</span></div>
                        <div><span className="text-on-surface-variant">Metode:</span> <span className="text-on-surface"> {activity.method || '-'}</span></div>
                        <div><span className="text-on-surface-variant">Masuk:</span> <span className="text-on-surface"> {activity.time}</span></div>
                        <div><span className="text-on-surface-variant">Pulang:</span> <span className="text-on-surface"> {activity.pulang}</span></div>
                        <div><span className="text-on-surface-variant">Keterlambatan:</span> <span className="text-on-surface"> {activity.isTerlambat ? `${activity.late} menit` : 'Tepat Waktu'}</span></div>
                        <div><span className="text-on-surface-variant">Status:</span> <span className="text-on-surface"> {activity.status}</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {activities.length === 0 && (
              <tr>
                <td colSpan={6} className="py-space-xl text-center text-on-surface-variant font-body-sm">
                  Tidak ada kegiatan presensi pada unit yang dipilih.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex flex-col gap-0.5 font-body-sm text-body-sm text-on-surface-variant">
          <span>Menampilkan <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + activities.length}</strong> dari <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length}</strong> pegawai presensi hari ini</span>
          <span>{izinCuti.menunggu} izin/cuti menunggu · {izinCuti.disetujui} disetujui · {izinCuti.ditolak} ditolak</span>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage === 1 ? 'text-outline' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`e-${idx}`} className="text-outline px-1">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-body-sm font-body-sm-medium flex items-center justify-center ${p === currentPage ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-container text-on-surface-variant'}`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage === totalPages ? 'text-outline' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecentActivity
