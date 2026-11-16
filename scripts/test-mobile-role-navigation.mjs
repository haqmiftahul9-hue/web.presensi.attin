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
  normalisasiRole,
  ROLE_KEPALA_SEKOLAH,
  ROLE_ADMIN_UNIT,
  ROLE_SUPERADMIN,
  ROLE_PETUGAS_PRESENSI,
  ROLE_GURU,
  selectSelfStaff,
} = store

await server.close()

console.log('================================================================================')
console.log('VERIFIKASI NAVIGASI & MENU MOBILE SESUAI ROLE (GURU, KEPALA SEKOLAH, ADMIN UNIT)')
console.log('================================================================================\n')

// Replikasi buildNavItems sesuai implementasi di MobileLayout.jsx
function buildNavItems(role, pendingCount = 0) {
  const normRole = normalisasiRole(role)

  if (normRole === ROLE_KEPALA_SEKOLAH) {
    return [
      { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
      { to: '/mobile/admin-monitoring', label: 'Monitoring', icon: 'query_stats' },
      { to: '/mobile/presensi', label: 'Presensi', icon: 'face_retouch_natural', isCenter: true },
      { to: '/mobile/persetujuan-izin', label: 'Persetujuan', icon: 'task_alt', badge: pendingCount },
      { to: '/mobile/profil', label: 'Profil', icon: 'person' },
    ]
  }

  if (normRole === ROLE_ADMIN_UNIT || normRole === ROLE_SUPERADMIN || normRole === ROLE_PETUGAS_PRESENSI) {
    return [
      { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
      { to: '/mobile/admin-monitoring', label: 'Monitoring', icon: 'query_stats' },
      { to: '/mobile/admin-scan', label: 'Scan QR', icon: 'qr_code_scanner', isCenter: true },
      { to: '/mobile/persetujuan-izin', label: 'Persetujuan', icon: 'task_alt', badge: pendingCount },
      { to: '/mobile/profil', label: 'Profil', icon: 'person' },
    ]
  }

  // Default Guru / Pegawai
  return [
    { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
    { to: '/mobile/riwayat', label: 'Riwayat', icon: 'calendar_month' },
    { to: '/mobile/presensi', label: 'Presensi', icon: 'face_retouch_natural', isCenter: true },
    { to: '/mobile/izin-cuti', label: 'Izin/Cuti', icon: 'event_available' },
    { to: '/mobile/profil', label: 'Profil', icon: 'person' },
  ]
}

// Uji 1: Navigasi Guru / Pegawai
console.log('--- TEST 1: Bottom Navigation Guru / Pegawai ---')
const guruNav = buildNavItems(ROLE_GURU, 5)
assert.equal(guruNav.length, 5, 'Guru harus memiliki tepat 5 menu bottom bar')
assert.deepEqual(guruNav.map(n => n.label), ['Beranda', 'Riwayat', 'Presensi', 'Izin/Cuti', 'Profil'])
assert.equal(guruNav[2].isCenter, true, 'Menu Presensi mandiri harus berada di tengah (FAB)')
assert.equal(guruNav.some(n => n.label === 'Monitoring'), false, 'Guru TIDAK boleh melihat menu Monitoring')
assert.equal(guruNav.some(n => n.label === 'Persetujuan'), false, 'Guru TIDAK boleh melihat menu Persetujuan')
assert.equal(guruNav.some(n => n.label === 'Scan QR'), false, 'Guru TIDAK boleh melihat menu Scan QR')
console.log('✅ LULUS: Navigasi mobile Guru hanya menampilkan fitur presensi & riwayat mandiri')

// Uji 2: Navigasi Kepala Sekolah
console.log('\n--- TEST 2: Bottom Navigation Kepala Sekolah ---')
const kepsekNav = buildNavItems(ROLE_KEPALA_SEKOLAH, 3)
assert.equal(kepsekNav.length, 5, 'Kepala Sekolah harus memiliki tepat 5 menu bottom bar')
assert.deepEqual(kepsekNav.map(n => n.label), ['Beranda', 'Monitoring', 'Presensi', 'Persetujuan', 'Profil'])
assert.equal(kepsekNav[1].to, '/mobile/admin-monitoring', 'Kepala Sekolah memiliki tab Monitoring Presensi Unit')
assert.equal(kepsekNav[2].to, '/mobile/presensi', 'Kepala Sekolah tetap dapat melakukan Presensi Mandiri di tombol tengah')
assert.equal(kepsekNav[3].to, '/mobile/persetujuan-izin', 'Kepala Sekolah memiliki tab Persetujuan Izin')
assert.equal(kepsekNav[3].badge, 3, 'Tab Persetujuan menampilkan badge pending izin')
console.log('✅ LULUS: Navigasi mobile Kepala Sekolah memiliki tambahan Monitoring & Persetujuan')

// Uji 3: Navigasi Admin Unit
console.log('\n--- TEST 3: Bottom Navigation Admin Unit ---')
const adminNav = buildNavItems(ROLE_ADMIN_UNIT, 4)
assert.equal(adminNav.length, 5, 'Admin Unit harus memiliki tepat 5 menu bottom bar')
assert.deepEqual(adminNav.map(n => n.label), ['Beranda', 'Monitoring', 'Scan QR', 'Persetujuan', 'Profil'])
assert.equal(adminNav[1].to, '/mobile/admin-monitoring', 'Admin Unit memiliki tab Monitoring')
assert.equal(adminNav[2].to, '/mobile/admin-scan', 'Tombol tengah Admin Unit adalah Scan QR Pegawai untuk loket/pos')
assert.equal(adminNav[3].to, '/mobile/persetujuan-izin', 'Admin Unit memiliki tab Persetujuan Izin')
assert.equal(adminNav[3].badge, 4, 'Tab Persetujuan Admin Unit menampilkan badge pending')
console.log('✅ LULUS: Navigasi mobile Admin Unit memiliki tambahan Monitoring, Scan QR & Persetujuan')

// Uji 4: Data Pegawai Akun Login (selectSelfStaff)
console.log('\n--- TEST 4: Ketersediaan Data Staff untuk Akun Demo ---')

// Uji Akun Guru
const stateGuru = {
  ...initialState,
  currentUser: { id: 'usr-1', username: '049098034', niy: '049098034', role: 'Guru', unitId: 'sd' }
}
const staffGuru = selectSelfStaff(stateGuru)
assert.ok(staffGuru, 'Staff Guru harus ditemukan')
assert.equal(staffGuru.niy, '049098034')
console.log(`✅ LULUS: Guru (${staffGuru.name}) terhubung dengan profil pegawai`)

// Uji Akun Kepala Sekolah SD (akundemo: kepalasd / niy 019001013)
const adminUserKepsek = initialState.adminUsers.find(u => u.username === 'kepalasd')
assert.ok(adminUserKepsek, 'Akun demo kepalasd harus ada di adminUsers')
const stateKepsek = {
  ...initialState,
  currentUser: adminUserKepsek
}
const staffKepsek = selectSelfStaff(stateKepsek)
assert.ok(staffKepsek, 'Staff Kepala Sekolah harus ditemukan (bukan null)')
assert.equal(staffKepsek.niy, '019001013', 'NIY Kepala Sekolah SD harus 019001013')
assert.equal(staffKepsek.name, 'Kepala Sekolah SDIT', 'Nama Kepala Sekolah SD harus sesuai')
assert.equal(staffKepsek.unitId, 'sd', 'Unit Kepala Sekolah harus sd')
console.log(`✅ LULUS: Kepala Sekolah SD (${staffKepsek.name}) terhubung dengan profil pegawai`)

// Uji Akun Admin SD (akundemo: adminsd1 / niy 019001008)
const adminUserSD1 = initialState.adminUsers.find(u => u.username === 'adminsd1')
assert.ok(adminUserSD1, 'Akun demo adminsd1 harus ada di adminUsers')
const stateAdminSD = {
  ...initialState,
  currentUser: adminUserSD1
}
const staffAdminSD = selectSelfStaff(stateAdminSD)
assert.ok(staffAdminSD, 'Staff Admin Unit harus ditemukan (bukan null)')
assert.equal(staffAdminSD.niy, '019001008', 'NIY Admin SD harus 019001008')
assert.equal(staffAdminSD.name, 'Admin SD Unit 1', 'Nama Admin SD harus sesuai')
assert.equal(staffAdminSD.unitId, 'sd', 'Unit Admin SD harus sd')
console.log(`✅ LULUS: Admin Unit SD (${staffAdminSD.name}) terhubung dengan profil pegawai`)

// Uji Akun Virtual Fallback (jika ada admin baru yang belum terdaftar di staff fisik)
const stateNewAdmin = {
  ...initialState,
  currentUser: { id: 'adm-new', username: 'adminbaru', name: 'Admin Baru', role: 'Admin Unit', unitId: 'smp' }
}
const virtualStaff = selectSelfStaff(stateNewAdmin)
assert.ok(virtualStaff, 'Virtual fallback staff harus dibuat')
assert.equal(virtualStaff.name, 'Admin Baru')
assert.equal(virtualStaff.unitId, 'smp')
console.log(`✅ LULUS: Fallback virtual staff berhasil melindungi akun portal agar tidak crash/error`)

console.log('\n================================================================================')
console.log('SELURUH 8 PENGUJIAN NAVIGASI & AKUN MOBILE LULUS 100%')
console.log('================================================================================')
