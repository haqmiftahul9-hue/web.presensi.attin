import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})

const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const {
  initialState,
  resolvePostLoginPath,
  selectAppHomePath,
  authenticateCredentials,
  normalisasiRole,
  ROLE_SUPERADMIN,
  ROLE_ADMIN_UNIT,
  ROLE_KEPALA_SEKOLAH,
  ROLE_GURU,
} = store

await server.close()

console.log('================================================================================')
console.log('TESTING ALUR LOGIN SUPERADMIN VS ADMIN & USER DI PERANGKAT MOBILE')
console.log('================================================================================\n')

// Mock window untuk simulasi lingkungan mobile browser (lebar 390px - iPhone/Android)
globalThis.window = {
  innerWidth: 390,
  location: { pathname: '/login' },
}

const superadminAccount = initialState.adminUsers.find(u => normalisasiRole(u.role) === ROLE_SUPERADMIN)
const adminUnitAccount = initialState.adminUsers.find(u => normalisasiRole(u.role) === ROLE_ADMIN_UNIT)
const kepsekAccount = initialState.adminUsers.find(u => normalisasiRole(u.role) === ROLE_KEPALA_SEKOLAH)
const guruAccount = initialState.userAccounts.find(u => normalisasiRole(u.role) === ROLE_GURU)

assert.ok(superadminAccount, 'Akun superadmin harus ada')
assert.ok(adminUnitAccount, 'Akun admin unit harus ada')
assert.ok(kepsekAccount, 'Akun kepala sekolah harus ada')
assert.ok(guruAccount, 'Akun guru harus ada')

console.log('--- 1. Login Superadmin di Mobile ---')
// Skenario A: Superadmin login tanpa requestedPath di mobile -> harus langsung /superadmin
const pathA = resolvePostLoginPath(initialState, superadminAccount, null)
assert.equal(pathA, '/superadmin', 'Superadmin login di mobile tanpa requestedPath harus ke /superadmin')
console.log('✅ LULUS: Superadmin login di mobile tanpa requestedPath langsung masuk ke mode portal desktop (/superadmin)')

// Skenario B: Superadmin membuka URL /mobile/home di mobile lalu login -> harus tetap diarahkan ke /superadmin
const pathB = resolvePostLoginPath(initialState, superadminAccount, '/mobile/home')
assert.equal(pathB, '/superadmin', 'Superadmin login dengan requestedPath /mobile/home harus dialihkan ke /superadmin')
console.log('✅ LULUS: Superadmin login dari rute /mobile/home langsung masuk ke portal desktop (/superadmin), bukan menu mobile')

// Skenario C: Superadmin mencoba membuka rute mobile spesifik (/mobile/presensi) -> harus dialihkan ke /superadmin
const pathC = resolvePostLoginPath(initialState, superadminAccount, '/mobile/presensi')
assert.equal(pathC, '/superadmin', 'Superadmin login dari rute /mobile/presensi harus dialihkan ke /superadmin')
console.log('✅ LULUS: Superadmin mencoba rute mobile spesifik langsung dialihkan ke portal desktop (/superadmin)')

// Skenario D: Superadmin membuka rute portal desktop langsung (misal /data-guru-dan-pegawai) -> harus ke rute desktop tersebut
const pathD = resolvePostLoginPath(initialState, superadminAccount, '/data-guru-dan-pegawai')
assert.equal(pathD, '/data-guru-dan-pegawai', 'Superadmin membuka rute portal desktop harus diizinkan')
console.log('✅ LULUS: Superadmin membuka rute portal desktop langsung diizinkan')

console.log('\n--- 2. Login Akun Kepala Sekolah, Admin Unit, & User di Mobile ---')
// Skenario E1: Kepala Sekolah login di mobile tanpa requestedPath -> harus masuk ke /mobile/home
const pathKepsekMobile = resolvePostLoginPath(initialState, kepsekAccount, null)
assert.equal(pathKepsekMobile, '/mobile/home', 'Kepala Sekolah di mobile harus masuk ke /mobile/home')
console.log('✅ LULUS: Kepala Sekolah login di mobile langsung masuk ke tampilan mobile (/mobile/home)')

// Skenario E2: Kepala Sekolah login di mobile ketika requestedPath adalah rute desktop (/dashboard) -> HARUS tetap masuk ke /mobile/home
const pathKepsekFromDesktop = resolvePostLoginPath(initialState, kepsekAccount, '/dashboard')
assert.equal(pathKepsekFromDesktop, '/mobile/home', 'Kepala Sekolah di mobile walau dari /dashboard harus tetap masuk ke /mobile/home')
console.log('✅ LULUS: Kepala Sekolah login di mobile walau requestedPath /dashboard tetap masuk ke tampilan mobile (/mobile/home)')

// Skenario E3: Kepala Sekolah login di mobile dengan requestedPath rute mobile (/mobile/persetujuan-izin) -> masuk ke rute mobile tersebut
const pathKepsekMobileSub = resolvePostLoginPath(initialState, kepsekAccount, '/mobile/persetujuan-izin')
assert.equal(pathKepsekMobileSub, '/mobile/persetujuan-izin', 'Kepala Sekolah dengan requestedPath mobile harus diizinkan')
console.log('✅ LULUS: Kepala Sekolah login di mobile menuju rute mobile (/mobile/persetujuan-izin) diarahkan dengan benar')

// Skenario F: Admin Unit login di mobile -> harus masuk ke halaman mobile (/mobile/home)
const pathAdminMobile = resolvePostLoginPath(initialState, adminUnitAccount, null)
assert.equal(pathAdminMobile, '/mobile/home', 'Admin Unit di mobile harus masuk ke /mobile/home')
console.log('✅ LULUS: Admin Unit login di mobile tetap menampilkan halaman mobile (/mobile/home)')

// Skenario G: Guru/User biasa login di mobile -> harus masuk ke halaman mobile (/mobile/home)
const pathGuruMobile = resolvePostLoginPath(initialState, guruAccount, null)
assert.equal(pathGuruMobile, '/mobile/home', 'User Guru di mobile harus masuk ke /mobile/home')
console.log('✅ LULUS: User Guru login di mobile tetap menampilkan halaman mobile (/mobile/home)')

console.log('\n--- 3. Verifikasi selectAppHomePath ---')
assert.equal(selectAppHomePath({ ...initialState, currentUser: superadminAccount }), '/superadmin')
assert.equal(selectAppHomePath({ ...initialState, currentUser: kepsekAccount }), '/mobile/home')
assert.equal(selectAppHomePath({ ...initialState, currentUser: adminUnitAccount }), '/mobile/home')
assert.equal(selectAppHomePath({ ...initialState, currentUser: guruAccount }), '/mobile/home')
console.log('✅ LULUS: selectAppHomePath akurat untuk Superadmin (/superadmin), Kepala Sekolah (/mobile/home), Admin Unit (/mobile/home), dan Guru (/mobile/home)')

console.log('\n================================================================================')
console.log('🎉 SEMUA PENGUJIAN LOGIKA LOGIN SUPERADMIN DI MOBILE LULUS SEMPURNA!')
console.log('================================================================================')
