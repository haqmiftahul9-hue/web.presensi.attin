import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { selectJumlahHadir, selectJumlahTerlambat, selectTotalPegawai, selectUnitSummary, selectFilterTabCounts, selectMonitoringActivity, selectBelumPresensi, selectUnitOptions, selectHadirHariIni } from '../store/simPresStore.jsx'

function MonitoringPresensiPage() {
  const { state, dispatch } = useSimPres()
  const [activeFilter, setActiveFilter] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit (Pusat)')
  const [autoRefresh, setAutoRefresh] = useState('15s')
  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true)
  const [liveTime, setLiveTime] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [syncError, setSyncError] = useState(null)

  const hadir = selectJumlahHadir(state)
  const terlambat = selectJumlahTerlambat(state)
  const belum = selectBelumPresensi(state)
  const totalPegawai = selectTotalPegawai(state)
  const tabCounts = selectFilterTabCounts(state)
  const unitSummary = selectUnitSummary(state)
  const activityData = selectMonitoringActivity(state)
  const hadirHariIni = selectHadirHariIni(state)

  // Opsi unit dari satu sumber data (store), bukan daftar hardcoded.
  const unitOptions = selectUnitOptions(state)

  const refreshIntervals = [
    { value: '5s', label: '5 detik' },
    { value: '15s', label: '15 detik' },
    { value: '30s', label: '30 detik' },
    { value: '60s', label: '1 menit' },
  ]

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefreshOn) return
    const intervalMs = parseInt(autoRefresh) * 1000
    const timer = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      // Simulate sync check
      setSyncError(null)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [autoRefresh, isAutoRefreshOn])

  // Initial last update
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  }, [])

  const filterTabs = [
    { id: 'semua', label: 'Semua', count: tabCounts.semua, color: 'bg-primary-container text-white' },
    { id: 'tepat', label: 'Tepat Waktu', count: tabCounts.tepat, color: 'bg-emerald-100 text-emerald-800' },
    { id: 'terlambat', label: 'Terlambat', count: tabCounts.terlambat, color: 'bg-amber-100 text-amber-800' },
    { id: 'face', label: 'Face Recognition', count: tabCounts.face, color: 'bg-blue-100 text-blue-800' },
    { id: 'qr', label: 'QR / Mobile', count: tabCounts.qr, color: 'bg-purple-100 text-purple-800' },
  ]

  // Filter activity data based on active tab and selected unit
  const filteredActivity = activityData.filter((item) => {
    // Filter by tab
    if (activeFilter === 'tepat' && item.status !== 'Tepat Waktu' && !item.status.includes('Baru Masuk')) return false
    if (activeFilter === 'terlambat' && !item.status.includes('Terlambat')) return false
    if (activeFilter === 'face' && item.method.label !== 'Face Recognition') return false
    if (activeFilter === 'qr' && item.method.label !== 'QR Code' && item.method.label !== 'Mobile GPS') return false
    // Filter by unit
    if (selectedUnit !== 'Semua Unit (Pusat)' && item.unit !== selectedUnit) return false
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!item.name.toLowerCase().includes(term) && !item.niy.toLowerCase().includes(term)) return false
    }
    return true
  })

  const hasNoActivity = filteredActivity.length === 0 && activityData.length > 0
  const hasNoData = activityData.length === 0

  const summaryCards = [
    {
      id: 'hadir',
      label: 'Sudah Presensi',
      value: String(hadir),
      total: `/ ${totalPegawai} Pegawai`,
      percentage: hadir > 0 && totalPegawai > 0 ? ((hadir / totalPegawai) * 100).toFixed(1) : '0.0',
      subtitle: 'Kehadiran tercatat',
      subtitleHighlight: '+4 vs kemarin',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      icon: 'check_circle',
      accent: 'bg-emerald-500',
      borderColor: 'border-emerald-200',
    },
    {
      id: 'belum',
      label: 'Belum Presensi',
      value: String(belum),
      total: 'Pegawai tertinggal',
      percentage: belum > 0 && totalPegawai > 0 ? ((belum / totalPegawai) * 100).toFixed(1) : '0.0',
      subtitle: 'belum check-in / tapping',
      subtitleHighlight: 'Batas 07:30',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      icon: 'person_off',
      accent: 'bg-amber-500',
      borderColor: 'border-amber-200',
    },
    {
      id: 'terlambat',
      label: 'Terlambat Hari Ini',
      value: String(terlambat),
      total: 'Tercatat dispensasi / denda',
      percentage: terlambat > 0 ? ((terlambat / hadir) * 100).toFixed(1) : '0.0',
      subtitle: 'Melebihi batas jam masuk unit',
      subtitleHighlight: '+2 vs kemarin',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: 'warning',
      accent: 'bg-red-500',
      borderColor: 'border-red-200',
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
    <div className="flex flex-col w-full min-w-0">
      <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-gray-400">
            <span className="hover:text-gray-700 cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
            <span className="hover:text-gray-700 cursor-pointer transition-colors">Presensi</span>
            <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
            <span className="text-gray-900 font-body-sm-medium text-body-sm-medium">Monitoring Real-time</span>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-gray-900 tracking-tight">Presensi — Monitoring</h1>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-label-sm text-label-sm text-emerald-800 uppercase tracking-wide">Live Feed</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">schedule</span>
                <span className="font-body-sm-medium text-body-sm-medium text-gray-900 whitespace-nowrap">{liveTime}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {lastUpdate && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">update</span>
                  <span className="font-body-sm text-body-sm text-blue-800 whitespace-nowrap">Terakhir update: {lastUpdate}</span>
                </div>
              )}

              <div className="relative hidden sm:block">
                <select
                  className="appearance-none bg-white text-gray-900 font-body-sm-medium text-body-sm-medium pl-3 pr-8 py-2 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  {unitOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">expand_more</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <select
                    className="appearance-none bg-white text-gray-900 font-body-sm-medium text-body-sm-medium pl-3 pr-8 py-2 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.value)}
                    disabled={!isAutoRefreshOn}
                  >
                    {refreshIntervals.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">expand_more</span>
                </div>
                <button
                  onClick={() => setIsAutoRefreshOn(!isAutoRefreshOn)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm border transition-all ${
                    isAutoRefreshOn
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  type="button"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${isAutoRefreshOn ? 'rotate-0' : 'rotate-180'}`}>sync</span>
                  <span className="whitespace-nowrap font-body-sm-medium text-body-sm-medium hidden sm:inline">{isAutoRefreshOn ? 'Auto-refresh aktif' : 'Auto-refresh mati'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <div key={card.id} className={`bg-white rounded-xl p-5 shadow-sm border ${card.borderColor} flex flex-col h-full hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="font-label-sm text-label-sm text-gray-500 uppercase tracking-wider">{card.label}</span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className={`font-headline-lg text-headline-lg tracking-tight leading-tight ${card.iconColor}`}>{card.value}</span>
                    <span className="font-body-sm text-body-sm text-gray-500">{card.total}</span>
                  </div>
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}>
                  <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-gray-600">{card.percentage}% {card.subtitle}</span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded font-medium text-gray-600 bg-gray-100">{card.subtitleHighlight}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-gray-900">Aktivitas Presensi Terbaru</h2>
                    <p className="font-body-sm text-body-sm text-gray-500">Log real-time mesin kiosk, face scan, dan mobile app</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                  <input
                    className="w-full sm:w-64 h-10 pl-10 pr-4 font-body-sm text-body-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Cari nama / NIY..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-y border-gray-200 flex items-center gap-2 overflow-x-auto">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer whitespace-nowrap ${
                      activeFilter === tab.id ? tab.color : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.25 rounded-full font-label-sm text-label-sm font-semibold ml-1.5 ${activeFilter === tab.id && tab.id !== 'semua' ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="divide-y divide-gray-200">
                {syncError && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600">sync_problem</span>
                    <span className="font-body-sm text-body-sm text-red-800">Sinkronisasi gagal: {syncError}. Mencoba lagi...</span>
                    <button onClick={() => setSyncError(null)} className="ml-auto text-red-600 hover:underline font-body-sm">Tutup</button>
                  </div>
                )}

                {hasNoData && (
                  <div className="p-12 text-center bg-gray-50 rounded-xl">
                    <span className="material-symbols-outlined text-6xl text-gray-300">history_toggle_off</span>
                    <h3 className="mt-3 font-body-md-medium text-body-md-medium text-gray-900">Belum Ada Data Presensi</h3>
                    <p className="mt-1 font-body-sm text-body-sm text-gray-500">Data presensi hari ini belum tersedia. Pastikan pegawai sudah melakukan check-in.</p>
                  </div>
                )}

                {hasNoActivity && !hasNoData && (
                  <div className="p-8 text-center bg-gray-50 rounded-xl">
                    <span className="material-symbols-outlined text-5xl text-gray-300">filter_alt_off</span>
                    <h3 className="mt-2 font-body-md-medium text-body-md-medium text-gray-900">Tidak Ada Aktivitas Sesuai Filter</h3>
                    <p className="mt-1 font-body-sm text-body-sm text-gray-500">Coba ubah filter tab, unit, atau kata kunci pencarian.</p>
                  </div>
                )}

                {!hasNoData && !hasNoActivity && (
                  <>
                    <div className="hidden md:grid grid-cols-[40px_1fr_auto_auto] gap-4 px-4 py-3 bg-gray-50 text-gray-500 font-label-sm text-label-sm uppercase tracking-wider border-b border-gray-200">
                      <div></div>
                      <div>Pegawai</div>
                      <div className="flex items-center gap-2">
                        <span>Metode</span>
                        <span>•</span>
                        <span>Geofence</span>
                      </div>
                      <div className="text-right">Waktu</div>
                    </div>
                    {filteredActivity.map((item) => (
                      <div key={item.id} className={`p-4 hover:bg-gray-50 transition-colors ${item.highlight ? 'bg-blue-50/50' : ''} ${item.rowBg || ''} relative`}>
                        {item.highlight && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"></div>}
                        <div className="md:grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center">
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-headline-sm text-headline-sm flex items-center justify-center shadow-sm">
                              {item.initials}
                            </div>
                            {item.highlight && (
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center font-label-sm text-label-sm text-white">
                                <span className="material-symbols-outlined text-[10px]">check</span>
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-body-md text-body-md text-gray-900 truncate">{item.name}</span>
                              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">{item.unit}</span>
                              <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium ${item.statusColor}`}>{item.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-body-sm text-body-sm text-gray-500">
                              <span>NIY: <strong className="font-medium text-gray-700">{item.niy}</strong></span>
                            </div>
                          </div>
                          <div className="hidden md:flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-gray-700">
                              <span className={`material-symbols-outlined text-[16px] ${item.method.label === 'Face Recognition' ? 'text-blue-600' : item.method.label === 'QR Code' ? 'text-purple-600' : item.method.label === 'Mobile GPS' ? 'text-indigo-600' : 'text-gray-500'}`}>{item.method.icon}</span>
                              <span className="font-medium">{item.method.label}</span>
                            </span>
                            <span className={`inline-flex items-center gap-1.5 font-body-sm text-body-sm ${item.location.color}`}>
                              <span className="material-symbols-outlined text-[15px]">{item.location.icon}</span>
                              <span className="font-medium">{item.location.label}</span>
                            </span>
                          </div>
                          <div className="flex flex-col items-end md:items-end gap-0.5 text-right">
                            <span className="font-headline-sm text-headline-sm font-semibold text-emerald-700 whitespace-nowrap">{item.time}</span>
                            <span className="font-body-sm text-body-sm text-gray-500">{item.timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="font-body-sm text-body-sm text-gray-500 text-center sm:text-left">
                  Menampilkan <strong className="font-semibold text-gray-900">{filteredActivity.length}</strong> dari <strong className="font-semibold text-gray-900">{selectJumlahHadir(state)}</strong> aktivitas presensi hari ini
                </span>
                <button
                  onClick={() => alert('Membuka Rekap Log Lengkap...')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-primary font-body-sm-medium text-body-sm-medium shadow-sm border border-gray-200 transition-colors cursor-pointer"
                  type="button"
                >
                  <span>Buka Rekap Log Lengkap</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-headline-sm text-gray-900">Sebaran per Unit</h2>
                  <span className="font-label-sm text-label-sm text-primary bg-blue-50 px-2 py-0.5 rounded-full font-semibold">5 Satuan</span>
                </div>
                <p className="font-body-sm text-body-sm text-gray-500 mt-0.5">Tingkat kehadiran real-time per sekolah naungan</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">location_searching</span>
                  <span className="font-body-sm-medium text-body-sm-medium">Kepatuhan Geofence</span>
                </div>
                <span className="font-body-md-medium text-body-md-medium text-emerald-700 leading-snug">99.1% <span className="font-label-sm text-label-sm font-medium">Valid</span></span>
              </div>

              <div className="flex flex-col gap-4">
                {unitSummary.map((unit) => (
                  <div key={unit.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-body-sm-medium text-body-sm-medium text-gray-900">{unit.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-body-sm-medium text-body-sm-medium text-gray-900">{unit.present}/{unit.total}</span>
                        <span className="font-body-sm text-body-sm font-semibold text-primary">({unit.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 bg-emerald-500" style={{ width: `${unit.percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center font-label-sm text-label-sm text-gray-500">
                      <span>Sisa {unit.total - unit.present} Pegawai</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">{unit.total - unit.present > 0 ? `${unit.total - unit.present} Belum Masuk` : 'Semua Hadir'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">info</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm-medium text-body-sm-medium text-gray-900">Toleransi Batas Jam Presensi</span>
                <p className="font-body-sm text-body-sm text-gray-500 mt-1 leading-relaxed">
                  <strong className="text-gray-900">TK & SD:</strong> 07:15 WIB<br />
                  <strong className="text-gray-900">SMP & SMA:</strong> 07:00 WIB<br />
                  <strong className="text-gray-900">Sekretariat:</strong> 07:30 WIB
                </p>
                <span className="font-label-sm text-label-sm text-gray-400 mt-2">Log melebihi batas jam otomatis diberi status dispensasi/terlambat.</span>
              </div>
            </div>

            <div className="bg-primary text-white rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary/30">notifications_active</span>
                <span className="font-headline-sm text-headline-sm">Kirim Pengingat Masuk</span>
              </div>
              <p className="font-body-sm text-body-sm text-primary/80">
                Masih ada {belum} staf yang belum melakukan presensi hari ini. Kirim notifikasi dorongan instan via WhatsApp gateway yayasan.
              </p>
              <button
                onClick={() => alert(`Mengirim broadcast pengingat ke ${belum} Guru/Staf...`)}
                className="w-full py-2 px-3 bg-white/20 hover:bg-white/30 text-white font-body-sm-medium text-body-sm-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                type="button"
              >
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