import { useState, useRef, useEffect } from 'react'
import { useSimPres, selectRankingDataFiltered, selectCanSwitchUnit, selectActiveUnitId, selectActiveUnitLabel, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
import * as XLSX from 'xlsx'

function RankingKehadiranPage() {
  const { state, dispatch } = useSimPres()
  const [activeTab, setActiveTab] = useState('Bulanan')
  // Unit berasal dari store utama; hanya Superadmin yang boleh berpindah unit.
  const canSwitchUnit = selectCanSwitchUnit(state)
  const selectedUnit = selectActiveUnitId(state)
  const [selectedDateRange, setSelectedDateRange] = useState(null)
  const [openUnitMenu, setOpenUnitMenu] = useState(false)
  const [openDateMenu, setOpenDateMenu] = useState(false)
  const unitMenuRef = useRef(null)
  const dateMenuRef = useRef(null)
  
  // Calculate date range based on activeTab
  const getDateRange = (period) => {
    const today = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'Harian':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        break
      case 'Mingguan':
        const dayOfWeek = today.getDay()
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek)
        break
      case 'Bulanan':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'Tahunan':
        startDate = new Date(today.getFullYear(), 0, 1)
        break
    }
    
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]
    return { start: startStr, end: endStr }
  }
  
  const dateRange = selectedDateRange || getDateRange(activeTab)
  const ranking = selectRankingDataFiltered(state, { 
    period: activeTab, 
    unitId: selectedUnit, 
    dateRange 
  })
  
  // Determine empty state message
  const getEmptyMessage = () => {
    if (!ranking.hasAttendanceData) {
      return 'Belum ada data presensi untuk periode ini'
    }
    if (ranking.totalFilteredStaff === 0) {
      return 'Tidak ada pegawai aktif di unit ini'
    }
    if (ranking.totalStaffWithAttendance === 0) {
      return 'Belum ada pegawai yang melakukan presensi pada periode ini'
    }
    return 'Tidak ada data untuk filter ini'
  }
  
  const hasRankingData = ranking.topOnTime.length > 0 || ranking.topLate.length > 0
  const emptyMessage = getEmptyMessage()
  
  // Format date for display
  const formatDateRange = (range) => {
    const start = new Date(range.start)
    const end = new Date(range.end)
    
    if (activeTab === 'Harian') {
      return start.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    }
    
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    if (sameMonth) {
      return `${start.toLocaleDateString('id-ID', { day: '2-digit' })} - ${end.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`
    }
    
    return `${start.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }
  
  // Get period label for export
  const getPeriodLabel = () => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    if (activeTab === 'Harian') {
      return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
    }
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${months[start.getMonth()]} ${start.getFullYear()}`
    }
    
    return `${months[start.getMonth()]} ${start.getFullYear()} - ${months[end.getMonth()]} ${end.getFullYear()}`
  }
  
  // Get unit label for export
  const getUnitLabel = () => {
    if (selectedUnit === ALL_UNITS) return 'Semua_Unit'
    const unit = state.units.find(u => u.id === selectedUnit)
    return unit ? unit.nama.replace(/\s+/g, '_') : 'Semua_Unit'
  }
  
  // Generate filename
  const generateFileName = () => {
    const periodLabel = getPeriodLabel().replace(/\s+/g, '_').replace(/-/g, '_')
    const unitLabel = getUnitLabel()
    return `Ranking_Kehadiran_${unitLabel}_${periodLabel}.xlsx`
  }
  
  // Export to XLSX
  const handleExport = () => {
    // Validate data before export
    if (!ranking.hasAttendanceData) {
      alert('Tidak bisa mengekspor: Belum ada data presensi untuk periode ini')
      return
    }
    if (ranking.totalFilteredStaff === 0) {
      alert('Tidak bisa mengekspor: Tidak ada pegawai aktif di unit ini')
      return
    }
    if (ranking.totalStaffWithAttendance === 0) {
      alert('Tidak bisa mengekspor: Belum ada pegawai yang melakukan presensi pada periode ini')
      return
    }
    
    // Combine topOnTime and topLate data for full export
    const allStaff = [...ranking.topOnTime, ...ranking.topLate]
    
    // Remove duplicates by name+unit
    const uniqueStaff = allStaff.filter((staff, index, self) => 
      index === self.findIndex(s => s.name === staff.name && s.unit === staff.unit)
    )
    
    // Sort by persentaseKehadiran desc, then terlambatCount asc
    const sortedStaff = [...uniqueStaff].sort((a, b) => {
      const pctA = parseFloat(a.persentaseKehadiran || 0)
      const pctB = parseFloat(b.persentaseKehadiran || 0)
      if (pctB !== pctA) return pctB - pctA
      return (a.terlambatCount || 0) - (b.terlambatCount || 0)
    })
    
    // Prepare data for Excel
    const exportData = sortedStaff.map((item, index) => ({
      'No': index + 1,
      'Nama Pegawai': item.name,
      'NIY': item.niy || '-',
      'Unit': item.unit,
      'Jabatan': item.role,
      'Jumlah Hadir': item.hadirCount || 0,
      'Tepat Waktu': item.tepatWaktuCount || 0,
      'Terlambat': item.terlambatCount || 0,
      'Persentase Kehadiran': item.persentaseKehadiran ? `${item.persentaseKehadiran}%` : '0%',
      'Rata-rata Keterlambatan': item.rataRataTerlambat ? `${item.rataRataTerlambat} menit` : '-'
    }))
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Title row
    const titleRow = [['Ranking Kehadiran Pegawai']]
    // Info rows
    const infoRows = [
      ['Periode', getPeriodLabel()],
      ['Unit', selectedUnit === ALL_UNITS ? 'Semua Unit' : (state.units.find(u => u.id === selectedUnit)?.nama || 'Semua Unit')],
      ['Tanggal Export', new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
      [] // empty row
    ]
    // Headers
    const headers = [['No', 'Nama Pegawai', 'NIY', 'Unit', 'Jabatan', 'Jumlah Hadir', 'Tepat Waktu', 'Terlambat', 'Persentase Kehadiran', 'Rata-rata Keterlambatan']]
    // Data rows
    const dataRows = exportData.map(row => Object.values(row))
    
    // Combine all rows
    const allRows = [...titleRow, ...infoRows, ...headers, ...dataRows]
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allRows)
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama Pegawai
      { wch: 15 },  // NIY
      { wch: 25 },  // Unit
      { wch: 25 },  // Jabatan
      { wch: 12 },  // Jumlah Hadir
      { wch: 12 },  // Tepat Waktu
      { wch: 10 },  // Terlambat
      { wch: 18 },  // Persentase Kehadiran
      { wch: 22 },  // Rata-rata Keterlambatan
    ]
    ws['!cols'] = colWidths
    
    // Merge title cell
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } } // Title merge across all columns
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Kehadiran')
    
    // Generate filename and download
    const fileName = generateFileName()
    XLSX.writeFile(wb, fileName)
  }
  
  const unitOptions = [
    ...(canSwitchUnit ? [{ id: ALL_UNITS, label: `Semua Unit (${state.units.length} Unit)` }] : []),
    ...selectUnitOptionsById(state).map(u => ({ id: u.id, label: u.nama })),
  ]

  const selectedUnitOption = unitOptions.find(u => u.id === selectedUnit) || { id: selectedUnit, label: selectActiveUnitLabel(state) }
  
  const tabs = ['Harian', 'Mingguan', 'Bulanan', 'Tahunan']

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (unitMenuRef.current && !unitMenuRef.current.contains(e.target)) {
        setOpenUnitMenu(false)
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) {
        setOpenDateMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col w-full">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 w-full">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <span className="material-symbols-outlined text-[20px] leading-none">military_tech</span>
              </span>
              Ranking Kehadiran
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pemantauan reputasi dan analisis kepatuhan ketepatan waktu pegawai antar-unit sekolah secara berkala.
            </p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-muted/40 border border-border px-3 py-1.5 rounded-lg shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[15px] text-muted-foreground">home</span>
              <span>Home</span>
              <span className="text-muted-foreground/40">/</span>
              <span>Presensi</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-primary font-semibold">Ranking Kehadiran</span>
            </div>
          </div>
        </div>

        {/* CONTROL TOOLBAR */}
        <div className="bg-card rounded-xl border border-border p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Toggle Periode */}
            <div className="inline-flex p-1 bg-muted rounded-lg gap-1 border border-border/60">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    setSelectedDateRange(null)
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            
            {/* Unit Selector — hanya Superadmin */}
            {canSwitchUnit && (
              <div className="relative" ref={unitMenuRef}>
                <button
                  onClick={() => {
                    setOpenUnitMenu(!openUnitMenu)
                    setOpenDateMenu(false)
                  }}
                  className="h-9 px-3 flex items-center gap-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors shadow-xs cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-muted-foreground text-[16px]">apartment</span>
                  <span>{selectedUnitOption.label}</span>
                  <span className="material-symbols-outlined text-muted-foreground text-[16px]">{openUnitMenu ? 'expand_less' : 'expand_more'}</span>
                </button>
                {openUnitMenu && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border py-1.5 z-20 animate-fade-in">
                    {unitOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          dispatch({ type: 'SET_SELECTED_UNIT', payload: opt.id })
                          setOpenUnitMenu(false)
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                          selectedUnit === opt.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Month/Date Range Badge */}
            <div className="relative" ref={dateMenuRef}>
              <button
                onClick={() => {
                  setOpenDateMenu(!openDateMenu)
                  setOpenUnitMenu(false)
                }}
                className="h-9 px-3 flex items-center gap-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors shadow-xs cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-muted-foreground text-[16px]">calendar_today</span>
                <span>{formatDateRange(dateRange)}</span>
                <span className="material-symbols-outlined text-muted-foreground text-[16px]">{openDateMenu ? 'expand_less' : 'expand_more'}</span>
              </button>
              {openDateMenu && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-64 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border p-3 z-20 animate-fade-in space-y-3">
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Preset Cepat</div>
                    <div className="grid grid-cols-2 gap-1">
                      {['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setActiveTab(preset)
                            setSelectedDateRange(null)
                            setOpenDateMenu(false)
                          }}
                          className={`px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer ${
                            activeTab === preset && !selectedDateRange
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                          type="button"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Rentang Kustom</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Tanggal Mulai</label>
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setSelectedDateRange({ ...dateRange, start: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg bg-card border border-input text-xs text-foreground focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Tanggal Akhir</label>
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setSelectedDateRange({ ...dateRange, end: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg bg-card border border-input text-xs text-foreground focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <button
                        onClick={() => setOpenDateMenu(false)}
                        className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>Terapkan</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!ranking.hasAttendanceData || ranking.totalStaffWithAttendance === 0}
              className={`h-9 px-3.5 flex items-center justify-center gap-2 rounded-lg border transition-all text-xs font-semibold shadow-xs ${
                !ranking.hasAttendanceData || ranking.totalStaffWithAttendance === 0
                  ? 'bg-muted/40 border-border text-muted-foreground/50 cursor-not-allowed opacity-60'
                  : 'bg-card hover:bg-muted border-border text-foreground cursor-pointer'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-muted-foreground text-[16px]">file_download</span>
              <span>Export Peringkat (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* MAIN LEADERBOARD SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT COLUMN: TOP 10 ON-TIME */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-[18px]">military_tech</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">Top 10 Paling Tepat Waktu</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {ranking.topOnTime.length > 0 && ranking.topOnTime[0].terlambatCount === 0 ? '100% On-Time' : `${ranking.topOnTime.length} Pegawai`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pegawai dengan tingkat kedisiplinan dan kepatuhan jam masuk tertinggi
              </p>
            </div>
            <div className="flex flex-col divide-y divide-border/60">
              {ranking.topOnTime.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                ranking.topOnTime.map((item) => (
                  <div
                    key={item.rank}
                    className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                        item.rank === 1
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400'
                          : 'bg-muted border border-border text-muted-foreground'
                      }`}>
                        {item.rank === 1 ? (
                          <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400">workspace_premium</span>
                        ) : (
                          item.rank
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {item.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground font-medium text-[10px]">
                            {item.unit}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate mt-0.5">{item.role}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.late}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.stat}{item.statSub ? ` (${item.statSub})` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: TOP 10 FREQUENTLY LATE */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">Top 10 Paling Sering Terlambat</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                  Perlu Evaluasi
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daftar pegawai dengan akumulasi keterlambatan tertinggi periode ini
              </p>
            </div>
            <div className="flex flex-col divide-y divide-border/60">
              {ranking.topLate.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                ranking.topLate.map((item) => (
                  <div
                    key={item.rank}
                    className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {item.rank}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {item.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground font-medium text-[10px]">
                            {item.unit}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate mt-0.5">{item.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="flex flex-col items-end text-right">
                        <span className={`text-xs font-bold ${item.rank === 1 ? 'text-destructive' : 'text-foreground'}`}>
                          {item.count}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{item.avg}</span>
                      </div>
                      <button
                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                          item.rank === 1
                            ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                            : 'bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80'
                        }`}
                        type="button"
                      >
                        {item.rank === 1 ? 'Teguran' : 'Detail'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingKehadiranPage
