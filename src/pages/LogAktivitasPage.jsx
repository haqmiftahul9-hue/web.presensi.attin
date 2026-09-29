import { useState, useEffect, useMemo, useRef } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { initialsOf, selectUnitName, selectCurrentUser, selectCurrentUserRole, hasMenuPermission, selectScopedLogs, selectScopedAdminUsers, selectActiveUnitId } from '../store/simPresStore.jsx'

const actionStyles = {
  tambah: 'bg-blue-50 text-blue-700',
  ubah: 'bg-amber-50 text-amber-800',
  hapus: 'bg-red-50 text-red-700',
  login: 'bg-surface-container text-on-surface-variant',
  reset: 'bg-red-50 text-red-700',
  persetujuan: 'bg-emerald-50 text-emerald-800',
  konfigurasi: 'bg-purple-50 text-purple-700',
}

const actionIcons = {
  tambah: 'add',
  ubah: 'edit',
  hapus: 'delete',
  login: 'login',
  reset: 'lock_reset',
  persetujuan: 'check_circle',
  konfigurasi: 'settings',
}

const actionLabels = {
  tambah: 'Tambah',
  ubah: 'Ubah',
  hapus: 'Hapus',
  login: 'Login',
  reset: 'Reset Password',
  persetujuan: 'Approval',
  konfigurasi: 'Konfigurasi',
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const monthsLong = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatLogDateTime(timeStr) {
  if (!timeStr) return { date: '-', time: '-' }
  
  // Handle both formats: "28 Sep 2026, 10:30" and "28/09/2026, 10:30" and "28 Sep 2026 10:30"
  let datePart = timeStr
  let timePart = ''
  
  if (timeStr.includes(', ')) {
    [datePart, timePart] = timeStr.split(', ')
  } else if (timeStr.includes(' ')) {
    const parts = timeStr.split(' ')
    if (parts.length >= 4) {
      datePart = parts.slice(0, 3).join(' ')
      timePart = parts.slice(3).join(' ')
    }
  }
  
  const dateTokens = datePart.split(/[\s\/]+/)
  let day = dateTokens[0]
  let monthStr = dateTokens[1]
  let year = dateTokens[2]
  
  // Handle numeric month
  let monthIdx = months.indexOf(monthStr)
  if (monthIdx === -1) {
    monthIdx = monthsLong.indexOf(monthStr)
  }
  if (monthIdx === -1 && !isNaN(parseInt(monthStr))) {
    monthIdx = parseInt(monthStr) - 1
  }
  
  const shortMonth = months[monthIdx] || monthStr
  return {
    date: `${day} ${shortMonth} ${year}`,
    time: timePart ? `${timePart.trim()} WIB` : '-',
  }
}

function parseLogDate(timeStr) {
  if (!timeStr) return new Date(0)
  
  let datePart = timeStr
  if (timeStr.includes(', ')) {
    datePart = timeStr.split(', ')[0]
  } else if (timeStr.includes(' ')) {
    const parts = timeStr.split(' ')
    if (parts.length >= 4) {
      datePart = parts.slice(0, 3).join(' ')
    }
  }
  
  const dateTokens = datePart.split(/[\s\/]+/)
  let day = parseInt(dateTokens[0]) || 1
  let monthStr = dateTokens[1]
  let year = parseInt(dateTokens[2]) || new Date().getFullYear()
  
  let month = months.indexOf(monthStr)
  if (month === -1) {
    month = monthsLong.indexOf(monthStr)
  }
  if (month === -1 && !isNaN(parseInt(monthStr))) {
    month = parseInt(monthStr) - 1
  }
  
  return new Date(year, month, day)
}

function isInRange(logTime, range, customStart, customEnd) {
  const now = new Date()
  const logDate = parseLogDate(logTime)
  
  switch (range) {
    case 'today':
      return logDate.toDateString() === now.toDateString()
    case 'weekly': {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      return logDate >= weekAgo && logDate <= now
    }
    case 'monthly': {
      const monthAgo = new Date(now)
      monthAgo.setMonth(now.getMonth() - 1)
      return logDate >= monthAgo && logDate <= now
    }
    case 'custom':
      if (!customStart || !customEnd) return true
      const start = new Date(customStart)
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
      return logDate >= start && logDate <= end
    default:
      return true
  }
}

function truncateText(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

function parseLogDetails(desc) {
  const before = {}
  const after = {}
  
  const patterns = [
    /(\w+(?:\s+\w+)*)\s+dari\s+([^.,]+)\s+menjadi\s+([^.,]+)/gi,
    /(\w+(?:\s+\w+)*)\s*[→\-]\s*([^.,]+)/gi,
    /mengubah\s+(\w+(?:\s+\w+)*)\s+dari\s+([^.,]+)\s+menjadi\s+([^.,]+)/gi,
    /(\w+(?:\s+\w+)*)\s*:\s*([^.,]+)\s*->\s*([^.,]+)/gi,
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(desc)) !== null) {
      const field = match[1].trim()
      const oldVal = match[2]?.trim()
      const newVal = match[3]?.trim()
      if (oldVal && newVal) {
        before[field] = oldVal
        after[field] = newVal
      }
    }
  }
  
  const simplePattern = /(\w+(?:\s+\w+)*)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s*[→\-]\s*(\d+(?:\.\d+)?)\s*(\w+)?/gi
  let match
  while ((match = simplePattern.exec(desc)) !== null) {
    const field = match[1].trim()
    const oldVal = `${match[2]}${match[3] ? ' ' + match[3] : ''}`
    const newVal = `${match[4]}${match[5] ? ' ' + match[5] : ''}`
    before[field] = oldVal
    after[field] = newVal
  }
  
  return { before, after }
}

function LogAktivitasPage() {
  const { state } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentUserRole = selectCurrentUserRole(state)
  const canViewLogs = hasMenuPermission(state, 'logAktivitas')
  const currentUserUnitId = selectActiveUnitId(state)

  // Block access for users without permission (Guru, etc.)
  if (!canViewLogs) {
    return (
      <div className="flex flex-col w-full">
        <div className="px-space-lg py-space-md flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-space-sm">
            <div className="flex flex-col gap-space-2xs">
              <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm tracking-normal">
                <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-on-surface cursor-pointer transition-colors">Pengaturan & Sistem</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-secondary font-body-sm-medium text-body-sm-medium">Log Aktivitas</span>
              </nav>
              <div className="flex items-center gap-space-xs mt-1">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-tight">Log Aktivitas</h1>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl leading-relaxed">
                Anda tidak memiliki akses untuk melihat halaman ini.
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">lock</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mt-3">Akses Ditolak</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-md">
                Hanya Superadmin dan Admin Unit yang dapat mengakses Log Aktivitas.
                Role Anda (<strong>{currentUserRole}</strong>) tidak memiliki izin untuk melihat log sistem.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('monthly')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const dateRangeDropdownRef = useRef(null)
  const customDatePickerRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const openDetailModal = (log) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setSelectedLog(null)
    setShowDetailModal(false)
  }

  const getDetailLogData = () => {
    if (!selectedLog) return null
    const { date, time } = formatLogDateTime(selectedLog.time)
    const unitName = selectedLog.unit || '-'
    const { before, after } = parseLogDetails(selectedLog.desc)
    const roleBadgeClass = selectedLog.role === 'Superadmin' ? 'bg-purple-50 text-purple-700' : 
                           selectedLog.role === 'Admin Unit' ? 'bg-blue-50 text-blue-700' : 
                           selectedLog.role === 'Sistem' ? 'bg-surface-container text-on-surface' : 'bg-slate-50 text-slate-700'
    return { date, time, unitName, before, after, roleBadgeClass }
  }

  // Close date range dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(event.target)) {
        setShowDateRangeDropdown(false)
      }
      if (customDatePickerRef.current && !customDatePickerRef.current.contains(event.target)) {
        setShowCustomDatePicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getDateRangeLabel = (range) => {
    const labels = { today: 'Hari Ini', weekly: 'Mingguan', monthly: 'Bulanan', custom: 'Custom Tanggal' }
    return labels[range] || range
  }

  // Log mengikuti unit terpilih (Superadmin) atau unit akun (role lain).
  const unitAdminUsers = useMemo(
    () => selectScopedAdminUsers(state),
    [state],
  )

  const roleFilteredLogs = useMemo(() => selectScopedLogs(state), [state])

  const logs = useMemo(() => roleFilteredLogs.map((log, idx) => ({
    id: log.id,
    time: log.time,
    initials: initialsOf(log.actor),
    name: log.actor,
    role: log.role,
    roleColor: log.role === 'Superadmin' ? 'text-secondary' : 'text-on-surface-variant',
    action: log.action,
    actionType: log.action.toLowerCase().includes('tambah') ? 'tambah' : 
              log.action.toLowerCase().includes('hapus') ? 'hapus' : 
              log.action.toLowerCase().includes('reset') ? 'reset' : 
              log.action.toLowerCase().includes('login') ? 'login' : 
              log.action.toLowerCase().includes('persetujuan') || log.action.toLowerCase().includes('setujui') ? 'persetujuan' :
              log.action.toLowerCase().includes('konfigurasi') || log.action.toLowerCase().includes('ubah') ? 'konfigurasi' : 'ubah',
    target: log.target.includes('Unit') ? 'Pengaturan Unit' : 
            log.target.includes('Pegawai') ? 'Data Pegawai' : 
            log.target.includes('Cuti') ? 'Pengajuan Cuti' : 
            log.target.includes('Akun') || log.target.includes('Sesi') ? 'Akun Pengguna' : 'Jadwal Shift',
    targetSub: log.target.includes('•') ? log.target.split('•')[1].trim() : log.target,
    desc: log.desc,
  })), [state.logs])

  const now = new Date()
  const todayStr = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`

  const logsToday = useMemo(() => logs.filter(row => row.time.startsWith(todayStr)), [logs])
  
  const filteredDataToday = useMemo(() => {
    return logsToday.filter((row) => {
      if (selectedUser && row.name !== selectedUser) return false
      if (selectedAction && row.actionType !== selectedAction) return false
      if (search) {
        const term = search.toLowerCase()
        if (!row.name.toLowerCase().includes(term) &&
            !row.target.toLowerCase().includes(term) &&
            !row.action.toLowerCase().includes(term) &&
            !row.desc.toLowerCase().includes(term)) {
          return false
        }
      }
      return true
    })
  }, [logsToday, search, selectedUser, selectedAction])

  const filteredData = useMemo(() => {
    return logs.filter((row) => {
      if (!isInRange(row.time, dateRange, customStart, customEnd)) return false
      if (selectedUser && row.name !== selectedUser) return false
      if (selectedAction && row.actionType !== selectedAction) return false
      if (search) {
        const term = search.toLowerCase()
        if (!row.name.toLowerCase().includes(term) &&
            !row.target.toLowerCase().includes(term) &&
            !row.action.toLowerCase().includes(term) &&
            !row.desc.toLowerCase().includes(term)) {
          return false
        }
      }
      return true
    })
  }, [logs, search, dateRange, customStart, customEnd, selectedUser, selectedAction])

  const totalLogHariIni = filteredDataToday.length

  const userCounts = useMemo(() => filteredData.reduce((acc, row) => {
    acc[row.name] = (acc[row.name] || 0) + 1
    return acc
  }, {}), [filteredData])
  const topUser = useMemo(() => Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0], [userCounts])

  const RETENSI_HARI = 365

  const clearFilters = () => {
    setSearch('')
    setDateRange('monthly')
    setCustomStart('')
    setCustomEnd('')
    setSelectedUser('')
    setSelectedAction('')
  }

  const hasActiveFilters = search || dateRange !== 'monthly' || selectedUser || selectedAction || customStart || customEnd

  const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const handleExportCSV = () => {
    const now = new Date()
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
    const filename = `Log_Aktivitas_SimPres_${dateStr}.csv`

    const headers = ['No', 'Tanggal', 'Waktu', 'User', 'Role', 'Unit', 'Jenis Aksi', 'Target/Objek', 'Keterangan']

    const rows = filteredData.map((row, idx) => {
      const { date, time } = formatLogDateTime(row.time)
      const unitName = row.unit || '-'
      const displayAction = actionLabels[row.actionType] || row.action
      
      return [
        idx + 1,
        date,
        time,
        row.name,
        row.role,
        unitName,
        displayAction,
        row.targetSub || row.target,
        row.desc
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const detailData = getDetailLogData()

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="px-space-lg py-space-md flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-space-sm">
            <div className="flex flex-col gap-space-2xs">
              <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm tracking-normal">
                <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-on-surface cursor-pointer transition-colors">Pengaturan & Sistem</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-secondary font-body-sm-medium text-body-sm-medium">Log Aktivitas</span>
              </nav>
              <div className="flex items-center gap-space-xs mt-1">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-tight">Log Aktivitas</h1>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl leading-relaxed">
                Rekam jejak seluruh aktivitas sistem, perubahan data master, konfigurasi unit, dan autentikasi pengguna secara real-time.
              </p>
            </div>
            <div className="flex items-center gap-space-xs flex-shrink-0 self-start md:self-auto">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-10 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5 shadow-sm font-body-sm text-body-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">filter_alt_off</span>
                <span>Bersihkan Filter</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="h-10 px-space-md rounded-lg bg-primary-container hover:bg-primary text-on-primary transition-colors flex items-center gap-2 shadow-sm font-body-sm text-body-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export Log (.CSV)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">trending_up</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Total Log Hari Ini</span>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">{totalLogHariIni} Catatan</span>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Hari ini</span>
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">User Teraktif</span>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">{topUser ? `${topUser[0].split(',')[0]} (${topUser[1]}x)` : '-'}</span>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">Terbanyak</span>
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">security_update_good</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Kebijakan Retensi</span>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">{RETENSI_HARI} Hari Penyimpanan</span>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Auto-purge</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-space-xs">
            <div className="relative min-w-[220px]" ref={dateRangeDropdownRef}>
              <button
                onClick={() => setShowDateRangeDropdown(prev => !prev)}
                className="w-full h-10 px-space-sm bg-surface-container-low rounded-lg text-on-surface cursor-pointer hover:bg-surface-container transition-colors flex items-center gap-2 shadow-sm font-body-sm text-body-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">calendar_today</span>
                <div className="flex flex-col text-left">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider leading-tight">Rentang Tanggal</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface leading-tight mt-0.5">
                    {dateRange === 'custom' 
                      ? `${customStart ? new Date(customStart).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : 'Mulai'} - ${customEnd ? new Date(customEnd).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : 'Selesai'}`
                      : getDateRangeLabel(dateRange)
                    }
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px] ml-auto">arrow_drop_down</span>
              </button>
              {showDateRangeDropdown && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-lg shadow-lg border border-outline/30 py-1 z-10">
                  {['today', 'weekly', 'monthly', 'custom'].map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range)
                        if (range !== 'custom') { 
                          setCustomStart(''); 
                          setCustomEnd('') 
                          setShowCustomDatePicker(false)
                        } else {
                          setShowCustomDatePicker(true)
                        }
                        setShowDateRangeDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${dateRange === range ? 'bg-secondary/10 text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                      type="button"
                    >
                      {getDateRangeLabel(range)}
                    </button>
                  ))}
                </div>
              )}
              {showCustomDatePicker && (
                <div ref={customDatePickerRef} className="absolute left-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-lg shadow-lg border border-outline/30 py-2 z-10">
                  <div className="p-2 border-b border-outline/20">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tanggal Mulai</span>
                    <input
                      type="date"
                      className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest mt-1"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div className="p-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tanggal Akhir</span>
                    <input
                      type="date"
                      className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest mt-1"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="relative min-w-[180px]">
              <select
                className="w-full h-10 appearance-none pl-space-sm pr-8 bg-surface-container-low text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg focus:outline-none focus:bg-surface-container cursor-pointer transition-colors"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Semua User</option>
                {unitAdminUsers.map((u) => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative min-w-[150px]">
              <select
                className="w-full h-10 appearance-none pl-space-sm pr-8 bg-surface-container-low text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg focus:outline-none focus:bg-surface-container cursor-pointer transition-colors"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
              >
                <option value="">Semua Aksi</option>
                <option value="tambah">Tambah</option>
                <option value="ubah">Ubah</option>
                <option value="hapus">Hapus</option>
                <option value="login">Login</option>
                <option value="reset">Reset Password</option>
                <option value="persetujuan">Approval</option>
                <option value="konfigurasi">Konfigurasi</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="w-full h-10 pl-9 pr-space-md bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-lg focus:outline-none focus:bg-surface-container transition-colors"
                placeholder="Cari target objek, user, atau keterangan..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left font-body-md text-body-md border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider h-11 border-b border-outline/20">
                    <th className="py-2.5 px-space-md w-[160px]" scope="col">Waktu & Tanggal</th>
                    <th className="py-2.5 px-space-sm w-[260px]" scope="col">User Pelaksana</th>
                    <th className="py-2.5 px-space-sm w-[140px]" scope="col">Jenis Aksi</th>
                    <th className="py-2.5 px-space-sm w-[250px]" scope="col">Target / Objek</th>
                    <th className="py-2.5 px-space-md" scope="col">Keterangan Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface divide-y divide-surface-container-low">
                  {paginatedData.map((row, idx) => {
                    const { date, time } = formatLogDateTime(row.time)
                    const displayAction = actionLabels[row.actionType] || row.action
                    return (
                      <tr 
                        key={row.id} 
                        className={`${idx % 2 === 1 ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest'} hover:bg-surface-container-low/60 transition-colors duration-150 cursor-pointer`}
                        onClick={() => openDetailModal(row)}
                      >
                        <td className="py-3 px-space-md whitespace-nowrap">
                          <div className="flex flex-col items-start gap-0.5 text-on-surface">
                            <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{date}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{time}</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <div className="flex items-center gap-space-xs">
                            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium flex items-center justify-center flex-shrink-0">
                              {row.initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate max-w-xs">{row.name}</span>
                              <span className={`font-label-sm text-label-sm ${row.roleColor} leading-tight`}>{row.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium tracking-tight ${actionStyles[row.actionType]}`}>
                            <span className="material-symbols-outlined text-[13px]">{actionIcons[row.actionType]}</span>
                            <span>{displayAction}</span>
                          </span>
                        </td>
                        <td className="py-3 px-space-sm">
                          <div className="flex flex-col min-w-0">
                            <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate max-w-xs">{row.target}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-xs">{row.targetSub}</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="relative max-w-lg">
                            <p className="font-body-sm text-body-sm text-on-surface leading-relaxed truncate" title={row.desc}>
                              {truncateText(row.desc, 100)}
                            </p>
                            {row.desc.length > 100 && (
                              <div className="absolute bottom-full left-0 mb-1 z-10 w-80 bg-surface-container-lowest rounded-lg shadow-lg border border-outline/20 p-3 hidden group-hover:block">
                                <p className="font-body-sm text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">{row.desc}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-space-md py-space-sm bg-surface-container-lowest border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-md">
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Menampilkan <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">{filteredData.length}</span> catatan log
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Baris per halaman:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                    className="h-8 px-2 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded border border-outline/30 focus:outline-none focus:ring-2 focus:ring-secondary/20 cursor-pointer"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 font-label-sm text-label-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>Sebelumnya</span>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-body-sm-medium text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer ${
                        pageNum === currentPage
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                      type="button"
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && (
                  <>
                    <span className="w-6 text-center font-label-sm text-label-sm text-on-surface-variant tracking-widest">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-sm-medium text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer"
                      type="button"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors flex items-center gap-1 font-label-sm text-label-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span>Berikutnya</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showDetailModal && selectedLog && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={closeDetailModal}>
          <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-space-lg py-space-md border-b border-outline/20 flex items-center justify-between bg-surface-container/50">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-primary leading-snug">Detail Log Aktivitas</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Informasi lengkap aktivitas sistem</p>
              </div>
              <button onClick={closeDetailModal} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg overflow-y-auto space-y-space-md">
              <div className="bg-surface-container-low rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">ID Log</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface font-mono mt-0.5">{selectedLog.id}</p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Waktu</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">{detailData.date} • {detailData.time}</p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">User</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">{selectedLog.name}</p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Role</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${detailData.roleBadgeClass}`}>
                        {selectedLog.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Unit</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">{detailData.unitName}</p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Jenis Aktivitas</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-medium tracking-tight ${actionStyles[selectedLog.actionType]}`}>
                        <span className="material-symbols-outlined text-[13px]">{actionIcons[selectedLog.actionType]}</span>
                        <span>{actionLabels[selectedLog.actionType] || selectedLog.action}</span>
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Target</span>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface mt-0.5">{selectedLog.target}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Data Sebelum Perubahan</span>
                    <div className="mt-1 p-3 bg-surface-container-lowest rounded border border-outline/20 max-h-40 overflow-y-auto">
                      {Object.keys(detailData.before).length > 0 ? (
                        <dl className="space-y-1">
                          {Object.entries(detailData.before).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2 text-sm">
                              <dt className="font-label-sm text-label-sm text-on-surface-variant">{key}</dt>
                              <dd className="font-body-sm-medium text-body-sm-medium text-on-surface font-mono">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="font-body-sm text-body-sm text-on-surface-variant italic">Tidak ada data perubahan tercatat</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Data Sesudah Perubahan</span>
                    <div className="mt-1 p-3 bg-surface-container-lowest rounded border border-outline/20 max-h-40 overflow-y-auto">
                      {Object.keys(detailData.after).length > 0 ? (
                        <dl className="space-y-1">
                          {Object.entries(detailData.after).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2 text-sm">
                              <dt className="font-label-sm text-label-sm text-on-surface-variant">{key}</dt>
                              <dd className="font-body-sm-medium text-body-sm-medium text-on-surface font-mono">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="font-body-sm text-body-sm text-on-surface-variant italic">Tidak ada data perubahan tercatat</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Keterangan Lengkap</span>
                    <p className="font-body-sm text-body-sm text-on-surface mt-1 whitespace-pre-wrap bg-surface-container-lowest p-3 rounded border border-outline/20">{selectedLog.desc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex justify-end">
              <button onClick={closeDetailModal} className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium transition-colors cursor-pointer" type="button">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LogAktivitasPage