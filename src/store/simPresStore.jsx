import { createContext, useContext, useReducer, useMemo } from 'react'
import {
  UNITS, STAFF, LEAVES, ADMIN_USERS, INITIAL_LOGS,
  INITIAL_SETTINGS, WEEKLY_TREND, TREND_30, HOLIDAYS, buildFullStaff, buildAttendance, initialsOf,
  initialStaffPassword,
} from '../data/seed.js'
import {
  buildEmployeeCard, buildEmployeeCards, cardQrValue, cardBarcodeValue,
  todayISO, addYears, DEFAULT_VALIDITY_YEARS, statusKepegawaianGroup,
} from '../data/employeeCard.js'

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
    cetakKartuId: ['view', 'add'],
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
    // Admin Unit boleh mencetak, tapi hanya pegawai unitnya sendiri: pembatasan
    // datanya ditegakkan oleh selectScopedStaff(), bukan oleh menu.
    cetakKartuId: ['view', 'add'],
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
    cetakKartuId: [],
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
    cetakKartuId: [],
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

// Peta path -> menu key. Dipakai bersama oleh guard rute dan penentuan
// halaman tujuan setelah login, supaya keduanya memakai satu daftar yang sama.
export const ROUTE_MENU_KEYS = {
  '/': 'dashboard',
  '/unit-sd-islam-rj': 'manajemenUnit',
  '/manajemen-admin-user': 'manajemenAdminUser',
  '/data-guru-dan-pegawai': 'dataGuruPegawai',
  '/cetak-kartu-id': 'cetakKartuId',
  '/presensi': 'presensi',
  '/rekap-dan-laporan': 'rekapLaporan',
  '/ranking-kehadiran': 'rankingKehadiran',
  '/pengajuan-izin-dan-cuti': 'pengajuanIzinCuti',
  '/log-aktivitas': 'logAktivitas',
  '/pengaturan-global': 'pengaturanGlobal',
}

// Kandidat beranda per role, diurut dari yang paling relevan. Alur login
// mengambil path pertama yang benar-benar boleh dibuka role tersebut
// (lihat PERMISSION_MATRIX), jadi role tanpa akses dashboard tidak pernah
// terjebak redirect berulang ke "/".
export const ROLE_HOME_CANDIDATES = {
  [ROLE_SUPERADMIN]: ['/', '/manajemen-admin-user', '/unit-sd-islam-rj', '/data-guru-dan-pegawai', '/cetak-kartu-id', '/presensi', '/rekap-dan-laporan', '/pengaturan-global', '/log-aktivitas'],
  [ROLE_ADMIN_UNIT]: ['/', '/data-guru-dan-pegawai', '/cetak-kartu-id', '/presensi', '/pengajuan-izin-dan-cuti', '/rekap-dan-laporan', '/ranking-kehadiran', '/log-aktivitas'],
  [ROLE_GURU]: ['/presensi', '/pengajuan-izin-dan-cuti', '/', '/data-guru-dan-pegawai', '/rekap-dan-laporan', '/ranking-kehadiran'],
  [ROLE_PETUGAS_PRESENSI]: ['/presensi', '/', '/data-guru-dan-pegawai', '/rekap-dan-laporan', '/ranking-kehadiran', '/pengajuan-izin-dan-cuti', '/log-aktivitas'],
}

// Kata sandi awal seluruh akun seed yang tidak punya kata sandi sendiri
// (mis. akun yang dibuat lewat portal). Pada aplikasi nyata nilai ini berasal
// dari server; di sini satu konstanta agar alur login tetap bisa dicoba tanpa
// backend, dan tetap bisa ditimpa per akun lewat field `password` (hasil
// reset/kirim kredensial). Akun Guru/Pegawai memakai initialStaffPassword()
// dari data/seed.js (format "<NIY>@2026"), bukan konstanta ini.
export const INITIAL_ACCOUNT_PASSWORD = 'SimPresSecure2026!'

const AUTH_SESSION_KEY = 'simpres.auth.session'

export const AUTH_ERRORS = {
  EMPTY_IDENTIFIER: 'NIY, username, atau email dinas wajib diisi.',
  EMPTY_PASSWORD: 'Kata sandi wajib diisi.',
  NOT_FOUND: 'Akun tidak ditemukan. Periksa kembali username, NIY, atau email dinas Anda.',
  WRONG_PASSWORD: 'Login gagal. Username atau kata sandi salah.',
  INACTIVE: 'Akun Anda sedang nonaktif. Hubungi administrator unit untuk mengaktifkannya kembali.',
  NO_PERMISSION: 'Akun Anda belum memiliki hak akses pada modul SimPres.',
  PASSWORD_TOO_SHORT: 'Kata sandi baru belum memenuhi minimal panjang yang diwajibkan.',
  PASSWORD_MISMATCH: 'Konfirmasi kata sandi tidak sama dengan kata sandi baru.',
  PASSWORD_SAME: 'Kata sandi baru harus berbeda dari kata sandi lama.',
}

// Pesan khusus saat role mencoba mengganti kata sandi lewat jalur yang tidak
// diberikan haknya (mis. Superadmin, atau aksi yang dikirim langsung ke store).
export const PASSWORD_CHANGE_FORBIDDEN =
  'Peran Anda tidak diizinkan mengganti kata sandi dari menu pengguna. Hubungi pengelola sistem SimPres.'

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
  // Tabel employee_card. Satu baris per pegawai; isinya hanya metadata
  // penerbitan kartu (QR, barcode, masa berlaku, riwayat cetak). Identitas,
  // jabatan, unit, dan foto TIDAK disalin di sini — kartu membacanya langsung
  // dari `staff`, jadi perubahan data pegawai langsung tercermin di halaman
  // Cetak Kartu ID.
  employeeCards: buildEmployeeCards(initialStaff),
  logs: INITIAL_LOGS,
  settings: INITIAL_SETTINGS,
  weeklyTrend: WEEKLY_TREND,
  trend30: TREND_30,
  holidays: HOLIDAYS,
  permissionMatrix: PERMISSION_MATRIX,
  // Sesi login. currentUser null = belum masuk; authenticateCredentials()
  // yang mengisinya, sehingga aplikasi tidak pernah diam-diamauto-login.
  currentUser: null,
  isAuthenticated: false,
  authStatus: 'idle',
  authError: null,
  attendanceHistory: initialAttendanceHistory,
  // Kata sandi hasil penggantian untuk akun yang TIDAK punya baris di
  // adminUsers (akun Guru/Pegawai diturunkan dari data pegawai, jadi tidak
  // ada objek akun yang bisa menyimpan field `password`). Key = id pegawai.
  // Berlaku selama sesi aplikasi; pada aplikasi nyata ini disimpan di server.
  staffCredentials: {},
  // Permintaan buka form ganti kata sandi (dipakai tombol di sidebar dan oleh
  // akun ber-mustChangePassword). False = pengguna bebas memakai sistem.
  passwordChangeRequested: false,
  // Unit yang sedang dilihat. Hanya Superadmin yang boleh mengubahnya
  // (termasuk ke "Semua Unit"); role lain selalu mengikuti unit akunnya.
  selectedUnitId: ALL_UNITS,
}

// Reducer diekspor agar aturan reduksi bisa diuji tanpa merender provider.
export function simPresReducer(state, action) {
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
        employeeCards: syncEmployeeCardsFromStaff(state.employeeCards, action.payload, 'update'),
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
        employeeCards: syncEmployeeCardsFromStaff(state.employeeCards, staffToAdd, 'add'),
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
        // Kartu ikut dibuang agar tabel employee_card tidak menyimpan baris
        // untuk pegawai yang sudah tidak ada di source data.
        employeeCards: state.employeeCards.filter((c) => c.employee_id !== staffId),
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
    // Riwayat cetak kartu: printed_count naik satu kali per proses cetak,
    // last_printed_at diisi waktu yang benar-benar dicetak.
    case 'MARK_CARDS_PRINTED': {
      const ids = new Set(action.payload.employeeIds || [])
      if (ids.size === 0) return state
      const at = action.payload.at || new Date().toISOString()
      return {
        ...state,
        employeeCards: state.employeeCards.map((c) =>
          ids.has(c.employee_id)
            ? { ...c, printed_count: (c.printed_count || 0) + 1, last_printed_at: at }
            : c,
        ),
      }
    }
    // Masa berlaku kartu untuk sekumpulan pegawai terpilih.
    case 'SET_CARD_VALIDITY': {
      const ids = new Set(action.payload.employeeIds || [])
      if (ids.size === 0) return state
      const issued = action.payload.issuedDate || todayISO()
      const expired = action.payload.expiredDate || addYears(issued, action.payload.validityYears || DEFAULT_VALIDITY_YEARS)
      return {
        ...state,
        employeeCards: state.employeeCards.map((c) =>
          ids.has(c.employee_id) ? { ...c, issued_date: issued, expired_date: expired } : c,
        ),
      }
    }
    case 'UPDATE_PERMISSIONS':
      return { ...state, permissionMatrix: action.payload }
    case 'SET_CURRENT_USER': {
      // Ganti akun = unit ikut akun baru, bukan sisa pilihan sebelumnya.
      return {
        ...state,
        currentUser: action.payload,
        selectedUnitId: initialUnitScope(action.payload),
        passwordChangeRequested: false,
      }
    }
    case 'LOGIN_START':
      return { ...state, authStatus: 'loading', authError: null }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        currentUser: action.payload.user,
        isAuthenticated: true,
        selectedUnitId: initialUnitScope(action.payload.user),
        authStatus: 'idle',
        authError: null,
        passwordChangeRequested: false,
      }
    case 'LOGIN_FAILURE':
      return { ...state, isAuthenticated: false, currentUser: null, authStatus: 'error', authError: action.payload }
    case 'LOGOUT':
      return {
        ...state,
        currentUser: null,
        isAuthenticated: false,
        selectedUnitId: ALL_UNITS,
        authStatus: 'idle',
        authError: null,
        passwordChangeRequested: false,
      }
    case 'REQUEST_PASSWORD_CHANGE':
      // Lapis reducer: role yang tidak berwenang tidak bisa memaksa form
      // ganti kata sandi dibuka, apa pun yang dikirim komponen.
      if (!selectCanChangeOwnPassword(state)) return state
      return { ...state, passwordChangeRequested: true }
    case 'CHANGE_PASSWORD': {
      // Lapis reducer kedua: percobaan mengganti kata sandi oleh role yang
      // dilarang (Superadmin) diabaikan, bukan sekadar ditolak formnya.
      if (!selectCanChangeOwnPassword(state)) return state
      // Akun portal (baris di adminUsers) menyimpan kata sandi barunya sendiri;
      // akun pegawai menyimpan ke staffCredentials karena tidak punya baris akun.
      const { account, password } = action.payload
      if (!account || !password) return state
      if (account.isStaffAccount) {
        return {
          ...state,
          staffCredentials: {
            ...state.staffCredentials,
            [account.staffId]: { password, mustChangePassword: false },
          },
          currentUser: account.staffId === state.currentUser?.staffId
            ? { ...state.currentUser, password, mustChangePassword: false }
            : state.currentUser,
          passwordChangeRequested: false,
        }
      }
      return {
        ...state,
        adminUsers: state.adminUsers.map((u) =>
          u.id === account.id ? { ...u, password, mustChangePassword: false } : u,
        ),
        currentUser: account.id === state.currentUser?.id
          ? { ...state.currentUser, password, mustChangePassword: false }
          : state.currentUser,
        passwordChangeRequested: false,
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

// ===== AUTENTIKASI =====
// Sesi hanya menyimpan identitas (tanpa kata sandi) dan selalu diturunkan ulang
// dari data aplikasi saat start. Jadi role atau status akun yang berubah di
// aplikasi langsung berlaku, dan akun yang sudah dihapus tidak bisa "dihidupkan"
// lagi lewat sisa sesi di browser.

function readStoredSession() {
  if (typeof window === 'undefined') return null
  const stores = []
  try { stores.push(window.sessionStorage) } catch { /* storage diblokir */ }
  try { stores.push(window.localStorage) } catch { /* storage diblokir */ }
  for (const store of stores) {
    try {
      const raw = store.getItem(AUTH_SESSION_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* data rusak / tidak terbaca */ }
  }
  return null
}

function clearStoredSession() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(AUTH_SESSION_KEY) } catch { /* storage diblokir */ }
  try { window.sessionStorage.removeItem(AUTH_SESSION_KEY) } catch { /* storage diblokir */ }
}

// "Ingat saya" -> localStorage (bertahan setelah browser ditutup),
// selain itu sessionStorage (hanya untuk tab ini saja).
function writeStoredSession(session, remember) {
  if (typeof window === 'undefined') return
  clearStoredSession()
  try {
    const store = remember ? window.localStorage : window.sessionStorage
    store.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  } catch { /* storage penuh / diblokir: sesi tetap jalan di memori */ }
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

function identifierMatches(account, key) {
  const username = normalizeIdentifier(account.username)
  const niy = normalizeIdentifier(account.niy)
  const email = normalizeIdentifier(account.email)
  return (username !== '' && username === key) || (niy !== '' && niy === key) || (email !== '' && email === key)
}

// Kunci yang dipakai untuk menulis ulang sesi browser. Urutannya mengikuti
// prioritas form login: username, lalu NIY, lalu email dinas.
export function accountLoginKey(account) {
  if (!account) return ''
  return normalizeIdentifier(account.username || account.niy || account.email)
}

// Akun Guru/Pegawai tidak punya baris di adminUsers, jadi kata sandi awalnya
// dihitung dari NIY: "<NIY>@2026" dan selalu wajib diganti saat login pertama
// (lihat INITIAL_SETTINGS.keamanan.wajibGantiPasswordPertama).
function buildStaffAccount(state, staff) {
  const override = state.staffCredentials?.[staff.id]
  return {
    id: `staff-${staff.id}`,
    staffId: staff.id,
    name: staff.name,
    niy: staff.niy,
    username: staff.niy,
    email: staff.email,
    role: ROLE_GURU,
    unitId: staff.unitId,
    status: staff.status,
    isStaffAccount: true,
    password: override?.password || initialStaffPassword(staff.niy),
    mustChangePassword: override ? Boolean(override.mustChangePassword) : true,
  }
}

// Akun portal = baris di adminUsers (Superadmin, Admin Unit, Petugas Presensi).
// Guru/Pegawai tidak punya baris di sana, jadi akunnya diturunkan dari data
// pegawai: role Guru, unit mengikuti penugasan, status mengikuti keaktifan pegawai.
export function findAccountByIdentifier(state, identifier) {
  const key = normalizeIdentifier(identifier)
  if (!key) return null

  const adminUser = state.adminUsers.find((u) => identifierMatches(u, key))
  if (adminUser) return { ...adminUser, isStaffAccount: false }

  const staff = state.staff.find((s) => identifierMatches(s, key))
  if (staff) return buildStaffAccount(state, staff)

  return null
}

export function roleCanViewMenu(state, role, menuKey) {
  const permissions = state.permissionMatrix?.[role]
  if (!permissions) return false
  return permissions[menuKey]?.includes('view') ?? false
}

// Halaman tujuan setelah login: kembali ke URL yang tadi dicoba kalau role
// memang berwenang, kalau tidak ke beranda role tersebut.
export function resolvePostLoginPath(state, user, requestedPath) {
  const role = user?.role
  const allowed = (path) => {
    const menuKey = ROUTE_MENU_KEYS[path]
    return menuKey ? roleCanViewMenu(state, role, menuKey) : false
  }
  if (requestedPath && allowed(requestedPath)) return requestedPath
  const candidates = ROLE_HOME_CANDIDATES[role] || ROLE_HOME_CANDIDATES[ROLE_GURU]
  return candidates.find(allowed) || '/'
}

export function authenticateCredentials(state, identifier, password) {
  if (!normalizeIdentifier(identifier)) return { ok: false, error: AUTH_ERRORS.EMPTY_IDENTIFIER }
  if (!password) return { ok: false, error: AUTH_ERRORS.EMPTY_PASSWORD }

  const account = findAccountByIdentifier(state, identifier)
  if (!account) return { ok: false, error: AUTH_ERRORS.NOT_FOUND }
  if (account.status !== 'Aktif') return { ok: false, error: AUTH_ERRORS.INACTIVE }

  const expectedPassword = account.password || INITIAL_ACCOUNT_PASSWORD
  if (password !== expectedPassword) return { ok: false, error: AUTH_ERRORS.WRONG_PASSWORD }
  if (!state.permissionMatrix?.[account.role]) return { ok: false, error: AUTH_ERRORS.NO_PERMISSION }

  return { ok: true, user: account }
}

// Panjang minimum mengikuti kebijakan keamanan di Pengaturan Global, dengan
// batas bawah 8 karakter supaya form tidak bisa diturunkan lebih longgar.
export function selectMinPasswordLength(state) {
  const configured = Number(state.settings?.keamanan?.minimalPassword)
  return Number.isFinite(configured) && configured > 0 ? Math.max(8, configured) : 8
}

// Validasi form ganti kata sandi. Sama seperti login, hasilnya Result type
// ({ ok, error }) supaya komponen cukup merender satu pesan galat.
export function validatePasswordChange(state, { currentPassword, newPassword, confirmPassword }) {
  const account = state.currentUser
  if (!account) return { ok: false, error: AUTH_ERRORS.NOT_FOUND }
  if (!selectCanChangeOwnPassword(state)) return { ok: false, error: PASSWORD_CHANGE_FORBIDDEN }
  if (!currentPassword) return { ok: false, error: 'Kata sandi lama wajib diisi.' }
  if (!newPassword) return { ok: false, error: 'Kata sandi baru wajib diisi.' }
  if (!confirmPassword) return { ok: false, error: 'Konfirmasi kata sandi wajib diisi.' }
  if (newPassword !== confirmPassword) return { ok: false, error: AUTH_ERRORS.PASSWORD_MISMATCH }
  if (newPassword.length < selectMinPasswordLength(state)) {
    return { ok: false, error: `Kata sandi baru minimal ${selectMinPasswordLength(state)} karakter.` }
  }
  if (newPassword === currentPassword) return { ok: false, error: AUTH_ERRORS.PASSWORD_SAME }
  if (currentPassword !== (account.password || INITIAL_ACCOUNT_PASSWORD)) {
    return { ok: false, error: AUTH_ERRORS.WRONG_PASSWORD }
  }
  return { ok: true }
}

function describeDevice() {
  if (typeof navigator === 'undefined') return 'Perangkat Tidak Diketahui'
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) || /Chrome\//.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) ? 'Safari'
        : /Firefox\//.test(ua) ? 'Firefox'
          : 'Browser'
  const platform = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
        : /Mac/.test(ua) ? 'macOS'
          : /Linux/.test(ua) ? 'Linux'
            : 'Sistem'
  return `${browser} • ${platform}`
}

// Penundaan singkat supaya state "memproses" di tombol terlihat, meniru
// proses verifikasi di server sebelum sesi diterbitkan.
const LOGIN_LATENCY_MS = 600

// Sesi hanya menyimpan identitas: kata sandi dan status wajib-ganti-password
// tidak pernah ditulis ke storage browser. Status wajib-ganti selalu dibaca
// ulang dari data aplikasi, jadi logout lalu login ulang tidak bisa
// memaksa pengguna melewati penggantian kata sandi.
export function sanitizeSessionUser(user) {
  if (!user) return null
  const { password, mustChangePassword, ...identity } = user
  return identity
}

export async function performLogin({ state, dispatch, identifier, password, remember, requestedPath }) {
  dispatch({ type: 'LOGIN_START' })
  await new Promise((resolve) => setTimeout(resolve, LOGIN_LATENCY_MS))

  const result = authenticateCredentials(state, identifier, password)
  if (!result.ok) {
    dispatch({ type: 'LOGIN_FAILURE', payload: result.error })
    return { ok: false, error: result.error }
  }

  const user = result.user
  // Path dihitung dari state pasca-login, bukan state lama yang currentUser-nya null.
  const loggedInState = { ...state, currentUser: user, isAuthenticated: true, selectedUnitId: initialUnitScope(user) }
  const path = resolvePostLoginPath(loggedInState, user, requestedPath)

  dispatch({ type: 'LOGIN_SUCCESS', payload: { user, remember } })
  writeStoredSession({ user: sanitizeSessionUser(user), remember, at: Date.now() }, remember)
  addActivityLog(
    dispatch,
    loggedInState,
    'Login',
    'Sesi • Web',
    `Login ${accountLoginKey(user)} (${describeDevice()})`,
    user.name,
    user.role,
    user.unitId,
  )

  return { ok: true, path }
}

export function performLogout(dispatch) {
  clearStoredSession()
  dispatch({ type: 'LOGOUT' })
}

function initWithStoredSession(state) {
  const stored = readStoredSession()
  if (!stored?.user) return state

  const account = findAccountByIdentifier(state, accountLoginKey(stored.user))
  if (!account || account.status !== 'Aktif' || !state.permissionMatrix?.[account.role]) {
    clearStoredSession()
    return { ...state, currentUser: null, isAuthenticated: false }
  }

  return {
    ...state,
    currentUser: account,
    isAuthenticated: true,
    selectedUnitId: initialUnitScope(account),
  }
}

export function selectIsAuthenticated(state) {
  return Boolean(state.isAuthenticated && state.currentUser)
}

export function selectAuthStatus(state) {
  return state.authStatus || 'idle'
}

export function selectAuthError(state) {
  return state.authError || null
}

export function selectIsAuthenticating(state) {
  return selectAuthStatus(state) === 'loading'
}

const SimPresContext = createContext(null)

// Baris presensi yang jadi sumber state.attendance. Guru/Pegawai hanya getting
// barisnya sendiri; role lain tetap dari seluruh data pegawai supaya filter
// unit di halaman tetap bekerja seperti sebelumnya.
function attendanceSource(state) {
  if (!selectIsSelfScope(state)) return state.staff
  const staffId = selectSelfStaffId(state)
  return state.staff.filter((s) => s.id === staffId)
}

export function SimPresProvider({ children }) {
  const [state, dispatch] = useReducer(simPresReducer, initialState, initWithStoredSession)
  // attendance selalu turunan data pegawai (satu sumber data presensi).
  const value = useMemo(
    () => ({ state: { ...state, attendance: buildAttendance(attendanceSource(state)) }, dispatch }),
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
  { key: 'cetakKartuId', label: 'Cetak Kartu ID' },
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

// ===== Kartu ID Pegawai =====
// Tabel employee_card hanya boleh berisi baris untuk pegawai yang ada di
// source data. Fungsi ini menjaga kedua sisi tetap sinkron pada setiap
// tambah/ubah/hapus pegawai, tanpa menyalin field identitas ke tabel kartu.

function syncEmployeeCardsFromStaff(cards, staff, mode) {
  const list = cards || []
  if (!staff) return list
  if (mode === 'delete') return list.filter((c) => c.employee_id !== staff.id)

  const existing = list.find((c) => c.employee_id === staff.id)
  if (!existing) return [...list, buildEmployeeCard(staff)]

  // Hanya QR + barcode yang ikut berubah dari sisi pegawai (keduanya memuat
  // NIY). Masa berlaku dan riwayat cetak milik kartu, jadi tidak disentuh.
  const qr = cardQrValue(staff)
  const barcode = cardBarcodeValue(staff)
  if (existing.qr_code === qr && existing.barcode === barcode) return list
  return list.map((c) => (c.employee_id === staff.id ? { ...c, qr_code: qr, barcode } : c))
}

export function selectEmployeeCard(state, employeeId) {
  return (state.employeeCards || []).find((c) => c.employee_id === employeeId) || null
}

export function selectEmployeeCards(state) {
  return state.employeeCards || []
}

/**
 * Data siap cetak: satu baris per pegawai, digabung dengan baris employee_card
 * milik-nya. Identitas/jabatan/unit/foto diambil dari data pegawai terkini,
 * sedangkan masa berlaku & riwayat cetak diambil dari tabel kartu.
 */
export function selectCardRows(state, staffList) {
  const cards = new Map((state.employeeCards || []).map((c) => [c.employee_id, c]))
  return (staffList || []).map((staff) => {
    const card = cards.get(staff.id) || buildEmployeeCard(staff)
    return {
      staff,
      card,
      // QR & barcode dihitung ulang dari NIY terkini supaya kartu lama tetap
      // konsisten dengan data pegawai yang baru saja diedit.
      qr: cardQrValue(staff),
      barcode: cardBarcodeValue(staff),
      unit: selectUnitName(state, staff.unitId),
      unitKode: selectUnitById(state, staff.unitId)?.kode || '-',
      initials: initialsOf(staff.name),
      statusGroup: statusKepegawaianGroup(staff.statusPegawai),
    }
  })
}

/** Nilai status kepegawaian yang benar-benar ada pada data saat ini. */
export function selectStatusKepegawaianOptions(state) {
  const values = new Set(
    selectScopedStaff(state)
      .map((s) => String(s.statusPegawai || '').trim())
      .filter(Boolean),
  )
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'id'))
}

/**
 * Satu-satunya sumber filtering halaman Cetak Kartu ID: pembatasan unit
 * (Superadmin = semua unit, role lain = unitnya sendiri) lalu pencarian
 * nama/NIY/NIP/jabatan dan filter status kepegawaian + status aktif.
 */
export function selectFilteredCardStaff(state, {
  unitId = ALL_UNITS,
  searchTerm = '',
  statusPegawai = 'all',
  status = 'all',
} = {}) {
  const q = String(searchTerm || '').trim().toLowerCase()
  const effUnit = resolveUnitFilter(state, unitId)
  return selectScopedStaff(state).filter((s) => {
    if (effUnit && s.unitId !== effUnit) return false
    if (status && status !== 'all' && s.status !== status) return false
    if (statusPegawai && statusPegawai !== 'all') {
      if (statusKepegawaianGroup(s.statusPegawai) !== statusPegawai) return false
    }
    if (!q) return true
    const unit = selectUnitById(state, s.unitId)
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.gelar || '').toLowerCase().includes(q) ||
      String(s.niy || '').toLowerCase().includes(q) ||
      String(s.nip || '').toLowerCase().includes(q) ||
      String(s.role || '').toLowerCase().includes(q) ||
      String(unit ? unit.nama : '').toLowerCase().includes(q)
    )
  })
}

export function selectCardSummary(state, staffList) {
  const list = staffList || []
  const cards = new Map((state.employeeCards || []).map((c) => [c.employee_id, c]))
  let belumPernahDicetak = 0
  let kadaluwarsa = 0
  const today = todayISO()
  for (const staff of list) {
    const card = cards.get(staff.id)
    if (!card || !card.last_printed_at) belumPernahDicetak++
    if (card?.expired_date && card.expired_date < today) kadaluwarsa++
  }
  return {
    total: list.length,
    aktif: list.filter((s) => s.status === 'Aktif').length,
    nonaktif: list.filter((s) => s.status !== 'Aktif').length,
    belumPernahDicetak,
    kadaluwarsa,
  }
}

/**
 * Tandai kartu sebagai tercetak. Sengaja memakai satu helper supaya halaman
 * cukup memanggil markCardsPrinted() tanpa harus tahu bentuk payload-nya.
 */
export function markCardsPrinted(dispatch, employeeIds) {
  if (!employeeIds || employeeIds.length === 0) return
  dispatch({
    type: 'MARK_CARDS_PRINTED',
    payload: { employeeIds, at: new Date().toISOString() },
  })
}

/** Perbarui masa berlaku kartu terpilih (tanggal terbit + masa berlaku). */
export function setCardsValidity(dispatch, employeeIds, { validityYears, issuedDate } = {}) {
  if (!employeeIds || employeeIds.length === 0) return
  const issued = issuedDate || todayISO()
  dispatch({
    type: 'SET_CARD_VALIDITY',
    payload: {
      employeeIds,
      issuedDate: issued,
      expiredDate: addYears(issued, validityYears || DEFAULT_VALIDITY_YEARS),
    },
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

// Role yang boleh mengganti kata sandinya sendiri dari menu pengguna.
// Superadmin sengaja tidak ada di sini: akun pusat dikelola lewat prosedur
// operasional, sehingga UI pengguna tidak menawarkan aksi tersebut sama sekali.
const ROLES_CAN_CHANGE_PASSWORD = [ROLE_ADMIN_UNIT, ROLE_GURU, ROLE_PETUGAS_PRESENSI]

export function selectCanChangeOwnPassword(state) {
  return ROLES_CAN_CHANGE_PASSWORD.includes(selectCurrentUserRole(state))
}

// Guru/Pegawai wajib mengganti kata sandi sebelum boleh memakai sistem: bisa
// karena akunnya ditandai (akun bawaan/reset admin) atau karena ia sendiri
// yang meminta lewat menu "Ganti Password". Akun Superadmin dikecualikan
// (lihat selectCanChangeOwnPassword) sehingga tidak pernah ikut terkunci.
export function selectMustChangePassword(state) {
  if (!selectIsAuthenticated(state)) return false
  if (!selectCanChangeOwnPassword(state)) return false
  return Boolean(state.currentUser?.mustChangePassword) || Boolean(state.passwordChangeRequested)
}

// Id pegawai yang melekat pada akun ini. Akun portal bisa terikat lewat NIY
// yang sama dengan data pegawai, jadi portofolio pribadi tetap bisa ditemukan.
export function selectSelfStaffId(state) {
  const user = state.currentUser
  if (!user) return null
  if (user.staffId != null) return user.staffId
  const niy = normalizeIdentifier(user.niy)
  if (!niy) return null
  const match = state.staff.find((s) => normalizeIdentifier(s.niy) === niy)
  return match ? match.id : null
}

// Cakupan data pribadi: Guru/Pegawai hanya boleh melihat data dan presensi
// miliknya sendiri. Akun Guru yang tidak punya baris pegawai tidak di-scope
// ke diri sendiri supaya tidak berakhir dengan halaman kosong.
export function selectIsSelfScope(state) {
  if (selectCurrentUserRole(state) !== ROLE_GURU) return false
  return selectSelfStaffId(state) != null
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
  if (selectIsSelfScope(state)) {
    const staffId = selectSelfStaffId(state)
    return state.staff.filter((s) => s.id === staffId)
  }
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
  if (selectIsSelfScope(state)) {
    // Cakupan pribadi: hanya log aktivitas milik pengguna sendiri.
    const name = state.currentUser?.name
    return state.logs.filter((l) => l.actor === name)
  }
  if (selectIsAllUnits(state)) return state.logs
  const activeId = selectActiveUnitId(state)
  const unitName = selectUnitName(state, activeId)
  const staffNames = new Set(selectScopedStaff(state).map((s) => s.name))
  return state.logs.filter(
    (l) => (l.unitId && l.unitId === activeId) || l.unit === unitName || staffNames.has(l.actor),
  )
}

export function selectScopedAdminUsers(state) {
  // Guru/Pegawai tidak mengelola akun sama sekali, jadi daftar akun dikosongkan
  // walau role-nya punya izin "view" pada modul Manajemen Admin & User.
  if (selectIsSelfScope(state)) return []
  if (selectIsAllUnits(state)) return state.adminUsers
  const activeId = selectActiveUnitId(state)
  return state.adminUsers.filter((u) => u.unitId === activeId)
}

// Daftar kredensial demo siap pakai untuk halaman login. Disusun dari data
// aplikasi (akun portal bertanda `demo` + satu contoh pegawai), jadi tetap
// akurat kalau Superadmin menambah/menonaktifkan akun lewat portal.
export function selectDemoLoginAccounts(state) {
  const portals = state.adminUsers
    .filter((u) => u.demo && u.status === 'Aktif')
    .map((u) => ({
      username: accountLoginKey(u),
      password: u.password || INITIAL_ACCOUNT_PASSWORD,
      role: u.role,
      unit: u.unitId ? selectUnitName(state, u.unitId) : 'Semua Unit',
      mustChangePassword: Boolean(u.mustChangePassword),
    }))

  const sample = state.staff.find((s) => s.status === 'Aktif')
  const staff = sample
    ? [{
        username: sample.niy,
        password: state.staffCredentials?.[sample.id]?.password || initialStaffPassword(sample.niy),
        role: ROLE_GURU,
        unit: selectUnitName(state, sample.unitId),
        mustChangePassword: !state.staffCredentials?.[sample.id],
      }]
    : []

  return [...portals, ...staff]
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
