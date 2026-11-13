// ============================================================================
// UJI OTENTIKASI & SINKRONISASI KREDENSIAL GURU/PEGAWAI
//
// Memastikan:
//   1. Seluruh guru/pegawai di master data (STAFF & buildFullStaff) bisa login
//      menggunakan NIY sebagai kata sandi default.
//   2. Setelah login, data langsung terhubung ke profil mobile (selectSelfStaff).
//   3. Pegawai nonaktif ditolak dengan kode AKUN_NONAKTIF.
//   4. Reset kata sandi oleh Superadmin (RESET_STAFF_PASSWORD) mengembalikan
//      password ke NIY target dan berfungsi saat login.
//   5. Kata sandi yang bukan NIY ditolak (PASSWORD_SALAH) setelah direset ke NIY.
//   6. Kata sandi custom yang di-set lewat UPDATE_STAFF / UPDATE_ADMIN_USER
//      berlaku untuk login.
//
// Jalankan: node scripts/test-teacher-auth.mjs
// ============================================================================

import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})

const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const seed = await server.ssrLoadModule('/src/data/seed.js')
await server.close()

const {
  simPresReducer,
  authenticateCredentials,
  validatePasswordChange,
  selectSelfStaff,
  selectSelfStaffId,
  buildUserAccounts,
  findAccountByIdentifier,
  ROLE_GURU,
  ROLE_SUPERADMIN,
  PERMISSION_MATRIX,
  AUTH_ERRORS,
} = store

const { STAFF, buildFullStaff, UNITS, ADMIN_USERS } = seed

let lulus = 0
let gagal = 0
const rincian = []

function cek(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(65)} ${String(aktual).padEnd(20)} (harapan: ${diharapkan})`)
}

function catat(nama, ok, detail = '') {
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

console.log('UJI KONEKSI NIY & KREDENSIAL GURU KE HALAMAN MOBILE')
console.log('='.repeat(105))

// Inisialisasi state awal aplikasi
const allStaff = buildFullStaff()
let state = {
  staff: allStaff,
  units: UNITS,
  leaves: [],
  adminUsers: ADMIN_USERS,
  userAccounts: buildUserAccounts(allStaff),
  logs: [],
  settings: {},
  attendanceHistory: [],
  permissionMatrix: PERMISSION_MATRIX,
  currentUser: null,
  isAuthenticated: false,
}

// 1. Uji Login Guru 1: Erianto (NIY: 049005069) dengan sandi default = NIY
const eriantoNiy = '049005069'
const eriantoAuth = authenticateCredentials(state, eriantoNiy, eriantoNiy)
cek('Login Erianto NIY 049005069 dengan sandi default NIY', eriantoAuth.ok, true)
cek('Role Erianto setelah login', eriantoAuth.user?.role, 'Guru')
cek('UnitId Erianto', eriantoAuth.user?.unitId, 'smp')

const stateErianto = { ...state, currentUser: eriantoAuth.user, isAuthenticated: true }
const profilErianto = selectSelfStaff(stateErianto)
cek('selectSelfStaff menemukan data Erianto', profilErianto?.name, 'Erianto, S.Ag, M.Pd.I')
cek('selectSelfStaff NIY sesuai', profilErianto?.niy, '049005069')

// 2. Uji Login Guru 2: Bustanul Abidin (NIY: 049097021)
const bustanulAuth = authenticateCredentials(state, '049097021', '049097021')
cek('Login Bustanul Abidin NIY 049097021 ok', bustanulAuth.ok, true)
const stateBustanul = { ...state, currentUser: bustanulAuth.user, isAuthenticated: true }
cek('selectSelfStaff menemukan Bustanul Abidin', selectSelfStaff(stateBustanul)?.name, 'Bustanul Abidin, S.Pd')

// 3. Uji Login Guru 9: Rizal Ramli (NIY: 029045122)
const rizalAuth = authenticateCredentials(state, '029045122', '029045122')
cek('Login Rizal Ramli NIY 029045122 ok', rizalAuth.ok, true)
const stateRizal = { ...state, currentUser: rizalAuth.user, isAuthenticated: true }
cek('selectSelfStaff menemukan Rizal Ramli', selectSelfStaff(stateRizal)?.name, 'Rizal Ramli, S.Pd.I')

// 4. Uji Login Guru Nonaktif: Risa Fadillah (NIY: 029012056)
const risaAuth = authenticateCredentials(state, '029012056', '029012056')
cek('Login Risa Fadillah (Nonaktif) ditolak', risaAuth.ok, false)
cek('Kode galat akun nonaktif', risaAuth.code, 'AKUN_NONAKTIF')

// 5. Uji Password Salah
const salahPass = authenticateCredentials(state, '049005069', 'KataSandiSalah123')
cek('Password salah ditolak', salahPass.ok, false)
cek('Kode galat password salah', salahPass.code, 'PASSWORD_SALAH')

// 6. Uji Reset Password oleh Superadmin via RESET_STAFF_PASSWORD (default = NIY)
console.log('\n--- Uji Reset Kata Sandi oleh Superadmin ---')

// Sandi default NIY masih berlaku sebelum reset
const loginSebelumReset = authenticateCredentials(state, '049005069', '049005069')
cek('Login dengan NIY sebelum reset berhasil', loginSebelumReset.ok, true)

// Reset ke NIY (tanpa menentukan password custom -> default NIY)
state = simPresReducer(state, {
  type: 'RESET_STAFF_PASSWORD',
  payload: {
    staffId: 1,
    niy: '049005069',
  },
})

// Login dengan NIY setelah reset ke default NIY tetap berhasil
const loginSetelahResetDefault = authenticateCredentials(state, '049005069', '049005069')
cek('Login dengan NIY setelah reset ke default berhasil', loginSetelahResetDefault.ok, true)
cek('Role tetap Guru', loginSetelahResetDefault.user?.role, 'Guru')

const stateSetelahReset = { ...state, currentUser: loginSetelahResetDefault.user, isAuthenticated: true }
cek('Profil mobile Erianto tetap terhubung pasca reset sandi', selectSelfStaff(stateSetelahReset)?.name, 'Erianto, S.Ag, M.Pd.I')

// 7. Reset ke kata sandi custom, lalu verifikasi NIY default ditolak
const passwordBaru = 'AttinBaru#2026'
state = simPresReducer(state, {
  type: 'RESET_STAFF_PASSWORD',
  payload: {
    staffId: 1,
    niy: '049005069',
    password: passwordBaru,
  },
})

const loginSandiCustom = authenticateCredentials(state, '049005069', passwordBaru)
cek('Login dengan sandi custom setelah reset berhasil', loginSandiCustom.ok, true)

const loginNiySetelahCustom = authenticateCredentials(state, '049005069', '049005069')
cek('Login dengan NIY setelah sandi custom ditolak', loginNiySetelahCustom.ok, false)
cek('Kode galat NIY setelah custom', loginNiySetelahCustom.code, 'PASSWORD_SALAH')

// 8. Uji Edit Password via UPDATE_STAFF (dari modal edit pegawai)
const passwordEdit = 'PasswordEditGuru!99'
state = simPresReducer(state, {
  type: 'UPDATE_STAFF',
  payload: {
    id: 1,
    password: passwordEdit,
  },
})

const loginSetelahEdit = authenticateCredentials(state, '049005069', passwordEdit)
cek('Login dengan sandi hasil UPDATE_STAFF berhasil', loginSetelahEdit.ok, true)

// 9. Uji Edit Password via UPDATE_ADMIN_USER (dari Manajemen Admin & User)
const passwordAdminUser = 'AdminUserSetPass@123'
state = simPresReducer(state, {
  type: 'UPDATE_ADMIN_USER',
  payload: {
    id: 5, // Rizal Ramli
    niy: '029045122',
    password: passwordAdminUser,
    role: 'Guru',
  },
})

const loginRizalBaru = authenticateCredentials(state, '029045122', passwordAdminUser)
cek('Login Rizal Ramli dengan sandi dari UPDATE_ADMIN_USER berhasil', loginRizalBaru.ok, true)
const stateRizalBaru = { ...state, currentUser: loginRizalBaru.user, isAuthenticated: true }
cek('Profil mobile Rizal Ramli terhubung', selectSelfStaff(stateRizalBaru)?.name, 'Rizal Ramli, S.Pd.I')

// 10. Uji Ganti Password Sendiri (CHANGE_PASSWORD) — password baru tersimpan permanen
console.log('\n--- Uji Ganti Password Sendiri ---')
const currentUserErianto = { ...eriantoAuth.user, password: '049005069' }
const stateChangePassword = {
  ...state,
  currentUser: currentUserErianto,
  isAuthenticated: true,
  passwordChangeRequested: true,
}

// Sandi lama (NIY) harus diterima
const validateLama = validatePasswordChange(stateChangePassword, {
  currentPassword: '049005069',
  newPassword: 'KataSandiBaruAman123!',
  confirmPassword: 'KataSandiBaruAman123!',
})
cek('Validasi ganti password dengan sandi lama NIY benar', validateLama.ok, true)
cek('Tidak ada error validasi', validateLama.error, undefined)

// Sandi lama yang salah harus ditolak
const validateSalah = validatePasswordChange(stateChangePassword, {
  currentPassword: 'Salah123!',
  newPassword: 'KataSandiBaruAman123!',
  confirmPassword: 'KataSandiBaruAman123!',
})
cek('Validasi ganti password dengan sandi lama salah ditolak', validateSalah.ok, false)
cek('Kode error sandi lama salah', validateSalah.error, AUTH_ERRORS.WRONG_PASSWORD)

// Konfirmasi tidak cocok harus ditolak
const validateCocok = validatePasswordChange(stateChangePassword, {
  currentPassword: '049005069',
  newPassword: 'KataSandiBaruAman123!',
  confirmPassword: 'BedadenganSandiBaru!',
})
cek('Validasi konfirmasi tidak cocok ditolak', validateCocok.ok, false)

// Sandi baru sama dengan lama harus ditolak
const validateSama = validatePasswordChange(stateChangePassword, {
  currentPassword: '049005069',
  newPassword: '049005069',
  confirmPassword: '049005069',
})
cek('Validasi sandi baru sama dengan lama ditolak', validateSama.ok, false)

// Terapkan ganti password via reducer CHANGE_PASSWORD
state = simPresReducer(stateChangePassword, {
  type: 'CHANGE_PASSWORD',
  payload: { account: currentUserErianto, password: 'KataSandiBaruAman123!' },
})

// Sandi baru harus bisa login
const loginSandiBaru = authenticateCredentials(state, '049005069', 'KataSandiBaruAman123!')
cek('Login dengan sandi baru hasil CHANGE_PASSWORD berhasil', loginSandiBaru.ok, true)

// Sandi lama (NIY) harus ditolak setelah diubah
const loginNiySetelahUbah = authenticateCredentials(state, '049005069', '049005069')
cek('Login dengan NIY setelah ganti password ditolak', loginNiySetelahUbah.ok, false)
cek('Kode error NIY setelah ubah', loginNiySetelahUbah.code, 'PASSWORD_SALAH')

// Profil mobile tetap terhubung
const stateSetelahUbah = { ...state, currentUser: loginSandiBaru.user, isAuthenticated: true }
cek('Profil mobile Erianto tetap terhubung pasca ganti sandi', selectSelfStaff(stateSetelahUbah)?.name, 'Erianto, S.Ag, M.Pd.I')

// mustChangePassword harus false setelah ganti
cek('mustChangePassword false setelah ganti', state.currentUser.mustChangePassword, false)

// 11. Uji Sampel Massal: semua pegawai aktif bisa login dengan NIY default
console.log('\n--- Uji Semua Pegawai Aktif dengan Sandi Default NIY ---')
const activeStaff = allStaff.filter((s) => s.status === 'Aktif' && s.id !== 1 && s.id !== 9)

activeStaff.forEach((s) => {
  const auth = authenticateCredentials(state, s.niy, s.niy)
  catat(`Login NIY ${s.niy} (${s.name.slice(0, 22)})`, auth.ok, auth.error || 'Berhasil masuk')
  if (auth.ok) {
    const sState = { ...state, currentUser: auth.user, isAuthenticated: true }
    const staffObj = selectSelfStaff(sState)
    catat(`  -> Terhubung ke profil mobile: ${staffObj?.name?.slice(0, 22)}`, staffObj?.id === s.id)
  }
})

console.log('='.repeat(105))
console.log(rincian.join('\n'))
console.log('='.repeat(105))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  process.exit(1)
} else {
  console.log('\nSEMUA UJI OTENTIKASI & KONEKSI MOBILE GURU LULUS 100%!')
}
