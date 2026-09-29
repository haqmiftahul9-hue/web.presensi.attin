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
      'NIY/NIP': item.niy || '-',
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
    const headers = [['No', 'Nama Pegawai', 'NIY/NIP', 'Unit', 'Jabatan', 'Jumlah Hadir', 'Tepat Waktu', 'Terlambat', 'Persentase Kehadiran', 'Rata-rata Keterlambatan']]
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
      { wch: 15 },  // NIY/NIP
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
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Ranking Kehadiran</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Pemantauan reputasi dan analisis kepatuhan ketepatan waktu pegawai antar-unit sekolah secara berkala.
            </p>
          </div>
          <nav className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container-lowest shadow-sm w-fit">
            <span className="material-symbols-outlined text-outline text-[16px]">home</span>
            <span className="font-body-sm text-body-sm text-outline">Home</span>
            <span className="material-symbols-outlined text-outline text-[14px]">chevron_right</span>
            <span className="font-body-sm text-body-sm text-outline">Presensi</span>
            <span className="material-symbols-outlined text-outline text-[14px]">chevron_right</span>
            <span className="font-body-sm-medium text-body-sm-medium text-secondary">Ranking Kehadiran</span>
          </nav>
        </div>

        {/* CONTROL TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Segmented Toggle Periode */}
            <div className="flex items-center p-1 rounded-lg bg-surface-container-low">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    setSelectedDateRange(null) // Reset custom date range when tab changes
                  }}
                  className={`px-space-md py-1.5 rounded-md font-body-sm text-body-sm transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
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
                className="h-10 px-space-md flex items-center gap-space-xs rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-secondary text-[18px]">apartment</span>
                <span className="font-body-sm-medium text-body-sm-medium">{selectedUnitOption.label}</span>
                <span className="material-symbols-outlined text-outline text-[18px]">{openUnitMenu ? 'expand_less' : 'expand_more'}</span>
              </button>
              {openUnitMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant overflow-hidden z-10 animate-fade-in">
                  {unitOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        dispatch({ type: 'SET_SELECTED_UNIT', payload: opt.id })
                        setOpenUnitMenu(false)
                      }}
                      className={`w-full px-space-md py-2 text-left font-body-sm text-body-sm transition-colors ${
                        selectedUnit === opt.id
                          ? 'bg-primary-container text-on-primary'
                          : 'text-on-surface hover:bg-surface-container-low'
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
                className="h-10 px-space-md flex items-center gap-space-xs rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{formatDateRange(dateRange)}</span>
                <span className="material-symbols-outlined text-outline text-[18px]">{openDateMenu ? 'expand_less' : 'expand_more'}</span>
              </button>
              {openDateMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant overflow-hidden z-10 animate-fade-in p-2">
                  <div className="px-2 py-1 font-label-sm text-label-sm text-on-surface-variant uppercase">Preset Cepat</div>
                  {['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setActiveTab(preset)
                        setSelectedDateRange(null)
                        setOpenDateMenu(false)
                      }}
                      className={`w-full px-3 py-2 text-left font-body-sm text-body-sm rounded-md transition-colors ${
                        activeTab === preset && !selectedDateRange
                          ? 'bg-primary-container text-on-primary'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                      type="button"
                    >
                      {preset}
                    </button>
                  ))}
                  <div className="border-t border-outline-variant my-1"></div>
                  <div className="px-2 py-1 font-label-sm text-label-sm text-on-surface-variant uppercase">Kustom</div>
                  <div className="px-2 py-2 space-y-2">
                    <div>
                      <label className="block font-body-xs text-body-xs text-on-surface-variant mb-1">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setSelectedDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-md bg-surface-container-lowest border border-outline text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-body-xs text-body-xs text-on-surface-variant mb-1">Tanggal Akhir</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setSelectedDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-md bg-surface-container-lowest border border-outline text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={() => setOpenDateMenu(false)}
                      className="w-full h-9 flex items-center justify-center gap-space-xs rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-body-sm-medium text-body-sm-medium cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Terapkan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex items-center gap-space-sm">
            <button
              onClick={handleExport}
              disabled={!ranking.hasAttendanceData || ranking.totalStaffWithAttendance === 0}
              className={`h-10 px-space-md flex items-center justify-center gap-space-xs rounded-lg transition-all shadow-sm ${
                !ranking.hasAttendanceData || ranking.totalStaffWithAttendance === 0
                  ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed opacity-50'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low cursor-pointer'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">file_download</span>
              <span className="font-body-sm-medium text-body-sm-medium">Export Peringkat (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* MAIN LEADERBOARD SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
          {/* LEFT COLUMN: TOP 10 ON-TIME */}
          <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col gap-space-xs bg-surface-container-lowest">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">military_tech</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Top 10 Paling Tepat Waktu</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant">
                  {ranking.topOnTime.length > 0 && ranking.topOnTime[0].terlambatCount === 0 ? '100% On-Time' : `${ranking.topOnTime.length} Pegawai`}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Pegawai dengan tingkat kedisiplinan dan kepatuhan jam masuk tertinggi
              </p>
            </div>
            <div className="flex flex-col">
              {ranking.topOnTime.length === 0 ? (
                <div className="p-space-lg text-center text-on-surface-variant">
                  {emptyMessage}
                </div>
              ) : (
                ranking.topOnTime.map((item) => (
                  <div
                    key={item.rank}
                    className="p-space-md flex items-center justify-between gap-space-sm bg-surface-container-low/40 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        {item.rank === 1 ? (
                          <span className="material-symbols-outlined text-secondary text-[18px]">workspace_premium</span>
                        ) : (
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{item.rank}</span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium flex items-center justify-center flex-shrink-0">
                        {item.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed">
                            {item.unit}
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.role}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                      <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{item.late}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {item.stat}{item.statSub ? ` (${item.statSub})` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: TOP 10 FREQUENTLY LATE */}
          <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col gap-space-xs bg-surface-container-lowest">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Top 10 Paling Sering Terlambat</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container">
                  Perlu Evaluasi
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Daftar pegawai dengan akumulasi keterlambatan tertinggi periode ini
              </p>
            </div>
            <div className="flex flex-col">
              {ranking.topLate.length === 0 ? (
                <div className="p-space-lg text-center text-on-surface-variant">
                  {emptyMessage}
                </div>
              ) : (
                ranking.topLate.map((item) => (
                  <div
                    key={item.rank}
                    className="p-space-md flex items-center justify-between gap-space-sm bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center flex-shrink-0">
                        {item.rank}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium flex items-center justify-center flex-shrink-0">
                        {item.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed">
                            {item.unit}
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-sm flex-shrink-0">
                      <div className="flex flex-col items-end text-right">
                        <span className={`font-body-sm-medium text-body-sm-medium ${item.rank === 1 ? 'text-error' : 'text-on-surface'}`}>
                          {item.count}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{item.avg}</span>
                      </div>
                      <button
                        className={`h-8 px-2.5 rounded-lg font-body-sm-medium text-body-sm-medium cursor-pointer transition-colors ${
                          item.rank === 1
                            ? 'bg-surface-container-highest text-error hover:bg-error-container'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
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
