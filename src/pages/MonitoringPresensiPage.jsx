import { useState, useEffect } from 'react'
import { useSimPres, selectSearchTerm } from '../store/simPresStore.jsx'
import { selectJumlahHadir, selectJumlahTerlambat, selectTotalPegawai, selectUnitSummary, selectFilterTabCounts, selectMonitoringActivity, selectBelumPresensi, selectHadirHariIni, selectCanSwitchUnit, selectActiveUnitId, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
import { daftarJamKerja, jamKerjaRules } from '../data/jamKerja.js'

function MonitoringPresensiPage() {
  const { state, dispatch } = useSimPres()
  const [activeFilter, setActiveFilter] = useState('semua')
  const searchTerm = selectSearchTerm(state)
  const [autoRefresh, setAutoRefresh] = useState('15s')
  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true)
  const [liveTime, setLiveTime] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [syncError, setSyncError] = useState(null)

  // Semua angka & feed mengikuti unit terpilih di store; role non-Superadmin
  // tidak punya selector dan otomatis terkunci ke unit akunnya.
  const canSwitchUnit = selectCanSwitchUnit(state)
  const selectedUnit = selectActiveUnitId(state)

  const hadir = selectJumlahHadir(state)
  const terlambat = selectJumlahTerlambat(state)
  const belum = selectBelumPresensi(state)
  const totalPegawai = selectTotalPegawai(state)
  const tabCounts = selectFilterTabCounts(state)
  const unitSummary = selectUnitSummary(state)
  const activityData = selectMonitoringActivity(state)
  const hadirHariIni = selectHadirHariIni(state)

  // Opsi unit dari satu sumber data (store), bukan daftar hardcoded.
  const unitOptions = selectUnitOptionsById(state)

  // Ambil konfigurasi presensi dari global settings
  const settings = state.settings
  const presensiConfig = settings.presensi || {}
  const zonaWaktu = settings.zonaWaktu || 'WIB'
  
  // Helper untuk mendapatkan radius geofence per unit
  const getRadiusUnit = (unitId) => {
    return presensiConfig.radiusGeofencePerUnit?.[unitId] 
      ?? presensiConfig.radiusGeofenceDefault 
      ?? 50
  }

  // Format zona waktu untuk tampilan
  const getZonaWaktuLabel = (zw) => {
    const labels = { WIB: 'WIB (UTC+7)', WITA: 'WITA (UTC+8)', WIT: 'WIT (UTC+9)' }
    return labels[zw] || zw
  }

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
    // Unit sudah dibatasi oleh store (unit terpilih), jadi tidak difilter lagi di sini.
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
      subtitleHighlight: `Batas ${jamKerjaRules(new Date()).jamMasuk}`,
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
      subtitle: `Melebihi batas jam masuk ${jamKerjaRules(new Date()).jamMasuk}`,
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
      <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
        {/* Header & Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Home</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Presensi</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-foreground font-semibold">Monitoring Real-time</span>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Monitoring Presensi</h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Live Feed</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border shadow-xs text-xs text-foreground">
                <span className="material-symbols-outlined text-[16px] text-muted-foreground">schedule</span>
                <span className="font-semibold text-foreground whitespace-nowrap">{liveTime}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {lastUpdate && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground border border-border">
                  <span className="material-symbols-outlined text-[15px] text-muted-foreground">update</span>
                  <span className="whitespace-nowrap font-medium">Update: {lastUpdate}</span>
                </div>
              )}

              {canSwitchUnit ? (
                <div className="relative hidden sm:block">
                  <select
                    className="appearance-none bg-card text-foreground text-xs font-semibold pl-3 pr-8 py-1.5 rounded-lg border border-input shadow-xs cursor-pointer hover:bg-accent/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedUnit}
                    onChange={(e) => dispatch({ type: 'SET_SELECTED_UNIT', payload: e.target.value })}
                  >
                    <option value={ALL_UNITS}>Semua Unit (Pusat)</option>
                    {unitOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.nama}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-muted-foreground">expand_more</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg border border-border cursor-not-allowed text-xs text-muted-foreground" title="Unit mengikuti akun Anda">
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">domain</span>
                  <span className="font-medium whitespace-nowrap">{unitOptions[0]?.nama || 'Semua Unit (Pusat)'}</span>
                  <span className="material-symbols-outlined text-[14px] text-muted-foreground">lock</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <select
                    className="appearance-none bg-card text-foreground text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-lg border border-input shadow-xs cursor-pointer hover:bg-accent/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    value={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.value)}
                    disabled={!isAutoRefreshOn}
                  >
                    {refreshIntervals.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-muted-foreground">expand_more</span>
                </div>
                <button
                  onClick={() => setIsAutoRefreshOn(!isAutoRefreshOn)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium cursor-pointer shadow-xs ${
                    isAutoRefreshOn
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-card text-muted-foreground border-input hover:bg-accent'
                  }`}
                  type="button"
                >
                  <span className={`material-symbols-outlined text-[16px] transition-transform ${isAutoRefreshOn ? 'rotate-0' : 'rotate-180'}`}>sync</span>
                  <span className="whitespace-nowrap hidden sm:inline">{isAutoRefreshOn ? 'Auto-sync On' : 'Auto-sync Off'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map((card) => (
            <div key={card.id} className="bg-card rounded-xl p-5 border border-border shadow-xs flex flex-col justify-between hover:border-border/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground leading-none">{card.value}</span>
                    <span className="text-xs text-muted-foreground font-medium">{card.total}</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}>
                  <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{card.percentage}% {card.subtitle}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-muted-foreground bg-muted border border-border">{card.subtitleHighlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Feed List (8 cols) */}
          <div className="lg:col-span-8">
            <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground tracking-tight">Aktivitas Presensi Terbaru</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Log real-time mesin kiosk, face scan, dan mobile app</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[17px]">search</span>
                  <input
                    className="w-full sm:w-60 h-9 pl-8 pr-3 text-xs bg-card border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                    placeholder="Cari nama / NIY..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Segmented Filter Tabs */}
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-1.5 overflow-x-auto">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeFilter === tab.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                      activeFilter === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Feed List Items */}
              <div className="divide-y divide-slate-100">
                {syncError && (
                  <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 flex items-center gap-2.5 text-xs text-rose-800">
                    <span className="material-symbols-outlined text-[18px] text-rose-600">sync_problem</span>
                    <span>Sinkronisasi gagal: {syncError}. Mencoba lagi...</span>
                    <button onClick={() => setSyncError(null)} className="ml-auto text-rose-600 hover:underline font-semibold cursor-pointer">Tutup</button>
                  </div>
                )}

                {hasNoData && (
                  <div className="py-12 px-4 text-center">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground/40">history_toggle_off</span>
                    <h3 className="mt-2 text-xs font-semibold text-foreground">Belum Ada Data Presensi</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Data presensi hari ini belum tersedia. Pastikan pegawai sudah melakukan check-in.</p>
                  </div>
                )}

                {hasNoActivity && !hasNoData && (
                  <div className="py-10 px-4 text-center">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground/40">filter_alt_off</span>
                    <h3 className="mt-2 text-xs font-semibold text-foreground">Tidak Ada Aktivitas Sesuai Filter</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Coba ubah filter tab, unit, atau kata kunci pencarian.</p>
                  </div>
                )}

                {!hasNoData && !hasNoActivity && (
                  <>
                    <div className="hidden md:grid grid-cols-[36px_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted text-muted-foreground text-[11px] font-bold uppercase tracking-wider border-b border-border">
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
                      <div key={item.id} className="p-3.5 hover:bg-muted/40 transition-colors">
                        <div className="md:grid grid-cols-[36px_1fr_auto_auto] gap-4 items-center">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                              {item.initials}
                            </div>
                            {item.highlight && (
                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-[8px]">check</span>
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                              <span className="text-[10.5px] px-2 py-0.5 rounded-md font-semibold bg-secondary text-secondary-foreground border border-border">{item.unit}</span>
                              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${item.statusColor}`}>{item.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                              <span>NIY: <strong className="text-foreground font-medium">{item.niy}</strong></span>
                            </div>
                          </div>
                          <div className="hidden md:flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                              <span className={`material-symbols-outlined text-[16px] ${item.method.label === 'Face Recognition' ? 'text-primary' : item.method.label === 'QR Code' ? 'text-primary' : 'text-muted-foreground'}`}>{item.method.icon}</span>
                              <span className="font-medium">{item.method.label}</span>
                            </span>
                            <span className={`inline-flex items-center gap-1.5 text-xs ${item.location.color}`}>
                              <span className="material-symbols-outlined text-[14px]">{item.location.icon}</span>
                              <span className="font-medium">{item.location.label}</span>
                            </span>
                          </div>
                          <div className="flex flex-col items-end md:items-end gap-0.5 text-right">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">{item.time}</span>
                            <span className="text-[11px] text-muted-foreground">{item.timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="p-3.5 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground text-center sm:text-left">
                  Menampilkan <strong className="font-semibold text-foreground">{filteredActivity.length}</strong> dari <strong className="font-semibold text-foreground">{selectJumlahHadir(state)}</strong> presensi
                </span>
                <button
                  onClick={() => alert('Membuka Rekap Log Lengkap...')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-accent rounded-lg text-foreground font-medium text-xs border border-input transition-colors cursor-pointer"
                  type="button"
                >
                  <span>Buka Rekap Log Lengkap</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Sebaran Unit Card */}
            <div className="bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground tracking-tight">Sebaran per Unit</h2>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{state.units.length} Satuan</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Tingkat kehadiran real-time per sekolah naungan</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">location_searching</span>
                  <span className="text-xs font-semibold">Kepatuhan Geofence</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">99.1% <span className="text-[11px] font-normal text-muted-foreground">Valid</span></span>
              </div>

              {/* Radius Geofence per Unit */}
              <div className="p-3 bg-muted/40 border border-border rounded-xl">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Radius Geofence per Unit</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {state.units.map((unit) => (
                    <div key={unit.id} className="flex justify-between items-center py-0.5 border-b border-border last:border-none">
                      <span className="text-foreground truncate">{unit.nama}</span>
                      <span className="font-semibold text-foreground ml-1">{getRadiusUnit(unit.id)}m</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {unitSummary.map((unit) => (
                  <div key={unit.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        <span className="font-semibold text-foreground">{unit.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="font-semibold text-foreground">{unit.present}/{unit.total}</span>
                        <span className="text-primary font-bold">({unit.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${unit.percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                      <span>Sisa {unit.total - unit.present} Pegawai</span>
                      <span className="bg-muted px-1.5 py-0.2 rounded text-muted-foreground font-medium">{unit.total - unit.present > 0 ? `${unit.total - unit.present} Belum Masuk` : 'Semua Hadir'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jam Kerja Info */}
            <div className="bg-card rounded-xl border border-border shadow-xs p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[17px]">info</span>
              </div>
              <div className="flex flex-col min-w-0 text-xs">
                <span className="font-semibold text-foreground">Batas Jam Presensi (Jam Kerja Global)</span>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  {daftarJamKerja().map((h) => (
                    <span key={h.hari} className="block text-[11.5px]">
                      <strong className="text-foreground">{h.hari}:</strong> {h.jamMasuk} — {h.jamPulang ?? 'bebas'} {getZonaWaktuLabel(zonaWaktu)}
                    </span>
                  ))}
                </p>
              </div>
            </div>

            {/* Kirim Pengingat WhatsApp Card */}
            <div className="bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">notifications_active</span>
                <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/80">Pengingat Masuk</span>
              </div>
              <p className="text-xs text-sidebar-foreground/70 leading-relaxed">
                Masih ada <strong className="text-sidebar-foreground font-semibold">{belum}</strong> pegawai belum presensi. Kirim notifikasi dorongan instan via WhatsApp gateway yayasan.
              </p>
              <button
                onClick={() => alert(`Mengirim broadcast pengingat ke ${belum} Guru/Staf...`)}
                className="w-full py-2.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Broadcast Pengingat ({belum} Pegawai)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonitoringPresensiPage