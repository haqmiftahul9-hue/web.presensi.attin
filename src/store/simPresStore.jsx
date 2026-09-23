import { createContext, useContext, useReducer, useMemo } from 'react'
import {
  UNITS, STAFF, LEAVES, ADMIN_USERS, INITIAL_LOGS,
  INITIAL_SETTINGS, WEEKLY_TREND, HOLIDAYS, buildFullStaff, buildAttendance, initialsOf,
} from '../data/seed.js'

// ARSITEKTUR SATU SUMBER DATA:
// - Entitas kanonis hanya disimpan sekali (staff/units/leaves/adminUsers/logs/settings).
// - Presensi (attendance) BUKAN salinan tersimpan, melainkan TURUNAN dari state.staff
//   yang dibangun ulang setiap perubahan, sehingga tidak pernah bisa stale/sinkron.
const initialStaff = buildFullStaff()

const initialState = {
  staff: initialStaff,
  units: UNITS,
  leaves: LEAVES,
  adminUsers: ADMIN_USERS,
  logs: INITIAL_LOGS,
  settings: INITIAL_SETTINGS,
  weeklyTrend: WEEKLY_TREND,
  holidays: HOLIDAYS,
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
      }
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.payload] }
    case 'UPDATE_UNIT':
      return {
        ...state,
        units: state.units.map((u) =>
          u.id === action.payload.id ? { ...u, ...action.payload } : u,
        ),
      }
    case 'UPDATE_ATTENDANCE':
      // Tulis-langsung ke sumber data (staff); attendance adalah turunan.
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
      }
    case 'ADD_ATTENDANCE':
      // Presensi baru = pegawai baru pada sumber data staff.
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
      }
    case 'CHECK_IN':
      // Cukup tulis ke staff; attendance ter-derive otomatis (satu sumber data).
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.id
            ? { ...s, masuk: action.payload.masuk, method: action.payload.method, late: action.payload.late ?? 0, status: 'Aktif' }
            : s,
        ),
      }
    case 'ADD_LOG':
      return { ...state, logs: [action.payload, ...state.logs] }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
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

export function selectActiveStaff(state) {
  return state.staff.filter((s) => s.status === 'Aktif')
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
    state.leaves
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

export function selectUnitSummary(state) {
  return state.units.map((unit) => {
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

export function selectBelumPresensi(state) {
  return selectActiveStaff(state).filter((s) => !s.masuk).length
}

export function selectLeavesByStatus(state, status) {
  if (!status || status === 'semua') return state.leaves
  return state.leaves.filter((l) => l.status === status)
}

export function selectPendingLeaves(state) {
  return state.leaves.filter((l) => l.status === 'Menunggu').length
}

export function selectApprovedLeaves(state) {
  return state.leaves.filter((l) => l.status === 'Disetujui').length
}

export function selectRejectedLeaves(state) {
  return state.leaves.filter((l) => l.status === 'Ditolak').length
}

export function selectStaffById(state, id) {
  return state.staff.find((s) => s.id === id)
}

export function selectUnitById(state, id) {
  return state.units.find((u) => u.id === id)
}

export function selectUnitName(state, unitId) {
  const unit = selectUnitById(state, unitId)
  return unit ? unit.nama : '-'
}

export function selectUnitOptions(state) {
  return ['Semua Unit (Pusat)', ...state.units.map((u) => u.nama)]
}

export function selectLeavesEnriched(state) {
  return state.leaves.map((l) => {
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
  return state.attendance || buildAttendance(state.staff)
}

export function selectAttendanceByUnit(state, unitId) {
  return selectAttendance(state).filter((a) => a.unitId === unitId)
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

export function selectRekapTableData(state) {
  return state.staff.slice(0, 8).map((s) => {
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

export function selectRankingData(state) {
  const active = selectActiveStaff(state)
  const sortedByLate = [...active].sort((a, b) => a.late - b.late)
  const topOnTime = sortedByLate.slice(0, 10).map((s, idx) => ({
    rank: idx + 1,
    initials: initialsOf(s.name),
    name: s.name,
    unit: state.units.find((u) => u.id === s.unitId)?.nama || '-',
    role: s.role,
    late: `${idx < 10 ? '0x' : ''} Terlambat`,
    stat: idx === 0 ? '100% Kehadiran' : `Rata-rata tiba ${s.masuk || '07:00'} WIB`,
    statSub: idx === 0 ? '22 Hari' : '',
    badgeColor: 'bg-secondary-fixed',
    badgeText: 'text-on-secondary-fixed',
  }))
  const topLate = [...active].filter((s) => s.late > 0).sort((a, b) => b.late - a.late).slice(0, 10).map((s, idx) => ({
    rank: idx + 1,
    initials: initialsOf(s.name),
    name: s.name,
    unit: state.units.find((u) => u.id === s.unitId)?.nama || '-',
    role: s.role,
    count: `${s.late} kali terlambat`,
    avg: `Rata-rata ${s.late} menit`,
    totalMin: `${s.late * 18} mnt`,
    badge: idx === 0 ? 'Teguran' : `${s.late}x`,
    badgeBg: idx === 0 ? 'bg-secondary-fixed' : 'bg-surface-container-high',
    badgeText: idx === 0 ? 'text-secondary' : 'text-error',
  }))
  const insentif = sortedByLate.slice(0, 7).map((s) => ({
    initials: initialsOf(s.name),
    name: s.name,
    unit: state.units.find((u) => u.id === s.unitId)?.nama || '-',
    desc: `${s.late === 0 ? '0x' : s.late + 'x'} Terlambat • ${s.late === 0 ? '100%' : (90 - s.late)}% Kehadiran`,
  }))
  const unitLateAvg = state.units.map((u) => {
    const staffInUnit = active.filter((s) => s.unitId === u.id)
    const avg = staffInUnit.length > 0
      ? (staffInUnit.reduce((sum, s) => sum + s.late, 0) / staffInUnit.length).toFixed(1)
      : '0.0'
    return {
      unit: u.nama,
      avg: `${avg} Mnt`,
      pct: avg > 8 ? 80 : Math.min(98, 70 + Math.round(avg * 3)),
    }
  })
  const pembinaan = active.filter((s) => s.late > 5).slice(0, 2).map((s) => ({
    initials: initialsOf(s.name),
    name: s.name,
    unit: state.units.find((u) => u.id === s.unitId)?.nama || '-',
    action: 'Disiplin 5 Hari',
    icon: 'assignment',
  }))
  return { topOnTime, topLate, insentif, toleransi: unitLateAvg, pembinaan }
}

export function selectMonitoringActivity(state) {
  return selectRecentActivity(state).map((s, idx) => {
    const unit = state.units.find((u) => u.id === s.unitId)
    const unitColor = unit?.id === 'sd' ? 'bg-blue-100 text-secondary'
      : unit?.id === 'smp' ? 'bg-slate-100 text-slate-800'
        : unit?.id === 'sma' ? 'bg-indigo-100 text-indigo-800'
          : unit?.id === 'tk' ? 'bg-indigo-100 text-indigo-800'
            : 'bg-purple-100 text-purple-800'
    const isTerlambat = s.late > 0
    return {
      id: s.id,
      initials: initialsOf(s.name),
      name: s.name,
      niy: s.niy,
      unit: unit ? unit.nama : '-',
      unitColor,
      status: isTerlambat ? `Terlambat (${s.late} mnt)` : (idx === 0 ? 'Baru Masuk' : 'Tepat Waktu'),
      statusColor: isTerlambat ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
      method: { icon: s.method?.includes('Face') ? 'face' : 'qr_code_scanner', label: s.method ? `${s.method} Presensi` : 'Face Recognition' },
      location: { icon: 'near_me', label: `Dalam Geofence (${20 + (s.id % 30)}m)`, color: 'text-on-surface-variant' },
      time: s.masuk ? `${s.masuk} WIB` : '-',
      timeAgo: `${idx * 4 + 12} detik lalu`,
      highlight: idx === 0,
      rowBg: isTerlambat ? 'bg-amber-50/30' : '',
    }
  })
}

export { initialsOf }
