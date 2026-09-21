import { useState, useEffect } from 'react'

const unitOptions = [
  'Semua Unit (Pusat)',
  'TK IT RJ',
  'SD Islam RJ',
  'SMP Islam RJ',
  'SMA Islam RJ',
  'Sekretaris Yayasan',
]

const filterTabs = [
  { id: 'semua', label: 'Semua', count: 187, color: 'bg-primary-container text-white' },
  { id: 'tepat', label: 'Tepat Waktu', count: 173, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'terlambat', label: 'Terlambat', count: 14, color: 'bg-amber-100 text-amber-800' },
  { id: 'face', label: 'Face Recognition', count: 128, color: 'bg-blue-100 text-blue-800' },
  { id: 'qr', label: 'QR / Mobile', count: 59, color: 'bg-purple-100 text-purple-800' },
]

const summaryCards = [
  {
    id: 'hadir',
    label: 'Sudah Presensi',
    value: '187',
    total: '/ 209 Pegawai',
    percentage: '89.5%',
    subtitle: 'Kehadiran tercatat',
    subtitleHighlight: '+4 vs kemarin',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: 'check_circle',
    accent: 'bg-emerald-500',
  },
  {
    id: 'belum',
    label: 'Belum Presensi',
    value: '22',
    total: 'Pegawai tertinggal',
    percentage: '10.5%',
    subtitle: 'belum check-in / tapping',
    subtitleHighlight: 'Batas 07:30',
    iconBg: 'bg-surface-container',
    iconColor: 'text-on-surface-variant',
    icon: 'person_off',
    accent: 'bg-surface-container',
  },
  {
    id: 'terlambat',
    label: 'Terlambat Hari Ini',
    value: '14',
    total: 'Tercatat dispensasi / denda',
    percentage: '6.7% Rate',
    subtitle: 'Melebihi batas jam masuk unit',
    subtitleHighlight: '+2 vs kemarin',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: 'warning',
    accent: 'bg-amber-500',
  },
]

const activityData = [
  {
    id: 1,
    initials: 'WY',
    name: 'Wisna Yunita, S.Pd',
    niy: '049001054',
    unit: 'SD Islam RJ',
    unitColor: 'bg-blue-100 text-secondary',
    status: 'Baru Masuk',
    statusColor: 'bg-emerald-100 text-emerald-800',
    method: { icon: 'face', label: 'Face Recognition (Kiosk)' },
    location: { icon: 'verified_user', label: 'Radius 32m (Valid)', color: 'text-emerald-700' },
    time: '07:41:52 WIB',
    timeAgo: '12 detik lalu',
    highlight: true,
  },
  {
    id: 2,
    initials: 'BA',
    name: 'Bustanul Abidin, S.Pd',
    niy: '049097021',
    unit: 'SD Islam RJ',
    unitColor: 'bg-blue-100 text-secondary',
    status: 'Tepat Waktu',
    statusColor: 'bg-emerald-100 text-emerald-800',
    method: { icon: 'qr_code_scanner', label: 'QR Code Presensi' },
    location: { icon: 'near_me', label: 'Dalam Geofence (45m)', color: 'text-on-surface-variant' },
    time: '07:38:10 WIB',
    timeAgo: '4 menit lalu',
    highlight: false,
  },
  {
    id: 3,
    initials: 'EP',
    name: 'Erianto, S.Ag, M.Pd.I',
    niy: '049005069',
    unit: 'SMP Islam RJ',
    unitColor: 'bg-slate-100 text-slate-800',
    status: 'Terlambat (13 mnt)',
    statusColor: 'bg-amber-100 text-amber-800',
    method: { icon: 'face', label: 'Face Recognition' },
    location: { icon: 'near_me', label: 'Dalam Geofence (28m)', color: 'text-on-surface-variant' },
    time: '07:28:44 WIB',
    timeAgo: '13 menit lalu',
    highlight: false,
    rowBg: 'bg-amber-50/30',
  },
  {
    id: 4,
    initials: 'RF',
    name: 'Risa Fadillah, S.Pd',
    niy: '029012056',
    unit: 'TK IT RJ',
    unitColor: 'bg-indigo-100 text-indigo-800',
    status: 'Terlambat (7 mnt)',
    statusColor: 'bg-amber-100 text-amber-800',
    method: { icon: 'smartphone', label: 'Mobile App GPS' },
    location: { icon: 'near_me', label: 'Dalam Geofence (18m)', color: 'text-on-surface-variant' },
    time: '07:22:15 WIB',
    timeAgo: '20 menit lalu',
    highlight: false,
    rowBg: 'bg-amber-50/30',
  },
  {
    id: 5,
    initials: 'RG',
    name: 'Reki Gusman, S.E.',
    niy: '029010036',
    unit: 'SMP Islam RJ',
    unitColor: 'bg-slate-100 text-slate-800',
    status: 'Tepat Waktu',
    statusColor: 'bg-emerald-100 text-emerald-800',
    method: { icon: 'face', label: 'Face Recognition' },
    location: { icon: 'near_me', label: 'Dalam Geofence (50m)', color: 'text-on-surface-variant' },
    time: '07:05:30 WIB',
    timeAgo: '36 menit lalu',
    highlight: false,
  },
  {
    id: 6,
    initials: 'SM',
    name: 'Silvana Monica',
    niy: '049023183',
    unit: 'Pusat Yayasan',
    unitColor: 'bg-purple-100 text-purple-800',
    status: 'Tepat Waktu',
    statusColor: 'bg-emerald-100 text-emerald-800',
    method: { icon: 'qr_code_2', label: 'QR Kiosk' },
    location: { icon: 'near_me', label: 'Dalam Geofence (15m)', color: 'text-on-surface-variant' },
    time: '06:58:02 WIB',
    timeAgo: '44 menit lalu',
    highlight: false,
  },
  {
    id: 7,
    initials: 'ZA',
    name: 'Zahara Ardina, S.Pd',
    niy: '049023187',
    unit: 'TK IT RJ',
    unitColor: 'bg-indigo-100 text-indigo-800',
    status: 'Tepat Waktu',
    statusColor: 'bg-emerald-100 text-emerald-800',
    method: { icon: 'smartphone', label: 'Mobile App GPS' },
    location: { icon: 'near_me', label: 'Dalam Geofence (24m)', color: 'text-on-surface-variant' },
    time: '06:52:19 WIB',
    timeAgo: '50 menit lalu',
    highlight: false,
  },
]

const unitSummary = [
  {
    name: 'TK IT RJ',
    present: 21,
    total: 22,
    percentage: 95.5,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    note: '1 Belum Masuk',
    noteColor: 'text-on-surface-variant',
    badge: null,
  },
  {
    name: 'SD Islam RJ',
    present: 59,
    total: 65,
    percentage: 90.8,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    note: '6 Belum • 4 Terlambat',
    noteColor: 'text-on-surface-variant',
    badge: null,
  },
  {
    name: 'SMP Islam RJ',
    present: 44,
    total: 48,
    percentage: 91.7,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    note: '4 Belum • 3 Terlambat',
    noteColor: 'text-on-surface-variant',
    badge: null,
  },
  {
    name: 'SMA Islam RJ',
    present: 45,
    total: 54,
    percentage: 83.3,
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    note: '9 Belum • 5 Terlambat',
    noteColor: 'text-amber-800',
    badge: { text: 'Perhatian Operasional', bg: 'bg-amber-100', color: 'text-amber-800' },
  },
  {
    name: 'Sekretariat Yayasan',
    present: 18,
    total: 20,
    percentage: 90.0,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    note: '2 Belum • 2 Terlambat',
    noteColor: 'text-on-surface-variant',
    badge: null,
  },
]

function MonitoringPresensiPage() {
  const [activeFilter, setActiveFilter] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit (Pusat)')
  const [autoRefresh, setAutoRefresh] = useState('15s')
  const [liveTime, setLiveTime] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
        'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ]
      const dayName = days[now.getDay()]
      const day = now.getDate()
      const monthName = months[now.getMonth()]
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const secs = String(now.getSeconds()).padStart(2, '0')
      setLiveTime(`${dayName}, ${day} ${monthName} ${year} • ${hours}:${mins}:${secs} WIB`)
    }

    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">

        {/* Top Navigation & Live Header */}
        <div className="flex flex-col gap-space-sm">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-outline">
            <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="hover:text-on-surface cursor-pointer transition-colors">Presensi</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface font-body-sm-medium text-body-sm-medium">Monitoring Real-time</span>
          </div>

          {/* Title + Live Badge + Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Presensi — Monitoring</h1>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-label-sm text-label-sm text-emerald-800 uppercase tracking-wide">Live Feed Presensi</span>
              </div>
            </div>

            {/* Controls & Ticker */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Live Clock */}
              <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">schedule</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{liveTime || 'Selasa, 15 September 2026 • 07:42:18 WIB'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Unit Dropdown */}
              <div className="relative">
                <select
                  className="appearance-none bg-surface-container-lowest text-on-surface font-body-sm-medium text-body-sm-medium pl-3 pr-8 py-2 rounded-lg shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors focus:outline-none focus:bg-surface-container-lowest"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  {unitOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline">expand_more</span>
              </div>

              {/* Auto Refresh */}
              <button
                className="flex items-center gap-2 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-sm-medium text-body-sm-medium px-3 py-2 rounded-lg shadow-sm transition-all group"
                type="button"
              >
                <span className={`material-symbols-outlined text-[18px] text-secondary transition-transform ${autoRefresh ? 'rotate-0' : 'rotate-180'}`}>sync</span>
                <span className="whitespace-nowrap">Auto-refresh: <strong className="font-semibold text-secondary">15s</strong></span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {summaryCards.map((card) => (
            <div key={card.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300 ${card.iconBg}`}></div>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{card.label}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`font-display-lg text-display-lg tracking-tight font-bold ${card.iconColor}`}>{card.value}</span>
                    <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">{card.total}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}>
                  <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between relative z-10 bg-surface-container-low/40 px-3 py-1.5 rounded-lg">
                <span className={`font-body-sm-medium text-body-sm-medium ${card.textcolor || 'text-on-surface'}`}>{card.percentage} {card.subtitle}</span>
                <span className={`font-label-sm text-label-sm bg-surface-container-high px-2 py-0.5 rounded font-medium ${card.noteColor}`}>{card.subtitleHighlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT: Aktivitas Presensi Terbaru */}
          <div className="lg:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            {/* Card Header & Search */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Aktivitas Presensi Terbaru</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Log real-time mesin kiosk, face scan, dan mobile app</p>
                </div>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="w-44 sm:w-56 h-9 pl-8 pr-3 text-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
                  placeholder="Cari nama / NIY..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-2.5 bg-surface-container-low/60 flex items-center gap-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-full font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer ${
                    activeFilter === tab.id
                      ? tab.color
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.25 rounded-full text-[10px] font-bold ${
                    activeFilter === tab.id && tab.id !== 'semua' ? 'bg-white/20' : 'bg-surface-container-high'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Feed List */}
            <div className="flex flex-col divide-y divide-surface-container">
              {activityData.map((item) => (
                <div key={item.id} className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative ${item.highlight ? 'bg-blue-50/50 hover:bg-blue-50/80' : `hover:bg-surface-container-low/50 ${item.rowBg || ''}`}`}>
                  {item.highlight && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-r"></div>}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-secondary text-white font-headline-sm text-headline-sm flex items-center justify-center shadow-xs">
                        {item.initials}
                      </div>
                      {item.highlight && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-[10px] text-white">
                          <span className="material-symbols-outlined text-[10px]">check</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface truncate">{item.name}</span>
                        <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold ${item.unitColor}`}>{item.unit}</span>
                        <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium ${item.statusColor}`}>{item.status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span>NIY: <strong className="font-medium text-on-surface">{item.niy}</strong></span>
                        <span>•</span>
                        <span className={`inline-flex items-center gap-1 ${item.highlight ? 'text-on-surface' : 'text-on-surface'}`}>
                          <span className="material-symbols-outlined text-[16px] text-secondary">{item.method.icon}</span>
                          {item.method.label}
                        </span>
                        <span>•</span>
                        <span className={`inline-flex items-center gap-1 ${item.location.color}`}>
                          <span className="material-symbols-outlined text-[15px]">{item.location.icon}</span>
                          {item.location.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 gap-1 pl-14 md:pl-0">
                    <span className="font-headline-sm text-headline-sm font-semibold text-emerald-700">{item.time}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{item.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Feed Footer */}
            <div className="p-4 bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-body-sm text-body-sm text-on-surface-variant text-center sm:text-left">
                Menampilkan <strong className="font-semibold text-on-surface">7</strong> dari <strong className="font-semibold text-on-surface">187</strong> aktivitas presensi hari ini
              </span>
              <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded-lg text-secondary font-body-sm-medium text-body-sm-medium shadow-xs transition-colors cursor-pointer" type="button">
                <span>Buka Rekap Log Lengkap</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Unit Summary & Info */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            {/* Sebaran per Unit */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Sebaran per Unit</h2>
                  <span className="font-label-sm text-label-sm text-secondary bg-blue-50 px-2 py-0.5 rounded-full font-semibold">5 Satuan</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Tingkat kehadiran real-time per sekolah naungan</p>
              </div>

              {/* Geofence Compliance */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">location_searching</span>
                  <span className="font-body-sm-medium text-body-sm-medium">Kepatuhan Geofence</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold text-emerald-700">99.1% <span className="font-label-sm text-label-sm font-medium">Valid</span></span>
              </div>

              {/* Unit List */}
              <div className="flex flex-col gap-4">
                {unitSummary.map((unit) => (
                  <div key={unit.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${unit.bgColor}`}></span>
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{unit.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{unit.present}/{unit.total}</span>
                        <span className={`font-body-sm text-body-sm font-semibold ${unit.textColor}`}>({unit.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${unit.bgColor}`}
                        style={{ width: `${unit.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                      <span className={unit.noteColor}>{unit.badge ? unit.badge.text : 'Sisa ' + (unit.total - unit.present) + ' Pegawai'}</span>
                      {unit.badge ? (
                        <span className={`${unit.badge.bg} ${unit.badge.color} px-1.5 py-0.2 rounded font-medium`}>{unit.note}</span>
                      ) : (
                        <span className="bg-surface-container-high px-1.5 py-0.2 rounded font-medium text-outline">{unit.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tolerance Info */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">info</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Toleransi Batas Jam Presensi</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  <strong className="text-on-surface">TK &amp; SD:</strong> 07:15 WIB<br />
                  <strong className="text-on-surface">SMP &amp; SMA:</strong> 07:00 WIB<br />
                  <strong className="text-on-surface">Sekretariat:</strong> 07:30 WIB
                </p>
                <span className="font-label-sm text-label-sm text-outline mt-2">Log melebihi batas jam otomatis diberi status dispensasi/terlambat.</span>
              </div>
            </div>

            {/* Broadcast Reminder */}
            <div className="bg-primary-container text-white rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary-fixed">notifications_active</span>
                <span className="font-headline-sm text-headline-sm">Kirim Pengingat Masuk</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-primary-container">
                Masih ada 22 staf yang belum melakukan presensi hari ini. Kirim notifikasi dorongan instan via WhatsApp gateway yayasan.
              </p>
              <button className="w-full py-2 px-3 bg-secondary hover:bg-blue-600 text-white font-body-sm-medium text-body-sm-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Broadcast Pengingat (22 Guru/Staf)</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default MonitoringPresensiPage
