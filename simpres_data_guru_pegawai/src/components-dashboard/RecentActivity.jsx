const activities = [
  {
    id: 1,
    initials: 'EA',
    name: 'Erianto, S.Ag, M.Pd.I',
    nip: '197804152005011002',
    unit: 'SMP Islam RJ',
    unitColor: 'bg-secondary-fixed/50',
    unitTextColor: 'text-secondary',
    time: '06:45:12 WIB',
    geofence: 'Radius Geofence 15m',
    geofenceIcon: 'text-secondary',
    status: 'Tepat Waktu',
    statusBg: 'bg-surface-container-high',
    statusDot: 'bg-secondary',
  },
  {
    id: 2,
    initials: 'BA',
    name: 'Bustanul Abidin, S.Pd',
    nip: '198509122010011005',
    unit: 'SD Islam RJ',
    unitColor: 'bg-surface-container-highest',
    unitTextColor: 'text-on-surface',
    time: '06:52:04 WIB',
    geofence: 'Radius Geofence 18m',
    geofenceIcon: 'text-secondary',
    status: 'Tepat Waktu',
    statusBg: 'bg-surface-container-high',
    statusDot: 'bg-secondary',
  },
  {
    id: 3,
    initials: 'SM',
    name: 'Silvana Monica',
    nip: '199302142018022001',
    unit: 'Sekretariat',
    unitColor: 'bg-surface-container',
    unitTextColor: 'text-on-surface-variant',
    time: '07:08:45 WIB',
    geofence: 'Radius Geofence 22m (+8m)',
    geofenceIcon: 'text-outline',
    status: 'Terlambat',
    statusBg: 'bg-surface-variant',
    statusDot: 'bg-outline',
  },
  {
    id: 4,
    initials: 'RF',
    name: 'Risa Fadillah, S.Pd',
    nip: '199105282016042004',
    unit: 'SMP Islam RJ',
    unitColor: 'bg-secondary-fixed/50',
    unitTextColor: 'text-secondary',
    time: '07:12:10 WIB',
    geofence: 'Radius Geofence 30m (+12m)',
    geofenceIcon: 'text-outline',
    status: 'Terlambat',
    statusBg: 'bg-surface-variant',
    statusDot: 'bg-outline',
  },
  {
    id: 5,
    initials: 'WY',
    name: 'Wisna Yunita, S.Pd',
    nip: '198911032014022002',
    unit: 'SD Islam RJ',
    unitColor: 'bg-surface-container-highest',
    unitTextColor: 'text-on-surface',
    time: '06:58:33 WIB',
    geofence: 'Radius Geofence 12m',
    geofenceIcon: 'text-secondary',
    status: 'Tepat Waktu',
    statusBg: 'bg-surface-container-high',
    statusDot: 'bg-secondary',
  },
  {
    id: 6,
    initials: 'MN',
    name: 'Muhammad Nur Fuad',
    nip: '198207192008011003',
    unit: 'SMP Islam RJ',
    unitColor: 'bg-secondary-fixed/50',
    unitTextColor: 'text-secondary',
    time: '06:40:22 WIB',
    geofence: 'Radius Geofence 15m',
    geofenceIcon: 'text-secondary',
    status: 'Tepat Waktu',
    statusBg: 'bg-surface-container-high',
    statusDot: 'bg-secondary',
  },
]

function RecentActivity() {
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
            <select className="w-full h-9 pl-space-sm pr-space-lg bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface appearance-none focus:outline-none focus:bg-surface-container">
              <option value="">Semua Unit Sekolah</option>
              <option value="tk">TK / PAUD IT</option>
              <option value="sd">SD Islam RJ</option>
              <option value="smp">SMP Islam RJ</option>
              <option value="sma">SMA Islam RJ</option>
              <option value="sekretariat">Sekretariat Yayasan</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
          </div>
          <button className="h-9 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium flex items-center gap-1.5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download Rekap Log</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase">
            <tr>
              <th className="py-space-sm px-space-lg" scope="col">Pegawai</th>
              <th className="py-space-sm px-space-md" scope="col">Unit</th>
              <th className="py-space-sm px-space-md" scope="col">Waktu Masuk</th>
              <th className="py-space-sm px-space-md" scope="col">Lokasi / Geofence</th>
              <th className="py-space-sm px-space-md" scope="col">Status</th>
              <th className="py-space-sm px-space-lg text-right" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-body-md text-on-surface">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-surface-container-low/60 transition-colors">
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label-sm ${activity.unitColor} ${activity.unitTextColor}`}>
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
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm ${activity.statusBg} text-on-surface`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activity.statusDot}`}></span>
                    {activity.status}
                  </span>
                </td>
                <td className="py-space-sm px-space-lg text-right">
                  <button className="font-body-sm-medium text-body-sm-medium text-secondary hover:text-secondary-container transition-colors">Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <span>Menampilkan <strong className="font-body-sm-medium text-on-surface">1 - 6</strong> dari <strong className="font-body-sm-medium text-on-surface">187</strong> pegawai presensi hari ini</span>
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors" disabled="">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-body-sm-medium text-body-sm-medium flex items-center justify-center shadow-sm">1</button>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant font-body-sm text-body-sm flex items-center justify-center transition-colors">2</button>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant font-body-sm text-body-sm flex items-center justify-center transition-colors">3</button>
          <span className="text-outline px-1">...</span>
          <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant font-body-sm text-body-sm flex items-center justify-center transition-colors">32</button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecentActivity