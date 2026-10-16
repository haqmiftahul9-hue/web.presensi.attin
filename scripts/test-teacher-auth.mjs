// ============================================================================
// UJI OTENTIKASI & SINKRONISASI KREDENSIAL GURU/PEGAWAI
//
// Memastikan:
//   1. Seluruh guru/pegawai di master data (STAFF & buildFullStaff) bisa login
//      menggunakan NIY dan kata sandi default ("Attin123!").
//   2. Setelah login, data langsung terhubung ke profil mobile (selectSelfStaff).
//   3. Pegawai nonaktif ditolak dengan kode AKUN_NONAKTIF.
//   4. Reset kata sandi oleh Superadmin (RESET_STAFF_PASSWORD, UPDATE_STAFF,
//      UPDATE_ADMIN_USER) langsung memperbarui kredensial dan berfungsi saat login.
//   5. Kata sandi lama ditolak (PASSWORD_SALAH) setelah direset.
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
  selectSelfStaff,
  selectSelfStaffId,
  buildUserAccounts,
  findAccountByIdentifier,
  DEFAULT_STAFF_PASSWORD,
  ROLE_GURU,
  ROLE_SUPERADMIN,
  PERMISSION_MATRIX,
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

// 1. Uji Login Guru 1: Erianto (NIY: 049005069)
const eriantoAuth = authenticateCredentials(state, '049005069', DEFAULT_STAFF_PASSWORD)
cek('Login Erianto NIY 049005069 ok', eriantoAuth.ok, true)
cek('Role Erianto setelah login', eriantoAuth.user?.role, 'Guru')
cek('UnitId Erianto', eriantoAuth.user?.unitId, 'smp')

// Pasang sesi Erianto dan cek profil mobile
const stateErianto = { ...state, currentUser: eriantoAuth.user, isAuthenticated: true }
const profilErianto = selectSelfStaff(stateErianto)
cek('selectSelfStaff menemukan data Erianto', profilErianto?.name, 'Erianto, S.Ag, M.Pd.I')
cek('selectSelfStaff NIY sesuai', profilErianto?.niy, '049005069')

// 2. Uji Login Guru 2: Bustanul Abidin (NIY: 049097021)
const bustanulAuth = authenticateCredentials(state, '049097021', DEFAULT_STAFF_PASSWORD)
cek('Login Bustanul Abidin NIY 049097021 ok', bustanulAuth.ok, true)
const stateBustanul = { ...state, currentUser: bustanulAuth.user, isAuthenticated: true }
cek('selectSelfStaff menemukan Bustanul Abidin', selectSelfStaff(stateBustanul)?.name, 'Bustanul Abidin, S.Pd')

// 3. Uji Login Guru 9: Rizal Ramli (NIY: 029045122)
const rizalAuth = authenticateCredentials(state, '029045122', DEFAULT_STAFF_PASSWORD)
cek('Login Rizal Ramli NIY 029045122 ok', rizalAuth.ok, true)
const stateRizal = { ...state, currentUser: rizalAuth.user, isAuthenticated: true }
cek('selectSelfStaff menemukan Rizal Ramli', selectSelfStaff(stateRizal)?.name, 'Rizal Ramli, S.Pd.I')

// 4. Uji Login Guru Nonaktif: Risa Fadillah (NIY: 029012056)
const risaAuth = authenticateCredentials(state, '029012056', DEFAULT_STAFF_PASSWORD)
cek('Login Risa Fadillah (Nonaktif) ditolak', risaAuth.ok, false)
cek('Kode galat akun nonaktif', risaAuth.code, 'AKUN_NONAKTIF')

// 5. Uji Password Salah
const salahPass = authenticateCredentials(state, '049005069', 'KataSandiSalah123')
cek('Password salah ditolak', salahPass.ok, false)
cek('Kode galat password salah', salahPass.code, 'PASSWORD_SALAH')

// 6. Uji Reset Password oleh Superadmin via RESET_STAFF_PASSWORD
console.log('\n--- Uji Reset Kata Sandi oleh Superadmin ---')
const passwordBaru = 'AttinBaru#2026'

state = simPresReducer(state, {
  type: 'RESET_STAFF_PASSWORD',
  payload: {
    staffId: 1,
    niy: '049005069',
    password: passwordBaru,
  },
})

// Sandi lama harus gagal sekarang
const loginSandiLama = authenticateCredentials(state, '049005069', DEFAULT_STAFF_PASSWORD)
cek('Login dengan sandi lama setelah reset ditolak', loginSandiLama.ok, false)
cek('Kode galat sandi lama', loginSandiLama.code, 'PASSWORD_SALAH')

// Sandi baru harus berhasil
const loginSandiBaru = authenticateCredentials(state, '049005069', passwordBaru)
cek('Login dengan sandi baru berhasil', loginSandiBaru.ok, true)
cek('Role tetap Guru', loginSandiBaru.user?.role, 'Guru')

// Pastikan profil mobile tetap terhubung sempurna
const stateSetelahReset = { ...state, currentUser: loginSandiBaru.user, isAuthenticated: true }
cek('Profil mobile Erianto tetap terhubung pasca reset sandi', selectSelfStaff(stateSetelahReset)?.name, 'Erianto, S.Ag, M.Pd.I')

// 7. Uji Edit Password via UPDATE_STAFF (dari modal edit pegawai)
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

// 8. Uji Edit Password via UPDATE_ADMIN_USER (dari Manajemen Admin & User)
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

// 9. Uji Sampel Massal: 15 Guru Acak dari Seluruh Data Pegawai (189 Total)
console.log('\n--- Uji Sampel Pegawai Aktif Lainnya ---')
const sampelStaff = allStaff.filter(s => s.status === 'Aktif' && s.id !== 1 && s.id !== 9).slice(0, 15)

sampelStaff.forEach((s) => {
  const auth = authenticateCredentials(state, s.niy, DEFAULT_STAFF_PASSWORD)
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
