import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { selectJumlahHadir, selectJumlahTerlambat, selectTotalPegawai, selectUnitSummary, selectFilterTabCounts, selectMonitoringActivity, selectBelumPresensi, selectUnitOptions } from '../store/simPresStore.jsx'

function MonitoringPresensiPage() {
  const { state } = useSimPres()
  const [activeFilter, setActiveFilter] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit (Pusat)')
  const [autoRefresh, setAutoRefresh] = useState('15s')
  const [liveTime, setLiveTime] = useState('')

  const hadir = selectJumlahHadir(state)
  const terlambat = selectJumlahTerlambat(state)
  const belum = selectBelumPresensi(state)
  const totalPegawai = selectTotalPegawai(state)
  const tabCounts = selectFilterTabCounts(state)
  const unitSummary = selectUnitSummary(state)
  const activityData = selectMonitoringActivity(state)

  // Opsi unit dari satu sumber data (store), bukan daftar hardcoded.
  const unitOptions = selectUnitOptions(state)

  const filterTabs = [
    { id: 'semua', label: 'Semua', count: tabCounts.semua, color: 'bg-primary-container text-white' },
    { id: 'tepat', label: 'Tepat Waktu', count: tabCounts.tepat, color: 'bg-emerald-100 text-emerald-800' },
    { id: 'terlambat', label: 'Terlambat', count: tabCounts.terlambat, color: 'bg-amber-100 text-amber-800' },
    { id: 'face', label: 'Face Recognition', count: tabCounts.face, color: 'bg-blue-100 text-blue-800' },
    { id: 'qr', label: 'QR / Mobile', count: tabCounts.qr, color: 'bg-purple-100 text-purple-800' },
  ]

  const summaryCards = [
    {
      id: 'hadir',
      label: 'Sudah Presensi',
      value: String(hadir),
      total: `/ ${totalPegawai} Pegawai`,
      percentage: hadir > 0 && totalPegawai > 0 ? ((hadir / totalPegawai) * 100).toFixed(1) : '0.0',
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
      value: String(belum),
      total: 'Pegawai tertinggal',
      percentage: belum > 0 && totalPegawai > 0 ? ((belum / totalPegawai) * 100).toFixed(1) : '0.0',
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
      value: String(terlambat),
      total: 'Tercatat dispensasi / denda',
      percentage: terlambat > 0 ? ((terlambat / hadir) * 100).toFixed(1) : '0.0',
      subtitle: 'Melebihi batas jam masuk unit',
      subtitleHighlight: '+2 vs kemarin',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: 'warning',
      accent: 'bg-amber-500',
    },
  ]

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
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
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center gap-2 font-body-sm font-body-sm text-outline">
            <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="hover:text-on-surface cursor-pointer transition-colors">Presensi</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface font-body-sm-medium font-body-sm-medium">Monitoring Real-time</span>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg font-headline-lg text-on-surface tracking-tight">Presensi — Monitoring</h1>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-label-sm font-label-sm text-emerald-800 uppercase tracking-wide">Live Feed Presensi</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">schedule</span>
                <span className="font-body-sm-medium font-body-sm-medium text-on-surface">{liveTime || 'Selasa, 15 September 2026 • 07:42:18 WIB'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="relative">
                <select
                  className="appearance-none bg-surface-container-lowest text-on-surface font-body-sm font-body-sm-medium pl-3 pr-8 py-2 rounded-lg shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors focus:outline-none focus:bg-surface-container-lowest"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  {unitOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline">expand_more</span>
              </div>

              <button
                className="flex items-center gap-2 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-sm font-body-sm-medium px-3 py-2 rounded-lg shadow-sm transition-all group"
                type="button"
              >
                <span className={`material-symbols-outlined text-[18px] text-secondary transition-transform ${autoRefresh ? 'rotate-0' : 'rotate-180'}`}>sync</span>
                <span className="whitespace-nowrap">Auto-refresh: <strong className="font-semibold text-secondary">15s</strong></span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {summaryCards.map((card) => (
            <div key={card.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300 ${card.iconBg}`}></div>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="font-label-sm font-label-sm text-outline uppercase tracking-wider">{card.label}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`font-display-lg font-display-lg tracking-tight font-bold ${card.iconColor}`}>{card.value}</span>
                    <span className="font-body-sm-medium font-body-sm-medium text-on-surface-variant">{card.total}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}>
                  <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between relative z-10 bg-surface-container-low/40 px-3 py-1.5 rounded-lg">
                <span className={`font-body-sm-medium font-body-sm-medium ${card.textcolor || 'text-on-surface'}`}>{card.percentage} {card.subtitle}</span>
                <span className={`font-label-sm font-label-sm bg-surface-container-high px-2 py-0.5 rounded font-medium ${card.noteColor || 'text-on-surface-variant'}`}>{card.subtitleHighlight}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <div>
                  <h2 className="font-headline-sm font-headline-sm text-on-surface">Aktivitas Presensi Terbaru</h2>
                  <p className="font-body-sm font-body-sm text-on-surface-variant">Log real-time mesin kiosk, face scan, dan mobile app</p>
                </div>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="w-44 sm:w-56 h-9 pl-8 pr-3 text-body-sm text-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
                  placeholder="Cari nama / NIY..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-2.5 bg-surface-container-low/60 flex items-center gap-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-full font-body-sm-medium font-body-sm-medium transition-colors cursor-pointer ${
                    activeFilter === tab.id ? tab.color : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.25 rounded-full text-[10px] font-bold ${activeFilter === tab.id && tab.id !== 'semua' ? 'bg-white/20' : 'bg-surface-container-high'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col divide-y divide-surface-container">
              {activityData.map((item) => (
                <div key={item.id} className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative ${item.highlight ? 'bg-blue-50/50 hover:bg-blue-50/80' : `hover:bg-surface-container-low/50 ${item.rowBg || ''}`}`}>
                  {item.highlight && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-r"></div>}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-secondary text-white font-headline-sm font-headline-sm flex items-center justify-center shadow-xs">
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
                        <span className="font-headline-sm font-headline-sm text-on-surface truncate">{item.name}</span>
                        <span className={`font-label-sm font-label-sm px-2 py-0.5 rounded-full font-semibold ${item.unitColor}`}>{item.unit}</span>
                        <span className={`font-label-sm font-label-sm px-2 py-0.5 rounded-full font-medium ${item.statusColor}`}>{item.status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-body-sm font-body-sm text-on-surface-variant">
                        <span>NIY: <strong className="font-medium text-on-surface">{item.niy}</strong></span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-secondary">{item.method.icon}</span>
                          {item.method.label}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">{item.location.icon}</span>
                          {item.location.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 gap-1 pl-14 md:pl-0">
                    <span className="font-headline-sm font-headline-sm font-semibold text-emerald-700">{item.time}</span>
                    <span className="font-body-sm font-body-sm text-on-surface-variant">{item.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-body-sm font-body-sm text-on-surface-variant text-center sm:text-left">
                Menampilkan <strong className="font-semibold text-on-surface">{activityData.length}</strong> dari <strong className="font-semibold text-on-surface">{selectJumlahHadir(state)}</strong> aktivitas presensi hari ini
              </span>
              <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded-lg text-secondary font-body-sm-medium text-body-sm-medium shadow-xs transition-colors cursor-pointer" type="button">
                <span>Buka Rekap Log Lengkap</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm font-headline-sm text-on-surface">Sebaran per Unit</h2>
                  <span className="font-label-sm font-label-sm text-secondary bg-blue-50 px-2 py-0.5 rounded-full font-semibold">5 Satuan</span>
                </div>
                <p className="font-body-sm font-body-sm text-on-surface-variant mt-0.5">Tingkat kehadiran real-time per sekolah naungan</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">location_searching</span>
                  <span className="font-body-sm font-body-sm-medium">Kepatuhan Geofence</span>
                </div>
                <span className="font-headline-sm font-headline-sm font-bold text-emerald-700">99.1% <span className="font-label-sm font-label-sm font-medium">Valid</span></span>
              </div>

              <div className="flex flex-col gap-4">
                {unitSummary.map((unit) => (
                  <div key={unit.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-emerald-500`}></span>
                        <span className="font-body-sm font-body-sm-medium text-on-surface">{unit.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-body-sm font-body-sm-medium text-on-surface">{unit.present}/{unit.total}</span>
                        <span className={`font-body-sm font-body-sm font-semibold text-secondary`}>({unit.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 bg-emerald-500" style={{ width: `${unit.percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                      <span>Sisa {unit.total - unit.present} Pegawai</span>
                      <span className="bg-surface-container-high px-1.5 py-0.2 rounded font-medium text-outline">{unit.total - unit.present > 0 ? `${unit.total - unit.present} Belum Masuk` : 'Semua Hadir'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">info</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm font-body-sm-medium text-on-surface">Toleransi Batas Jam Presensi</span>
                <p className="font-body-sm font-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  <strong className="text-on-surface">TK &amp; SD:</strong> 07:15 WIB<br />
                  <strong className="text-on-surface">SMP &amp; SMA:</strong> 07:00 WIB<br />
                  <strong className="text-on-surface">Sekretariat:</strong> 07:30 WIB
                </p>
                <span className="font-label-sm font-label-sm text-outline mt-2">Log melebihi batas jam otomatis diberi status dispensasi/terlambat.</span>
              </div>
            </div>

            <div className="bg-primary-container text-white rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary-fixed">notifications_active</span>
                <span className="font-headline-sm font-headline-sm">Kirim Pengingat Masuk</span>
              </div>
              <p className="font-body-sm font-body-sm text-on-primary-container">
                Masih ada {belum} staf yang belum melakukan presensi hari ini. Kirim notifikasi dorongan instan via WhatsApp gateway yayasan.
              </p>
              <button className="w-full py-2 px-3 bg-secondary hover:bg-blue-600 text-white font-body-sm font-body-sm-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Broadcast Pengingat ({belum} Guru/Staf)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonitoringPresensiPage
