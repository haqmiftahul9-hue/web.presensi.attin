import { createContext, useContext, useReducer, useMemo } from 'react'
import {
  UNITS, STAFF, LEAVES, ADMIN_USERS, INITIAL_LOGS,
  INITIAL_SETTINGS, WEEKLY_TREND, TREND_30, HOLIDAYS, buildFullStaff, buildAttendance, initialsOf,
} from '../data/seed.js'

// ARSITEKTUR SATU SUMBER DATA:
// - Entitas kanonis hanya disimpan sekali (staff/units/leaves/adminUsers/logs/settings).
// - Presensi (attendance) BUKAN salinan tersimpan, melainkan TURUNAN dari state.staff
//   yang dibangun ulang setiap perubahan, sehingga tidak pernah bisa stale/sinkron.

export const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete']

export const PERMISSION_MATRIX = {
  Superadmin: {
    dashboard: ['view', 'add', 'edit', 'delete'],
    manajemenUnit: ['view', 'add', 'edit', 'delete'],
    manajemenAdminUser: ['view', 'add', 'edit', 'delete'],
    dataGuruPegawai: ['view', 'add', 'edit', 'delete'],
    presensi: ['view', 'add', 'edit', 'delete'],
    rekapLaporan: ['view', 'add', 'edit', 'delete'],
    rankingKehadiran: ['view', 'add', 'edit', 'delete'],
    pengajuanIzinCuti: ['view', 'add', 'edit', 'delete'],
    logAktivitas: ['view', 'add', 'edit', 'delete'],
    pengaturanGlobal: ['view', 'add', 'edit', 'delete'],
  },
  'Admin Unit': {
    dashboard: ['view'],
    manajemenUnit: [],
    manajemenAdminUser: [],
    dataGuruPegawai: ['view', 'add', 'edit'],
    presensi: ['view', 'add', 'edit'],
    rekapLaporan: ['view'],
    rankingKehadiran: ['view'],
    pengajuanIzinCuti: ['view', 'add', 'edit'],
    logAktivitas: ['view'],
    pengaturanGlobal: [],
  },
  Guru: {
    dashboard: ['view'],
    manajemenUnit: [],
    manajemenAdminUser: [],
    dataGuruPegawai: ['view'],
    presensi: ['view'],
    rekapLaporan: ['view'],
    rankingKehadiran: ['view'],
    pengajuanIzinCuti: ['view', 'add'],
    logAktivitas: [],
    pengaturanGlobal: [],
  },
  'Petugas Presensi': {
    dashboard: ['view'],
    manajemenUnit: [],
    manajemenAdminUser: [],
    dataGuruPegawai: ['view'],
    presensi: ['view', 'add', 'edit'],
    rekapLaporan: ['view'],
    rankingKehadiran: ['view'],
    pengajuanIzinCuti: ['view'],
    logAktivitas: ['view'],
    pengaturanGlobal: [],
  },
}

// Hanya Superadmin yang boleh berpindah unit. Role lain terkunci ke unit akunnya.
export const ROLE_SUPERADMIN = 'Superadmin'
export const ROLE_ADMIN_UNIT = 'Admin Unit'
export const ROLE_GURU = 'Guru'
export const ROLE_PETUGAS_PRESENSI = 'Petugas Presensi'

// Nilai khusus "melihat seluruh unit" (hanya Superadmin).
export const ALL_UNITS = 'all'

const initialStaff = buildFullStaff()

function buildInitialAttendanceHistory(staff, trend30) {
  const history = []
  const activeStaff = staff.filter(s => s.status === 'Aktif')
  
  // Use last 30 days of trend data to generate per-staff history
  trend30.forEach((day, dayIndex) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - dayIndex))
    const dateStr = date.toISOString().split('T')[0]
    
    const hadirTarget = day.hadir
    const terlambatTarget = day.terlambat
    
    // Shuffle staff for this day
    const shuffled = [...activeStaff].sort(() => Math.random() - 0.5)
    let hadirCount = 0
    let terlambatCount = 0
    
    shuffled.forEach((staffMember, idx) => {
      if (hadirCount >= hadirTarget) return
      
      const isHadir = true
      hadirCount++
      
      // Determine if late based on target
      const isLate = terlambatCount < terlambatTarget && Math.random() < 0.3
      if (isLate) terlambatCount++
      
      const unit = UNITS.find(u => u.id === staffMember.unitId)
      const unitEntryHour = unit ? parseInt(unit.masuk.split(':')[0]) : 7
      const unitEntryMin = unit ? parseInt(unit.masuk.split(':')[1]) : 0
      const unitEntryMinutes = unitEntryHour * 60 + unitEntryMin
      
      let masukTime = '07:00'
      let lateMinutes = 0
      let method = 'Face Recognition'
      
      if (isLate) {
        lateMinutes = 5 + Math.floor(Math.random() * 25)
        const arrivalMinutes = unitEntryMinutes + lateMinutes
        const arrivalHour = Math.floor(arrivalMinutes / 60)
        const arrivalMin = arrivalMinutes % 60
        masukTime = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`
      } else {
        const earlyMinutes = Math.floor(Math.random() * 20)
        const arrivalMinutes = unitEntryMinutes - earlyMinutes
        const arrivalHour = Math.floor(arrivalMinutes / 60)
        const arrivalMin = arrivalMinutes % 60
        masukTime = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`
      }
      
      if (Math.random() < 0.4) method = 'QR Code'
      
      history.push({
        id: Date.now() + dayIndex * 10000 + idx,
        date: dateStr,
        staffId: staffMember.id,
        name: staffMember.name,
        niy: staffMember.niy,
        role: staffMember.role,
        unitId: staffMember.unitId,
        masuk: masukTime,
        method,
        late: lateMinutes,
        status: lateMinutes > 0 ? 'Terlambat' : 'Tepat Waktu',
      })
    })
  })
  
  return history
}

const initialAttendanceHistory = buildInitialAttendanceHistory(initialStaff, TREND_30)

// Unit awal untuk sebuah akun: Superadmin mulai dari "Semua Unit",
// role lain langsung terkunci ke unit yang melekat pada akunnya.
export function initialUnitScope(user) {
  if (!user) return ALL_UNITS
  if (user.role === ROLE_SUPERADMIN) return ALL_UNITS
  return user.unitId || ALL_UNITS
}

const initialState = {
  staff: initialStaff,
  units: UNITS,
  leaves: LEAVES,
  adminUsers: ADMIN_USERS,
  logs: INITIAL_LOGS,
  settings: INITIAL_SETTINGS,
  weeklyTrend: WEEKLY_TREND,
  trend30: TREND_30,
  holidays: HOLIDAYS,
  permissionMatrix: PERMISSION_MATRIX,
  currentUser: ADMIN_USERS[0],
  attendanceHistory: initialAttendanceHistory,
  // Unit yang sedang dilihat. Hanya Superadmin yang boleh mengubahnya
  // (termasuk ke "Semua Unit"); role lain selalu mengikuti unit akunnya.
  selectedUnitId: initialUnitScope(ADMIN_USERS[0]),
}

function simPresReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_LEAVE_STATUS':
      return {
        ...state,
        leaves: state.leaves.map((l) =>
          l.id === action.id ? { ...l, status: action.status } : l,
        ),
      }
    case 'ADD_LEAVE':
      return { ...state, leaves: [...state.leaves, action.payload] }
    case 'UPDATE_STAFF':
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s,
        ),
        adminUsers: syncAdminUserFromStaff(state.adminUsers, action.payload),
      }
    case 'ADD_STAFF': {
      // Id yang bentrok (mis. impor massal) selalu digenerate ulang dari data
      // yang ada, supaya tidak pernah menimpa pegawai lain.
      const staffToAdd = state.staff.some((s) => s.id === action.payload.id)
        ? { ...action.payload, id: nextIdFrom(state.staff) }
        : action.payload
      return {
        ...state,
        staff: [...state.staff, staffToAdd],
        adminUsers: syncAdminUserFromStaff(state.adminUsers, staffToAdd, 'add'),
      };
    }
    case 'DELETE_STAFF':
      const staffId = action.payload;
      const staffToDelete = state.staff.find((s) => s.id === staffId);
      const niyToDelete = staffToDelete?.niy;
      return {
        ...state,
        staff: state.staff.filter((s) => s.id !== staffId),
        adminUsers: niyToDelete 
          ? state.adminUsers.filter((u) => u.niy !== niyToDelete)
          : state.adminUsers,
      };
    case 'UPDATE_UNIT':
      return {
        ...state,
        units: state.units.map((u) =>
          u.id === action.payload.id ? { ...u, ...action.payload } : u,
        ),
      }
    case 'ADD_UNIT':
      return {
        ...state,
        units: [...state.units, action.payload],
      }
    case 'DELETE_UNIT':
      return {
        ...state,
        units: state.units.filter((u) => u.id !== action.payload),
        staff: state.staff.filter((s) => s.unitId !== action.payload),
      }
    case 'UPDATE_ATTENDANCE':
      // Tulis-langsung ke sumber data (staff); attendance adalah turunan.
      const staffForUpdate = state.staff.find(s => s.id === action.payload.id)
      const historyEntryUpdate = staffForUpdate ? {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        staffId: action.payload.id,
        name: staffForUpdate.name,
        niy: staffForUpdate.niy,
        role: staffForUpdate.role,
        unitId: staffForUpdate.unitId,
        masuk: action.payload.masuk ?? staffForUpdate.masuk,
        method: action.payload.method ?? staffForUpdate.method,
        late: action.payload.late ?? staffForUpdate.late ?? 0,
        status: action.payload.masuk ? (action.payload.late > 0 ? 'Terlambat' : 'Tepat Waktu') : 'Belum Presensi',
      } : null
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id
            ? {
                ...s,
                ...(action.payload.masuk !== undefined ? { masuk: action.payload.masuk } : {}),
                ...(action.payload.method !== undefined ? { method: action.payload.method } : {}),
                ...(action.payload.late !== undefined ? { late: action.payload.late } : {}),
              }
            : s,
        ),
        logs: [
          {
            id: Date.now(),
            time: new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            actor: 'Sistem Presensi',
            role: 'Sistem',
            action: 'Presensi',
            target: `Pegawai • ${state.staff.find(s => s.id === action.payload.id)?.name || 'N/A'}`,
            desc: `Presensi ${action.payload.method || 'manual'} ${action.payload.masuk ? `pukul ${action.payload.masuk} WIB` : ''}${action.payload.late ? ` (terlambat ${action.payload.late} menit)` : ''}`,
          },
          ...state.logs,
        ],
        attendanceHistory: historyEntryUpdate ? [historyEntryUpdate, ...state.attendanceHistory] : state.attendanceHistory,
      }
    case 'ADD_ATTENDANCE':
      // Presensi baru = pegawai baru pada sumber data staff.
      const historyEntryAdd = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        staffId: action.payload.staffId ?? action.payload.id,
        name: action.payload.name,
        niy: action.payload.niy,
        role: action.payload.role,
        unitId: action.payload.unitId,
        masuk: action.payload.masuk ?? null,
        method: action.payload.method ?? null,
        late: action.payload.late ?? 0,
        status: action.payload.masuk ? (action.payload.late > 0 ? 'Terlambat' : 'Tepat Waktu') : 'Belum Presensi',
      }
      return {
        ...state,
        staff: [
          ...state.staff,
          {
            id: action.payload.staffId ?? action.payload.id,
            niy: action.payload.niy,
            name: action.payload.name,
            role: action.payload.role,
            unitId: action.payload.unitId,
            status: 'Aktif',
            masuk: action.payload.masuk ?? null,
            method: action.payload.method ?? null,
            late: action.payload.late ?? 0,
            ...(action.payload.alpha ? { alpha: true } : {}),
            ...(action.payload.outsideRadius ? { outsideRadius: true } : {}),
          },
        ],
logs: [
            {
              id: Date.now(),
              time: new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              actor: action.payload.name,
              role: 'Sistem',
              unit: state.units.find(u => u.id === action.payload.unitId)?.nama || '-',
              action: 'Presensi',
              target: `Pegawai • ${action.payload.name}`,
              desc: `Presensi ${action.payload.method || 'manual'} ${action.payload.masuk ? `pukul ${action.payload.masuk} WIB` : ''}${action.payload.late ? ` (terlambat ${action.payload.late} menit)` : ''}`,
            },
            ...state.logs,
          ],
        attendanceHistory: [historyEntryAdd, ...state.attendanceHistory],
      }
    case 'CHECK_IN':
      // Cukup tulis ke staff; attendance ter-derive otomatis (satu sumber data).
      const staffForLog = state.staff.find(s => s.id === action.payload.id)
      const historyEntryCheckIn = staffForLog ? {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        staffId: action.payload.id,
        name: staffForLog.name,
        niy: staffForLog.niy,
        role: staffForLog.role,
        unitId: staffForLog.unitId,
        masuk: action.payload.masuk,
        method: action.payload.method,
        late: action.payload.late ?? 0,
        status: action.payload.late > 0 ? 'Terlambat' : 'Tepat Waktu',
      } : null
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id
            ? { ...s, masuk: action.payload.masuk, method: action.payload.method, late: action.payload.late ?? 0, status: 'Aktif' }
            : s,
        ),
logs: [
            {
              id: Date.now(),
              time: new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              actor: staffForLog?.name || 'Pegawai',
              role: staffForLog?.role || 'Guru',
              unit: state.units.find(u => u.id === staffForLog?.unitId)?.nama || 'Unit',
              action: 'Presensi',
              target: `Pegawai • ${staffForLog?.name || 'N/A'}`,
              desc: `Presensi ${action.payload.method || 'Face Recognition'} pukul ${action.payload.masuk} WIB${action.payload.late ? ` (terlambat ${action.payload.late} menit)` : ''} di ${state.units.find(u => u.id === staffForLog?.unitId)?.nama || 'Unit'}`,
            },
            ...state.logs,
          ],
        attendanceHistory: historyEntryCheckIn ? [historyEntryCheckIn, ...state.attendanceHistory] : state.attendanceHistory,
      }
    case 'ADD_LOG':
      return { ...state, logs: [action.payload, ...state.logs] }
    case 'ADD_ADMIN_USER':
      return {
        ...state,
        adminUsers: [...state.adminUsers, action.payload],
        staff: syncStaffFromAdminUser(state.staff, action.payload, 'add'),
      }
    case 'UPDATE_ADMIN_USER':
      return {
        ...state,
        adminUsers: state.adminUsers.map((u) =>
          u.id === action.payload.id ? { ...u, ...action.payload } : u,
        ),
        staff: syncStaffFromAdminUser(state.staff, action.payload, 'update'),
      }
    case 'DELETE_ADMIN_USER':
      return {
        ...state,
        adminUsers: state.adminUsers.filter((u) => u.id !== action.payload),
        staff: syncStaffFromAdminUser(state.staff, { id: action.payload }, 'delete'),
      }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'UPDATE_PERMISSIONS':
      return { ...state, permissionMatrix: action.payload }
    case 'SET_CURRENT_USER': {
      // Ganti akun = unit ikut akun baru, bukan sisa pilihan sebelumnya.
      return {
        ...state,
        currentUser: action.payload,
        selectedUnitId: initialUnitScope(action.payload),
      }
    }
    case 'SET_SELECTED_UNIT': {
      // Guard lapis reducer: role non-Superadmin tidak pernah bisa mengunci
      // dirinya ke unit lain, apa pun yang dikirim komponen.
      if (selectCurrentUserRole(state) !== ROLE_SUPERADMIN) return state
      const next = action.payload === ALL_UNITS ? ALL_UNITS : action.payload
      if (next !== ALL_UNITS && !state.units.some((u) => u.id === next)) return state
      return { ...state, selectedUnitId: next }
    }
    default:
      return state
  }
}

const SimPresContext = createContext(null)

export function SimPresProvider({ children }) {
  const [state, dispatch] = useReducer(simPresReducer, initialState)
  // attendance selalu turunan state.staff (satu sumber data presensi).
  const value = useMemo(
    () => ({ state: { ...state, attendance: buildAttendance(state.staff) }, dispatch }),
    [state],
  )
  return (
    <SimPresContext.Provider value={value}>
      {children}
    </SimPresContext.Provider>
  )
}

export function useSimPres() {
  const ctx = useContext(SimPresContext)
  if (!ctx) throw new Error('useSimPres must be used within <SimPresProvider>')
  return ctx
}

// Semua angka & tabel di bawah otomatis mengikuti unit terpilih karena
// filter unit berlaku di satu titik ini (sumber data tetap state.staff).
export function selectActiveStaff(state) {
  return selectScopedStaff(state).filter((s) => s.status === 'Aktif')
}

export function selectTotalPegawai(state) {
  return selectActiveStaff(state).length
}

export function selectHadirHariIni(state) {
  return selectActiveStaff(state).filter((s) => s.masuk !== null)
}

export function selectJumlahHadir(state) {
  return selectHadirHariIni(state).length
}

export function selectTerlambat(state) {
  return selectActiveStaff(state).filter((s) => s.masuk && s.late > 0)
}

export function selectJumlahTerlambat(state) {
  return selectTerlambat(state).length
}

export function selectAlpha(state) {
  const activeLeaveStaffIds = new Set(
    selectScopedLeaves(state)
      .filter((l) => l.status === 'Disetujui' || l.status === 'Menunggu')
      .map((l) => l.staffId),
  )
  return selectActiveStaff(state).filter(
    (s) => !s.masuk && !activeLeaveStaffIds.has(s.id),
  )
}

export function selectJumlahAlpha(state) {
  return selectAlpha(state).length
}

export function selectTingkatKehadiran(state) {
  const total = selectTotalPegawai(state)
  if (total === 0) return 0
  return ((selectJumlahHadir(state) / total) * 100).toFixed(1)
}

export function selectRataRataTerlambat(state) {
  const late = selectTerlambat(state)
  if (late.length === 0) return 0
  const totalMin = late.reduce((sum, s) => sum + s.late, 0)
  return (totalMin / late.length).toFixed(1)
}

// Unit efektif untuk selector yang menerima parameter unit:
// "Semua Unit" hanya sah bila role memang berhak melihat seluruh unit.
export function resolveUnitFilter(state, unitId) {
  if (!selectIsAllUnits(state)) return selectActiveUnitId(state)
  return !unitId || unitId === ALL_UNITS ? null : unitId
}

export function selectUnitSummary(state) {
  return selectVisibleUnits(state).map((unit) => {
    const staffInUnit = state.staff.filter(
      (s) => s.unitId === unit.id && s.status === 'Aktif',
    )
    const total = staffInUnit.length
    const present = staffInUnit.filter((s) => s.masuk !== null).length
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0
    return {
      id: unit.id,
      name: unit.nama,
      icon: unit.icon,
      present,
      total,
      percentage: Number(percentage),
    }
  })
}

export function selectRecentActivity(state) {
  return selectHadirHariIni(state)
    .slice()
    .sort((a, b) => {
      if (a.masuk > b.masuk) return -1
      if (a.masuk < b.masuk) return 1
      return 0
    })
}

export function selectTrendByRange(state, days) {
  return (days === 30 ? state.trend30 : state.weeklyTrend) || []
}

export function selectIzinCutiSummary(state) {
  const leaves = selectScopedLeaves(state)
  const menunggu = leaves.filter((l) => l.status === 'Menunggu').length
  const disetujui = leaves.filter((l) => l.status === 'Disetujui').length
  const ditolak = leaves.filter((l) => l.status === 'Ditolak').length
  return { menunggu, disetujui, ditolak, total: leaves.length }
}

export function selectBelumPresensi(state) {
  return selectActiveStaff(state).filter((s) => !s.masuk).length
}

export function selectLeavesByStatus(state, status) {
  const leaves = selectScopedLeaves(state)
  if (!status || status === 'semua') return leaves
  return leaves.filter((l) => l.status === status)
}

export function selectPendingLeaves(state) {
  return selectScopedLeaves(state).filter((l) => l.status === 'Menunggu').length
}

export function selectApprovedLeaves(state) {
  return selectScopedLeaves(state).filter((l) => l.status === 'Disetujui').length
}

export function selectRejectedLeaves(state) {
  return selectScopedLeaves(state).filter((l) => l.status === 'Ditolak').length
}

export function selectStaffById(state, id) {
  return state.staff.find((s) => s.id === id)
}

// Nomor berikutnya dihitung dari data yang ada, bukan dari state terpisah,
// sehingga tidak pernah bentrok walau ada impor massal.
function nextIdFrom(list, key = 'id') {
  return list.reduce((max, item) => {
    const n = Number(item[key])
    return Number.isFinite(n) && n > max ? n : max
  }, 0) + 1
}

export function nextStaffId(state) {
  return nextIdFrom(state.staff)
}

export function selectStaffByNiy(state, niy) {
  const key = String(niy ?? '').trim()
  if (!key) return undefined
  return state.staff.find((s) => String(s.niy).trim() === key)
}

// Jabatan untuk form = jabatan yang benar-benar ada di store, digabung dengan
// daftar baku supaya pegawai baru pun tetap bisa memilih jabatan yang relevan.
export function selectJabatanOptions(state) {
  const base = [
    'Guru Kelas', 'Guru Mapel', 'Guru PAI', 'Guru Tahfidz', 'Guru BK', 'Wali Kelas',
    'Guru Sentra', 'Guru Kelompok Bermain', 'Asisten Guru TK', 'Laboran',
    'Staf Administrasi', 'Staf TU', 'Kepala Unit',
  ]
  const fromStaff = state.staff.map((s) => s.role).filter(Boolean)
  return Array.from(new Set([...base, ...fromStaff])).sort((a, b) => a.localeCompare(b, 'id'))
}

// Satu-satunya sumber filtering tabel Data Guru/Pegawai: unit, status, dan
// pencarian (nama, NIY/NIP, jabatan, nama unit).
export function selectFilteredStaff(state, { unitId = ALL_UNITS, searchTerm = '', status = 'all' } = {}) {
  const q = String(searchTerm || '').trim().toLowerCase()
  const effUnit = resolveUnitFilter(state, unitId)
  return selectScopedStaff(state).filter((s) => {
    if (effUnit && s.unitId !== effUnit) return false
    if (status && status !== 'all' && s.status !== status) return false
    if (!q) return true
    const unit = state.units.find((u) => u.id === s.unitId)
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.niy || '').toLowerCase().includes(q) ||
      String(s.nip || '').toLowerCase().includes(q) ||
      String(s.role || '').toLowerCase().includes(q) ||
      String(unit ? unit.nama : '').toLowerCase().includes(q)
    )
  })
}

export function selectUnitById(state, id) {
  return state.units.find((u) => u.id === id)
}

export function selectUnitName(state, unitId) {
  const unit = selectUnitById(state, unitId)
  return unit ? unit.nama : '-'
}

export const ROLE_OPTIONS = [
  { value: 'Superadmin', label: 'Superadmin Pusat' },
  { value: 'Admin Unit', label: 'Admin Unit Sekolah' },
  { value: 'Guru', label: 'Guru / Staf' },
  { value: 'Petugas Presensi', label: 'Petugas Presensi' },
]

export const MENU_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'manajemenUnit', label: 'Manajemen Unit' },
  { key: 'manajemenAdminUser', label: 'Manajemen Admin & User' },
  { key: 'dataGuruPegawai', label: 'Data Guru/Pegawai' },
  { key: 'presensi', label: 'Presensi' },
  { key: 'rekapLaporan', label: 'Rekap & Laporan' },
  { key: 'rankingKehadiran', label: 'Ranking Kehadiran' },
  { key: 'pengajuanIzinCuti', label: 'Pengajuan Izin/Cuti' },
  { key: 'logAktivitas', label: 'Log Aktivitas' },
  { key: 'pengaturanGlobal', label: 'Pengaturan Global' },
]

export function getRolePermissions(state, role) {
  return state.permissionMatrix?.[role] || {}
}

export function hasPermission(state, role, menuKey, action) {
  const permissions = state.permissionMatrix?.[role]
  if (!permissions) return false
  return permissions[menuKey]?.includes(action) ?? false
}

export function selectAdminById(state, id) {
  return state.adminUsers.find((u) => u.id === id)
}

function syncStaffFromAdminUser(staff, adminUser, action) {
  const niy = adminUser.niy
  if (!niy) return staff

  const existingStaffIndex = staff.findIndex((s) => s.niy === niy)
  const isGuruOrStaff = adminUser.role === 'Guru' || adminUser.role === 'Admin Unit'

  if (action === 'delete') {
    if (existingStaffIndex >= 0 && isGuruOrStaff) {
      return staff.filter((s) => s.niy !== niy)
    }
    return staff
  }

  if (action === 'add') {
    if (existingStaffIndex >= 0) {
      return staff.map((s, i) =>
        i === existingStaffIndex
          ? { ...s, unitId: adminUser.unitId, status: adminUser.status, role: adminUser.role === 'Admin Unit' ? 'Guru' : adminUser.role }
          : s,
      )
    }
    if (isGuruOrStaff) {
      const newStaff = {
        id: staff.length > 0 ? Math.max(...staff.map((s) => s.id)) + 1 : 1,
        niy: adminUser.niy,
        name: adminUser.name,
        role: adminUser.role === 'Admin Unit' ? 'Guru' : adminUser.role,
        unitId: adminUser.unitId,
        status: adminUser.status,
        masuk: null,
        method: null,
        late: 0,
      }
      return [...staff, newStaff]
    }
    return staff
  }

  if (action === 'update') {
    if (existingStaffIndex >= 0 && isGuruOrStaff) {
      return staff.map((s, i) =>
        i === existingStaffIndex
          ? { ...s, unitId: adminUser.unitId, status: adminUser.status, role: adminUser.role === 'Admin Unit' ? 'Guru' : adminUser.role }
          : s,
      )
    }
    if (isGuruOrStaff) {
      const newStaff = {
        id: staff.length > 0 ? Math.max(...staff.map((s) => s.id)) + 1 : 1,
        niy: adminUser.niy,
        name: adminUser.name,
        role: adminUser.role === 'Admin Unit' ? 'Guru' : adminUser.role,
        unitId: adminUser.unitId,
        status: adminUser.status,
        masuk: null,
        method: null,
        late: 0,
      }
      return [...staff, newStaff]
    }
    return staff
  }

  return staff
}

function syncAdminUserFromStaff(adminUsers, staffUser, action) {
  const niy = staffUser.niy
  if (!niy) return adminUsers

  const existingAdminIndex = adminUsers.findIndex((u) => u.niy === niy)
  const isGuruOrStaff = staffUser.role === 'Guru' || staffUser.role === 'Admin Unit'

  if (action === 'add') {
    if (existingAdminIndex >= 0) {
      return adminUsers.map((u, i) =>
        i === existingAdminIndex
          ? { ...u, unitId: staffUser.unitId, status: staffUser.status }
          : u,
      )
    }
    return adminUsers
  }

  if (existingAdminIndex >= 0 && isGuruOrStaff) {
    return adminUsers.map((u, i) =>
      i === existingAdminIndex
        ? { ...u, unitId: staffUser.unitId, status: staffUser.status }
        : u,
    )
  }

  return adminUsers
}

export function selectLeavesEnriched(state) {
  return selectScopedLeaves(state).map((l) => {
    const staff = selectStaffById(state, l.staffId)
    return {
      ...l,
      name: staff ? staff.name : 'N/A',
      niy: staff ? staff.niy : '-',
      role: staff ? staff.role : '-',
      unitId: staff ? staff.unitId : null,
      unitName: staff ? selectUnitName(state, staff.unitId) : '-',
    }
  })
}

export function selectAttendance(state) {
  const scoped = selectScopedStaff(state)
  if (selectIsAllUnits(state)) return state.attendance || buildAttendance(scoped)
  return buildAttendance(scoped)
}

export function selectAttendanceByUnit(state, unitId) {
  const effUnit = resolveUnitFilter(state, unitId)
  const attendance = selectAttendance(state)
  if (!effUnit) return attendance
  return attendance.filter((a) => a.unitId === effUnit)
}

export function selectAttendanceSummary(state) {
  const attendance = selectAttendance(state)
  const hadir = attendance.filter((a) => a.status === 'Tepat Waktu').length
  const terlambat = attendance.filter((a) => a.status === 'Terlambat').length
  const belum = attendance.filter((a) => a.status === 'Belum Presensi').length
  const tidakAktif = attendance.filter((a) => a.status === 'Tidak Aktif').length
  return { hadir, terlambat, belum, tidakAktif }
}

export function selectFilterTabCounts(state) {
  const hadir = selectHadirHariIni(state)
  const tepat = hadir.filter((s) => s.late === 0).length
  const face = hadir.filter((s) => s.method === 'Face Recognition').length
  const qr = hadir.filter((s) => s.method === 'QR Code').length
  return { semua: hadir.length, tepat, terlambat: selectJumlahTerlambat(state), face, qr }
}

export function selectRekapTableData(state, unitId = null, period = 'Bulanan') {
  let staff = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  if (effUnit) {
    staff = staff.filter((s) => s.unitId === effUnit)
  }
  return staff.map((s) => {
    const unit = state.units.find((u) => u.id === s.unitId)
    const isHadir = s.masuk !== null
    let stMasuk = 'Alpha'
    let stMasukType = 'alpha'
    let stPulang = 'Alpha'
    let stPulangType = 'alpha'
    let ket = 'Tanpa surat pemberitahuan'
    if (isHadir) {
      stMasuk = s.late > 0 ? `Terlambat ${s.late} menit` : 'Tepat Waktu'
      stMasukType = s.late > 0 ? 'late' : 'good'
      stPulang = 'Tepat Waktu'
      stPulangType = 'good'
      ket = s.unitId === 'smp' ? 'Tugas Pengawas Ujian' : s.unitId === 'sd' ? (s.id === 2 ? 'Dispensasi Rapat Gugus' : s.id === 3 ? 'Lupa tap pulang / verifikasi TU' : 'Guru Kelas Reguler') : s.unitId === 'sma' ? (s.id === 6 ? 'Cuti Alasan Penting (Lampiran SK)' : 'Guru Kelas Reguler') : s.unitId === 'tk' ? 'Izin dinas luar jam 14:30' : 'Surat Sakit Dokter RS Radja'
    } else if (s.status === 'Nonaktif') {
      stMasuk = 'Izin'
      stMasukType = 'leave'
      stPulang = 'Izin'
      stPulangType = 'leave'
      ket = 'Cuti Alasan Penting (Lampiran SK)'
    }
    const unitName = unit ? unit.nama : '-'
    const roleLabel = s.role
    return {
      id: s.id,
      initials: initialsOf(s.name),
      name: s.name,
      role: roleLabel,
      niy: s.niy,
      unit: unitName,
      masuk: isHadir ? `${s.masuk} WIB` : '-',
      pulang: isHadir ? '15:00 WIB' : '-',
      stMasuk,
      stMasukType,
      stPulang,
      stPulangType,
      ket,
    }
  })
}

export function selectRekapReportData(state, unitId = null, period = 'Bulanan') {
  let staff = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  if (effUnit) {
    staff = staff.filter((s) => s.unitId === effUnit)
  }

  let attendance = buildAttendance(staff)
  if (effUnit) {
    attendance = attendance.filter((a) => a.unitId === effUnit)
  }
  
  let daysInPeriod = 15
  switch (period) {
    case 'Harian': daysInPeriod = 1; break
    case 'Mingguan': daysInPeriod = 6; break
    case 'Bulanan': daysInPeriod = 22; break
    case 'Tahunan': daysInPeriod = 240; break
  }
  
  const leaves = selectScopedLeaves(state)

  return staff.map((s, idx) => {
    const unit = state.units.find((u) => u.id === s.unitId)
    const staffAttendance = attendance.filter((a) => a.staffId === s.id)
    const hadir = staffAttendance.filter((a) => a.masuk !== null).length
    const tepatWaktu = staffAttendance.filter((a) => a.masuk !== null && a.late === 0).length
    const terlambat = staffAttendance.filter((a) => a.masuk !== null && a.late > 0).length
    const staffLeaves = leaves.filter((l) => 
      l.staffId === s.id && (l.status === 'Disetujui' || l.status === 'Menunggu')
    )
    const izinSakit = staffLeaves.length
    const alpha = Math.max(0, daysInPeriod - hadir - izinSakit)
    const persentaseKehadiran = daysInPeriod > 0 ? ((hadir / daysInPeriod) * 100).toFixed(1) : '0.0'
    
    let status = 'Baik'
    let statusType = 'good'
    if (persentaseKehadiran < 75) {
      status = 'Perlu Perhatian'
      statusType = 'error'
    } else if (persentaseKehadiran < 90 || terlambat > 5) {
      status = 'Kurang Baik'
      statusType = 'late'
    }
    
    return {
      no: idx + 1,
      id: s.id,
      initials: initialsOf(s.name),
      name: s.name,
      niy: s.niy,
      unit: unit?.nama || '-',
      periode: getPeriodLabel(period),
      totalHariKerja: daysInPeriod,
      hadir,
      tepatWaktu,
      terlambat,
      izinSakit,
      alpha,
      persentaseKehadiran: parseFloat(persentaseKehadiran),
      status,
      statusType,
    }
  })
}

function getPeriodLabel(period) {
  switch (period) {
    case 'Harian': return 'Hari Ini'
    case 'Mingguan': return 'Minggu Ini'
    case 'Bulanan': return 'Bulan Ini'
    case 'Tahunan': return 'Tahun Ini'
    default: return period
  }
}

export function selectRekapSummary(state, unitId = null, period = 'Bulanan') {
  let staff = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  if (effUnit) {
    staff = staff.filter((s) => s.unitId === effUnit)
  }
  const totalPegawai = staff.length
  const hadir = staff.filter((s) => s.masuk !== null).length
  const tepatWaktu = staff.filter((s) => s.masuk !== null && s.late === 0).length
  const terlambat = staff.filter((s) => s.masuk !== null && s.late > 0).length
  const leaves = selectScopedLeaves(state)
  const izinSakit = leaves.filter((l) =>
    (l.status === 'Disetujui' || l.status === 'Menunggu') &&
    staff.some((s) => s.id === l.staffId)
  ).length
  const alpha = staff.filter((s) => s.masuk === null && !leaves.some((l) =>
    (l.status === 'Disetujui' || l.status === 'Menunggu') && l.staffId === s.id
  )).length
  const persentaseKehadiran = totalPegawai > 0 ? ((hadir / totalPegawai) * 100).toFixed(1) : '0.0'
  return { totalPegawai, hadir, tepatWaktu, terlambat, izinSakit, alpha, persentaseKehadiran }
}

export function selectRekapChartData(state, unitId = null, period = 'Bulanan') {
  let trendData = []
  let daysInPeriod = 15
  
  switch (period) {
    case 'Harian':
      trendData = state.weeklyTrend?.slice(0, 1) || []
      daysInPeriod = 1
      break
    case 'Mingguan':
      trendData = state.weeklyTrend || []
      daysInPeriod = 6
      break
    case 'Bulanan':
      trendData = state.trend30 || []
      daysInPeriod = 30
      break
    case 'Tahunan':
      trendData = state.trend30 || []
      daysInPeriod = 365
      break
    default:
      trendData = state.trend30 || []
      daysInPeriod = 30
  }

  let staff = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  if (effUnit) {
    staff = staff.filter((s) => s.unitId === effUnit)
  }
  let attendance = state.attendance || buildAttendance(staff)
  if (effUnit) {
    attendance = attendance.filter((a) => a.unitId === effUnit)
  }
  const leaves = selectScopedLeaves(state)
  const approvedLeaves = leaves.filter((l) => l.status === 'Disetujui' && staff.some((s) => s.id === l.staffId)).length
  const pendingLeaves = leaves.filter((l) => l.status === 'Menunggu' && staff.some((s) => s.id === l.staffId)).length
  const alphaCount = attendance.filter((a) => a.alpha && !a.masuk).length

  const chartData = Array.from({ length: Math.min(daysInPeriod, trendData.length || daysInPeriod) }, (_, i) => {
    const dayNum = i + 1
    const isWeekend = dayNum % 7 === 6 || dayNum % 7 === 0
    const trendIdx = i % (trendData.length || 1)
    const trendDay = trendData[trendIdx] || { hadir: 0, terlambat: 0 }
    const izin = Math.round((approvedLeaves + pendingLeaves) / Math.max(daysInPeriod, 1))
    const alpha = Math.round(alphaCount / Math.max(daysInPeriod, 1))
    return {
      day: String(dayNum).padStart(2, '0'),
      hadir: trendDay.hadir,
      terlambat: trendDay.terlambat,
      izin: Math.max(0, izin),
      alpha: Math.max(0, alpha),
      weekend: isWeekend,
      current: dayNum === new Date().getDate(),
    }
  })
  return chartData
}

export function selectRekapKepatuhanChart(state, unitId = null, period = 'Bulanan') {
  let staff = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  if (effUnit) {
    staff = staff.filter((s) => s.unitId === effUnit)
  }
  let attendance = state.attendance || buildAttendance(staff)
  if (effUnit) {
    attendance = attendance.filter((a) => a.unitId === effUnit)
  }
  const hadirTepat = attendance.filter((a) => a.status === 'Tepat Waktu').length
  const terlambat = attendance.filter((a) => a.status === 'Terlambat').length
  const total = hadirTepat + terlambat
  const kepatuhan = total > 0 ? ((hadirTepat / total) * 100).toFixed(1) : '0.0'
  return { kepatuhan, hadirTepat, terlambat, total }
}

export function selectRankingData(state) {
  const active = selectActiveStaff(state)
  const history = state.attendanceHistory || []
  
  // Build staff attendance stats from history
  const staffStats = new Map()
  
  active.forEach(staff => {
    staffStats.set(staff.id, {
      id: staff.id,
      name: staff.name,
      niy: staff.niy,
      role: staff.role,
      unitId: staff.unitId,
      unit: state.units.find(u => u.id === staff.unitId)?.nama || '-',
      initials: initialsOf(staff.name),
      totalDays: 0,
      hadirCount: 0,
      tepatWaktuCount: 0,
      terlambatCount: 0,
      totalLateMinutes: 0,
      lateMinutesList: [],
    })
  })
  
  // Aggregate from history
  history.forEach(record => {
    const stats = staffStats.get(record.staffId)
    if (!stats) return
    
    stats.totalDays++
    if (record.masuk) {
      stats.hadirCount++
      if (record.late > 0) {
        stats.terlambatCount++
        stats.totalLateMinutes += record.late
        stats.lateMinutesList.push(record.late)
      } else {
        stats.tepatWaktuCount++
      }
    }
  })
  
  // Calculate derived stats
  const staffWithStats = Array.from(staffStats.values()).map(s => ({
    ...s,
    persentaseKehadiran: s.totalDays > 0 ? ((s.hadirCount / s.totalDays) * 100).toFixed(1) : '0.0',
    rataRataTerlambat: s.terlambatCount > 0 ? (s.totalLateMinutes / s.terlambatCount).toFixed(1) : '0.0',
  }))
  
  // Top 10 Paling Tepat Waktu
  // Urutkan: jumlah hadir tepat waktu (desc), persentase kehadiran (desc), jumlah keterlambatan (asc)
  const topOnTime = [...staffWithStats]
    .filter(s => s.hadirCount > 0)
    .sort((a, b) => {
      if (b.tepatWaktuCount !== a.tepatWaktuCount) return b.tepatWaktuCount - a.tepatWaktuCount
      if (parseFloat(b.persentaseKehadiran) !== parseFloat(a.persentaseKehadiran)) 
        return parseFloat(b.persentaseKehadiran) - parseFloat(a.persentaseKehadiran)
      return a.terlambatCount - b.terlambatCount
    })
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      initials: s.initials,
      name: s.name,
      niy: s.niy,
      unit: s.unit,
      role: s.role,
      persentaseKehadiran: s.persentaseKehadiran,
      tepatWaktuCount: s.tepatWaktuCount,
      terlambatCount: s.terlambatCount,
      late: `${s.terlambatCount}x Terlambat`,
      stat: `${s.persentaseKehadiran}% Kehadiran`,
      statSub: `${s.tepatWaktuCount}/${s.hadirCount} Tepat Waktu`,
      badgeColor: 'bg-secondary-fixed',
      badgeText: 'text-on-secondary-fixed',
    }))
  
  // Top 10 Paling Sering Terlambat
  // Urutkan: jumlah keterlambatan tertinggi (desc), total menit keterlambatan (desc)
  const topLate = [...staffWithStats]
    .filter(s => s.terlambatCount > 0)
    .sort((a, b) => {
      if (b.terlambatCount !== a.terlambatCount) return b.terlambatCount - a.terlambatCount
      return b.totalLateMinutes - a.totalLateMinutes
    })
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      initials: s.initials,
      name: s.name,
      niy: s.niy,
      unit: s.unit,
      role: s.role,
      persentaseKehadiran: s.persentaseKehadiran,
      terlambatCount: s.terlambatCount,
      totalLateMinutes: s.totalLateMinutes,
      rataRataTerlambat: s.rataRataTerlambat,
      count: `${s.terlambatCount} kali terlambat`,
      avg: `Rata-rata ${s.rataRataTerlambat} menit`,
      totalMin: `${s.totalLateMinutes} menit`,
      badge: idx === 0 ? 'Teguran' : 'Detail',
      badgeBg: idx === 0 ? 'bg-error-container' : 'bg-surface-container-low',
      badgeText: idx === 0 ? 'text-error' : 'text-on-surface-variant',
    }))
  
  // Insentif Disiplin (top 7 paling tepat waktu)
  const insentif = [...staffWithStats]
    .filter(s => s.hadirCount > 0)
    .sort((a, b) => {
      if (b.tepatWaktuCount !== a.tepatWaktuCount) return b.tepatWaktuCount - a.tepatWaktuCount
      if (parseFloat(b.persentaseKehadiran) !== parseFloat(a.persentaseKehadiran)) 
        return parseFloat(b.persentaseKehadiran) - parseFloat(a.persentaseKehadiran)
      return a.terlambatCount - b.terlambatCount
    })
    .slice(0, 7)
    .map(s => ({
      initials: s.initials,
      name: s.name,
      unit: s.unit,
      desc: `${s.terlambatCount}x Terlambat • ${s.persentaseKehadiran}% Kehadiran`,
    }))
  
  // Toleransi per unit (hanya unit yang terlihat pada scope aktif)
  const unitLateAvg = selectVisibleUnits(state).map(u => {
    const staffInUnit = staffWithStats.filter(s => s.unitId === u.id)
    const totalLate = staffInUnit.reduce((sum, s) => sum + s.terlambatCount, 0)
    const totalStaff = staffInUnit.length
    const avgLateCount = totalStaff > 0 ? (totalLate / totalStaff).toFixed(1) : '0.0'
    const avgLateMinutes = staffInUnit.length > 0 
      ? (staffInUnit.reduce((sum, s) => sum + s.totalLateMinutes, 0) / staffInUnit.length).toFixed(1)
      : '0.0'
    const pct = parseFloat(avgLateCount) > 5 ? 75 : Math.min(98, 85 + Math.round(parseFloat(avgLateCount) * 2))
    return {
      unit: u.nama,
      avg: `${avgLateMinutes} Mnt`,
      pct,
    }
  })
  
  // Pembinaan (staff dengan terlambat >= 5 kali)
  const pembinaan = staffWithStats
    .filter(s => s.terlambatCount >= 5)
    .sort((a, b) => b.terlambatCount - a.terlambatCount)
    .slice(0, 2)
    .map(s => ({
      initials: s.initials,
      name: s.name,
      unit: s.unit,
      action: 'Surat Pembinaan',
      icon: 'assignment',
    }))
  
  const hasAttendanceData = history.length > 0
  const totalStaffWithAttendance = staffWithStats.filter(s => s.totalDays > 0).length

  return { topOnTime, topLate, insentif, toleransi: unitLateAvg, pembinaan, hasAttendanceData, totalStaffWithAttendance }
}

export function selectRankingDataFiltered(state, { period = 'Bulanan', unitId = ALL_UNITS, dateRange = null } = {}) {
  const active = selectActiveStaff(state)
  const effUnit = resolveUnitFilter(state, unitId)
  const history = state.attendanceHistory || []
  
  // Filter history by period and date range
  let filteredHistory = history
  
  if (dateRange) {
    const { start, end } = dateRange
    filteredHistory = history.filter(record => record.date >= start && record.date <= end)
  } else if (period !== 'Semua') {
    // Calculate date range based on period
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
    filteredHistory = history.filter(record => record.date >= startStr && record.date <= endStr)
  }
  
  // Filter by unit
  let targetStaffIds = active.map(s => s.id)
  if (effUnit) {
    targetStaffIds = active.filter(s => s.unitId === effUnit).map(s => s.id)
  }
  
  // Build staff attendance stats from filtered history
  const staffStats = new Map()
  
  active.forEach(staff => {
    if (!targetStaffIds.includes(staff.id)) return
    staffStats.set(staff.id, {
      id: staff.id,
      name: staff.name,
      niy: staff.niy,
      role: staff.role,
      unitId: staff.unitId,
      unit: state.units.find(u => u.id === staff.unitId)?.nama || '-',
      initials: initialsOf(staff.name),
      totalDays: 0,
      hadirCount: 0,
      tepatWaktuCount: 0,
      terlambatCount: 0,
      totalLateMinutes: 0,
      lateMinutesList: [],
    })
  })
  
  // Aggregate from filtered history
  filteredHistory.forEach(record => {
    const stats = staffStats.get(record.staffId)
    if (!stats) return
    
    stats.totalDays++
    if (record.masuk) {
      stats.hadirCount++
      if (record.late > 0) {
        stats.terlambatCount++
        stats.totalLateMinutes += record.late
        stats.lateMinutesList.push(record.late)
      } else {
        stats.tepatWaktuCount++
      }
    }
  })
  
  // Calculate derived stats
  const staffWithStats = Array.from(staffStats.values()).map(s => ({
    ...s,
    persentaseKehadiran: s.totalDays > 0 ? ((s.hadirCount / s.totalDays) * 100).toFixed(1) : '0.0',
    rataRataTerlambat: s.terlambatCount > 0 ? (s.totalLateMinutes / s.terlambatCount).toFixed(1) : '0.0',
  }))
  
  // Top 10 Paling Tepat Waktu
  const topOnTime = [...staffWithStats]
    .filter(s => s.hadirCount > 0)
    .sort((a, b) => {
      if (b.tepatWaktuCount !== a.tepatWaktuCount) return b.tepatWaktuCount - a.tepatWaktuCount
      if (parseFloat(b.persentaseKehadiran) !== parseFloat(a.persentaseKehadiran)) 
        return parseFloat(b.persentaseKehadiran) - parseFloat(a.persentaseKehadiran)
      return a.terlambatCount - b.terlambatCount
    })
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      initials: s.initials,
      name: s.name,
      niy: s.niy,
      unit: s.unit,
      role: s.role,
      persentaseKehadiran: s.persentaseKehadiran,
      tepatWaktuCount: s.tepatWaktuCount,
      terlambatCount: s.terlambatCount,
      late: `${s.terlambatCount}x Terlambat`,
      stat: `${s.persentaseKehadiran}% Kehadiran`,
      statSub: `${s.tepatWaktuCount}/${s.hadirCount} Tepat Waktu`,
      badgeColor: 'bg-secondary-fixed',
      badgeText: 'text-on-secondary-fixed',
    }))
  
  // Top 10 Paling Sering Terlambat
  const topLate = [...staffWithStats]
    .filter(s => s.terlambatCount > 0)
    .sort((a, b) => {
      if (b.terlambatCount !== a.terlambatCount) return b.terlambatCount - a.terlambatCount
      return b.totalLateMinutes - a.totalLateMinutes
    })
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      initials: s.initials,
      name: s.name,
      niy: s.niy,
      unit: s.unit,
      role: s.role,
      persentaseKehadiran: s.persentaseKehadiran,
      terlambatCount: s.terlambatCount,
      totalLateMinutes: s.totalLateMinutes,
      rataRataTerlambat: s.rataRataTerlambat,
      count: `${s.terlambatCount} kali terlambat`,
      avg: `Rata-rata ${s.rataRataTerlambat} menit`,
      totalMin: `${s.totalLateMinutes} menit`,
      badge: idx === 0 ? 'Teguran' : 'Detail',
      badgeBg: idx === 0 ? 'bg-error-container' : 'bg-surface-container-low',
      badgeText: idx === 0 ? 'text-error' : 'text-on-surface-variant',
    }))
  
  // Insentif Disiplin
  const insentif = [...staffWithStats]
    .filter(s => s.hadirCount > 0)
    .sort((a, b) => {
      if (b.tepatWaktuCount !== a.tepatWaktuCount) return b.tepatWaktuCount - a.tepatWaktuCount
      if (parseFloat(b.persentaseKehadiran) !== parseFloat(a.persentaseKehadiran)) 
        return parseFloat(b.persentaseKehadiran) - parseFloat(a.persentaseKehadiran)
      return a.terlambatCount - b.terlambatCount
    })
    .slice(0, 7)
    .map(s => ({
      initials: s.initials,
      name: s.name,
      unit: s.unit,
      desc: `${s.terlambatCount}x Terlambat • ${s.persentaseKehadiran}% Kehadiran`,
    }))
  
  // Toleransi per unit (hanya unit yang sedang terlihat)
  const unitLateAvg = selectVisibleUnits(state).map(u => {
    if (effUnit && u.id !== effUnit) return null
    const staffInUnit = staffWithStats.filter(s => s.unitId === u.id)
    const totalLate = staffInUnit.reduce((sum, s) => sum + s.terlambatCount, 0)
    const totalStaff = staffInUnit.length
    const avgLateCount = totalStaff > 0 ? (totalLate / totalStaff).toFixed(1) : '0.0'
    const avgLateMinutes = staffInUnit.length > 0 
      ? (staffInUnit.reduce((sum, s) => sum + s.totalLateMinutes, 0) / staffInUnit.length).toFixed(1)
      : '0.0'
    const pct = parseFloat(avgLateCount) > 5 ? 75 : Math.min(98, 85 + Math.round(parseFloat(avgLateCount) * 2))
    return {
      unit: u.nama,
      avg: `${avgLateMinutes} Mnt`,
      pct,
    }
  }).filter(Boolean)
  
  // Pembinaan
  const pembinaan = staffWithStats
    .filter(s => s.terlambatCount >= 5)
    .sort((a, b) => b.terlambatCount - a.terlambatCount)
    .slice(0, 2)
    .map(s => ({
      initials: s.initials,
      name: s.name,
      unit: s.unit,
      action: 'Surat Pembinaan',
      icon: 'assignment',
    }))
  
  // Check if there's any attendance data in the filtered range
  const hasAttendanceData = filteredHistory.length > 0
  const totalStaffWithAttendance = staffWithStats.filter(s => s.totalDays > 0).length
  const totalFilteredStaff = targetStaffIds.length
  
  return { topOnTime, topLate, insentif, toleransi: unitLateAvg, pembinaan, hasAttendanceData, totalStaffWithAttendance, totalFilteredStaff }
}

export function selectMonitoringActivity(state) {
  return selectRecentActivity(state).map((s, idx) => {
    const unit = state.units.find((u) => u.id === s.unitId)
    const unitColor = unit?.id === 'sd' ? 'bg-blue-100 text-secondary'
      : unit?.id === 'smp' ? 'bg-slate-100 text-slate-800'
        : unit?.id === 'sma' ? 'bg-indigo-100 text-indigo-800'
          : unit?.id === 'tk' ? 'bg-indigo-100 text-indigo-800'
            : 'bg-purple-100 text-purple-800'

    // Hitung keterlambatan berdasarkan jam masuk unit vs waktu presensi aktual
    let lateMinutes = 0
    let status = 'Belum Presensi'
    let statusColor = 'bg-surface-container text-on-surface-variant'

    if (s.masuk && unit) {
      const unitEntry = unit.masuk // format "07:00" atau "06:45"
      const [unitHour, unitMin] = unitEntry.split(':').map(Number)
      const unitEntryMinutes = unitHour * 60 + unitMin

      const [attHour, attMin] = s.masuk.split(':').map(Number)
      const attMinutes = attHour * 60 + attMin

      lateMinutes = Math.max(0, attMinutes - unitEntryMinutes)

      if (lateMinutes > 0) {
        status = `Terlambat (${lateMinutes} mnt)`
        statusColor = 'bg-amber-100 text-amber-800'
      } else {
        status = idx === 0 ? 'Baru Masuk' : 'Tepat Waktu'
        statusColor = 'bg-emerald-100 text-emerald-800'
      }
    }

    // Metode presensi
    let methodIcon = 'help_outline'
    let methodLabel = '-'
    if (s.method) {
      if (s.method.includes('Face')) {
        methodIcon = 'face'
        methodLabel = 'Face Recognition'
      } else if (s.method.includes('QR')) {
        methodIcon = 'qr_code_scanner'
        methodLabel = 'QR Code'
      } else if (s.method.includes('Mobile') || s.method.includes('GPS')) {
        methodIcon = 'gps_fixed'
        methodLabel = 'Mobile GPS'
      } else {
        methodIcon = 'help_outline'
        methodLabel = s.method
      }
    }

    // Geofence
    const isOutsideRadius = s.outsideRadius === true
    const distance = 20 + (s.id % 30) // simulasi jarak
    const geofenceLabel = isOutsideRadius
      ? `Di Luar Radius (${distance}m)`
      : `Dalam Radius (${distance}m)`
    const geofenceColor = isOutsideRadius ? 'text-red-600' : 'text-emerald-600'
    const geofenceIcon = isOutsideRadius ? 'gps_off' : 'gps_fixed'

    return {
      id: s.id,
      initials: initialsOf(s.name),
      name: s.name,
      niy: s.niy,
      unit: unit ? unit.nama : '-',
      unitColor,
      status,
      statusColor,
      method: { icon: methodIcon, label: methodLabel },
      location: { icon: geofenceIcon, label: geofenceLabel, color: geofenceColor },
      time: s.masuk ? `${s.masuk} WIB` : '-',
      timeAgo: `${idx * 4 + 12} detik lalu`,
      highlight: idx === 0,
      rowBg: lateMinutes > 0 ? 'bg-amber-50/30' : '',
      outsideRadius: isOutsideRadius,
      lateMinutes,
    }
  })
}

export { initialsOf, buildAttendance }

export function selectCurrentUser(state) {
  return state.currentUser
}

// ===== SCOPE UNIT =====
// Satu sumber kebenaran untuk "unit terpilih": state.selectedUnitId,
// yang selalu divalidasi terhadap role pengguna.

export function selectCurrentUserRole(state) {
  return state.currentUser?.role || ROLE_GURU
}

// Hanya Superadmin yang punya selector unit.
export function selectCanSwitchUnit(state) {
  return selectCurrentUserRole(state) === ROLE_SUPERADMIN
}

// Unit aktif hasil resolusi role: Superadmin bebas (all atau unit tertentu),
// role lain hanya boleh unit akunnya sendiri.
export function selectActiveUnitId(state) {
  const role = selectCurrentUserRole(state)
  if (role !== ROLE_SUPERADMIN) {
    return state.currentUser?.unitId || ALL_UNITS
  }
  const selected = state.selectedUnitId
  if (selected === ALL_UNITS) return ALL_UNITS
  return state.units.some((u) => u.id === selected) ? selected : ALL_UNITS
}

export function selectIsAllUnits(state) {
  return selectActiveUnitId(state) === ALL_UNITS
}

// Opsi unit sesuai hak akses role.
export function selectUnitOptions(state) {
  const units = selectUnitOptionsById(state)
  if (selectCanSwitchUnit(state)) {
    return ['Semua Unit (Pusat)', ...units.map((u) => u.nama)]
  }
  return units.length > 0 ? [units[0].nama] : []
}

export function selectUnitOptionsById(state) {
  if (selectCanSwitchUnit(state)) return state.units
  const activeId = selectActiveUnitId(state)
  return state.units.filter((u) => u.id === activeId)
}

export function selectActiveUnitLabel(state) {
  if (selectIsAllUnits(state)) return 'Semua Unit'
  return selectUnitName(state, selectActiveUnitId(state))
}

// Unit yang boleh dilihat role ini: Superadmin melihat seluruh unit saat
// "Semua Unit" aktif, role lain hanya unit sendiri.
export function selectVisibleUnits(state) {
  if (selectIsAllUnits(state)) return state.units
  return state.units.filter((u) => u.id === selectActiveUnitId(state))
}

// Staff setelah pembatasan unit terpilih — dipakai semua halaman.
export function selectScopedStaff(state) {
  if (selectIsAllUnits(state)) return state.staff
  const activeId = selectActiveUnitId(state)
  return state.staff.filter((s) => s.unitId === activeId)
}

export function selectScopedLeaves(state) {
  if (selectIsAllUnits(state)) return state.leaves
  const staffIds = new Set(selectScopedStaff(state).map((s) => s.id))
  return state.leaves.filter((l) => staffIds.has(l.staffId))
}

export function selectScopedLogs(state) {
  if (selectIsAllUnits(state)) return state.logs
  const activeId = selectActiveUnitId(state)
  const unitName = selectUnitName(state, activeId)
  const staffNames = new Set(selectScopedStaff(state).map((s) => s.name))
  return state.logs.filter(
    (l) => (l.unitId && l.unitId === activeId) || l.unit === unitName || staffNames.has(l.actor),
  )
}

export function selectScopedAdminUsers(state) {
  if (selectIsAllUnits(state)) return state.adminUsers
  const activeId = selectActiveUnitId(state)
  return state.adminUsers.filter((u) => u.unitId === activeId)
}

export function generateLogTime() {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const day = String(now.getDate()).padStart(2, '0')
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

export function createActivityLog(state, action, target, desc, actorName = null, actorRole = null, actorUnitId = null) {
  const currentUser = selectCurrentUser(state)
  const logId = state.logs.length === 0 ? 1 : Math.max(0, ...state.logs.map((l) => l.id)) + 1
  const actor = actorName || currentUser?.name || 'Sistem'
  const role = actorRole || currentUser?.role || 'Sistem'
  const unitId = actorUnitId || currentUser?.unitId
  let unit = '-'
  if (unitId) {
    const u = state.units.find((un) => un.id === unitId)
    if (u) unit = u.nama
  }
  return {
    id: logId,
    time: generateLogTime(),
    actor,
    role,
    unit,
    action,
    target,
    desc,
  }
}

export function addActivityLog(dispatch, state, action, target, desc, actorName = null, actorRole = null, actorUnitId = null) {
  const log = createActivityLog(state, action, target, desc, actorName, actorRole, actorUnitId)
  dispatch({ type: 'ADD_LOG', payload: log })
}

export function hasMenuPermission(state, menuKey) {
  const role = selectCurrentUserRole(state)
  const permissions = state.permissionMatrix?.[role]
  if (!permissions) return false
  return permissions[menuKey]?.includes('view') ?? false
}

export function getVisibleMenuKeys(state) {
  return MENU_OPTIONS.filter((menu) => hasMenuPermission(state, menu.key)).map((m) => m.key)
}
