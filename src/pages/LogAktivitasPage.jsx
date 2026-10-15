import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSimPres } from '../store/simPresStore.jsx'
import { initialsOf, selectUnitName, selectCurrentUser, selectCurrentUserRole, hasMenuPermission, selectScopedLogs, selectScopedAdminUsers, selectActiveUnitId } from '../store/simPresStore.jsx'

const actionStyles = {
  tambah: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  ubah: 'bg-amber-50 text-amber-800 border border-amber-200/80',
  hapus: 'bg-rose-50 text-rose-700 border border-rose-200/80',
  login: 'bg-slate-100 text-slate-700 border border-slate-200',
  reset: 'bg-red-50 text-red-700 border border-red-200/80',
  persetujuan: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
  konfigurasi: 'bg-purple-50 text-purple-700 border border-purple-200/80',
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

/**
 * Ambil nilai sebelum/sesudah dari satu baris log.
 *
 * Log baru (mis. ubah profil dari mobile) menyimpan `perubahan` sebagai data
 * terstruktur, jadi nilainya dibaca langsung — akurat, tanpa tebakan. Log lama
 * hanya punya kalimat `desc`, untuk itu pola regex lama tetap dipakai sebagai
 * cadangan.
 */
function parseLogDetailsFromRow(log) {
  if (Array.isArray(log?.perubahan) && log.perubahan.length > 0) {
    const before = {}
    const after = {}
    for (const p of log.perubahan) {
      if (!p || !p.field) continue
      before[p.label || p.field] = p.sebelum ?? '(kosong)'
      after[p.label || p.field] = p.sesudah ?? '(kosong)'
    }
    return { before, after }
  }
  return parseLogDetails(log?.desc || '')
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <nav className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="hover:text-slate-700 cursor-pointer transition-colors">Home</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-slate-700 cursor-pointer transition-colors">Pengaturan & Sistem</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-800 font-semibold">Log Aktivitas</span>
              </nav>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Log Aktivitas</h1>
              </div>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Anda tidak memiliki akses untuk melihat halaman ini.
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs flex items-center justify-center min-h-[320px]">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[28px]">lock</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Akses Ditolak</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hanya Superadmin dan Admin Unit yang dapat mengakses Log Aktivitas.
                Role Anda (<strong className="text-slate-800">{currentUserRole}</strong>) tidak memiliki izin untuk melihat log audit sistem.
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
  // Menu "Aktivitas Saya" membuka halaman ini dengan ?pengguna=<nama akun>,
  // sehingga tabel langsung tersaring ke aktivitas akun itu sendiri.
  const [searchParams] = useSearchParams()
  const actorFromQuery = searchParams.get('pengguna') || ''
  const [selectedUser, setSelectedUser] = useState(actorFromQuery)
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const dateRangeDropdownRef = useRef(null)
  const customDatePickerRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Berpindah dari menu pengguna ke halaman yang sudah terbuka harus ikut
  // menyaring ke akun yang baru dipilih.
  useEffect(() => {
    if (actorFromQuery) {
      setSelectedUser(actorFromQuery)
      setCurrentPage(1)
    }
  }, [actorFromQuery])

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
    const { before, after } = parseLogDetailsFromRow(selectedLog)
    const roleBadgeClass = selectedLog.role === 'Superadmin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                           selectedLog.role === 'Admin Unit' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                           selectedLog.role === 'Sistem' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-700 border-slate-200'
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
            log.target.includes('Akun') || log.target.includes('Sesi') ? 'Akun Pengguna' : 'Jam Kerja',
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <span className="material-symbols-outlined text-[20px] leading-none">history</span>
                </span>
                Log Aktivitas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Rekam jejak seluruh aktivitas sistem, perubahan data master, konfigurasi unit, dan autentikasi pengguna secara real-time.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto flex-wrap">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-400">filter_alt_off</span>
                <span>Bersihkan Filter</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs text-xs font-semibold cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Export Log (.CSV)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">trending_up</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Log Hari Ini</span>
                  <span className="text-lg font-bold text-slate-900 leading-snug">{totalLogHariIni} Catatan</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Hari ini</span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User Teraktif</span>
                  <span className="text-lg font-bold text-slate-900 leading-snug truncate max-w-[160px]">{topUser ? `${topUser[0].split(',')[0]} (${topUser[1]}x)` : '-'}</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Terbanyak</span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">security_update_good</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kebijakan Retensi</span>
                  <span className="text-lg font-bold text-slate-900 leading-snug">{RETENSI_HARI} Hari</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Auto-purge</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            <div className="relative min-w-[200px]" ref={dateRangeDropdownRef}>
              <button
                onClick={() => setShowDateRangeDropdown(prev => !prev)}
                className="w-full h-9 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 cursor-pointer transition-colors flex items-center justify-between text-xs font-medium"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                  <span>
                    {dateRange === 'custom' 
                      ? `${customStart ? new Date(customStart).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : 'Mulai'} - ${customEnd ? new Date(customEnd).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : 'Selesai'}`
                      : getDateRangeLabel(dateRange)
                    }
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[16px]">arrow_drop_down</span>
              </button>
              {showDateRangeDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 animate-fade-in">
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
                      className={`w-full px-3.5 py-2 text-left text-xs transition-colors ${dateRange === range ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                      type="button"
                    >
                      {getDateRangeLabel(range)}
                    </button>
                  ))}
                </div>
              )}
              {showCustomDatePicker && (
                <div ref={customDatePickerRef} className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-20 animate-fade-in space-y-2">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Tanggal Mulai</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-1">Tanggal Akhir</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="relative min-w-[180px]">
              <select
                className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer transition-colors"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Semua User</option>
                {unitAdminUsers.map((u) => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[150px]">
              <select
                className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer transition-colors"
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
            </div>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 text-xs rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                placeholder="Cari target objek, user, atau keterangan..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="sp-table-wrap w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold text-[11px] uppercase tracking-wider h-11 border-b border-slate-200/80">
                    <th className="py-3 px-4 w-[160px]" scope="col">Waktu & Tanggal</th>
                    <th className="py-3 px-3.5 w-[260px]" scope="col">User Pelaksana</th>
                    <th className="py-3 px-3.5 w-[140px]" scope="col">Jenis Aksi</th>
                    <th className="py-3 px-3.5 w-[250px]" scope="col">Target / Objek</th>
                    <th className="py-3 px-4" scope="col">Keterangan Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row) => {
                    const { date, time } = formatLogDateTime(row.time)
                    const displayAction = actionLabels[row.actionType] || row.action
                    return (
                      <tr 
                        key={row.id} 
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() => openDetailModal(row)}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold text-slate-900">{date}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5">{time}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {row.initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 truncate max-w-xs">{row.name}</span>
                              <span className="text-[11px] font-medium text-slate-500">{row.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${actionStyles[row.actionType]}`}>
                            <span className="material-symbols-outlined text-[13px]">{actionIcons[row.actionType]}</span>
                            <span>{displayAction}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 truncate max-w-xs">{row.target}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">{row.targetSub}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-600 leading-relaxed truncate max-w-lg" title={row.desc}>
                            {truncateText(row.desc, 100)}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400">Tidak ada data log yang sesuai</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  Menampilkan <span className="font-semibold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-semibold text-blue-600">{filteredData.length}</span> catatan log
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Baris per halaman:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                    className="h-7 px-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-md focus:bg-white focus:border-blue-500 cursor-pointer"
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
                  className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors flex items-center gap-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      type="button"
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && (
                  <span className="w-6 text-center text-slate-400">...</span>
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors flex items-center gap-1 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={closeDetailModal}>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Detail Log Aktivitas</h2>
                <p className="text-xs text-slate-500 mt-0.5">Informasi lengkap aktivitas sistem</p>
              </div>
              <button onClick={closeDetailModal} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/60 p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ID Log</span>
                    <p className="font-mono text-slate-800 font-medium mt-0.5">{selectedLog.id}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Waktu</span>
                    <p className="text-slate-800 font-medium mt-0.5">{detailData.date} • {detailData.time}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</span>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedLog.name}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</span>
                    <p className="mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${detailData.roleBadgeClass}`}>
                        {selectedLog.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unit</span>
                    <p className="text-slate-800 font-medium mt-0.5">{detailData.unitName}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Jenis Aktivitas</span>
                    <p className="mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${actionStyles[selectedLog.actionType]}`}>
                        <span className="material-symbols-outlined text-[13px]">{actionIcons[selectedLog.actionType]}</span>
                        <span>{actionLabels[selectedLog.actionType] || selectedLog.action}</span>
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target</span>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedLog.target}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Data Sebelum Perubahan</span>
                    <div className="mt-1 p-3 bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {Object.keys(detailData.before).length > 0 ? (
                        <dl className="space-y-1">
                          {Object.entries(detailData.before).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2 text-xs">
                              <dt className="text-slate-500">{key}</dt>
                              <dd className="font-mono text-slate-800 font-medium">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada data perubahan tercatat</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Data Sesudah Perubahan</span>
                    <div className="mt-1 p-3 bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {Object.keys(detailData.after).length > 0 ? (
                        <dl className="space-y-1">
                          {Object.entries(detailData.after).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2 text-xs">
                              <dt className="text-slate-500">{key}</dt>
                              <dd className="font-mono text-slate-800 font-medium">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada data perubahan tercatat</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Keterangan Lengkap</span>
                    <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200">{selectedLog.desc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button onClick={closeDetailModal} className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer" type="button">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LogAktivitasPage