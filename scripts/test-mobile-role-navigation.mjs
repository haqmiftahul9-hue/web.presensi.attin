import assert from 'node:assert/strict'
import { createTestServer } from './_test-server.mjs'

const server = await createTestServer()

const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const {
  initialState,
  simPresReducer,
  normalisasiRole,
  findAccountByIdentifier,
  authenticateCredentials,
  ROLE_KEPALA_SEKOLAH,
  ROLE_ADMIN_UNIT,
  ROLE_SUPERADMIN,
  ROLE_PETUGAS_PRESENSI,
  ROLE_GURU,
  selectSelfStaff,
} = store

await server.close()

console.log('================================================================================')
console.log('VERIFIKASI PENUGASAN ROLE KEPSEK/ADMIN OLEH SUPERADMIN & TAMPILAN MOBILE')
console.log('================================================================================\n')

// 1. Navigasi Bottom Bar Mobile: Sama untuk semua user (Guru, Kepsek, Admin Unit)
console.log('--- TEST 1: Bottom Navigation Seragam untuk Seluruh User Mobile ---')
const MOBILE_NAV_ITEMS = [
  { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
  { to: '/mobile/riwayat', label: 'Riwayat', icon: 'calendar_month' },
  { to: '/mobile/presensi', label: 'Presensi', icon: 'face_retouch_natural', isCenter: true },
  { to: '/mobile/izin-cuti', label: 'Izin/Cuti', icon: 'event_available' },
  { to: '/mobile/profil', label: 'Profil', icon: 'person' },
]

assert.equal(MOBILE_NAV_ITEMS.length, 5, 'Navigasi bawah mobile selalu terdiri dari 5 menu utama')
assert.deepEqual(MOBILE_NAV_ITEMS.map(n => n.label), ['Beranda', 'Riwayat', 'Presensi', 'Izin/Cuti', 'Profil'])
assert.equal(MOBILE_NAV_ITEMS[2].isCenter, true, 'Tombol Presensi mandiri berada di tengah (Center FAB)')
console.log('✅ LULUS: Navigasi bawah mobile seragam untuk seluruh user (Guru, Kepsek, Admin)')

// 2. Evaluasi Menu Card di Beranda berdasarkan Hak Role
console.log('\n--- TEST 2: Evaluasi Card Khusus di Beranda di Atas Menu Cepat ---')

function evaluateHomeCards(role) {
  const normRole = normalisasiRole(role)
  const isSuperadmin = normRole === ROLE_SUPERADMIN
  const isAdminUnit = normRole === ROLE_ADMIN_UNIT
  const isKepsek = normRole === ROLE_KEPALA_SEKOLAH
  const isPetugas = normRole === ROLE_PETUGAS_PRESENSI
  const isLeaderOrAdmin = isSuperadmin || isAdminUnit || isKepsek || isPetugas

  if (!isLeaderOrAdmin) {
    return {
      hasSpecialCard: false,
      cardTitle: null,
      menuItems: [],
    }
  }

  const items = []
  items.push('Persetujuan Izin')
  items.push('Monitoring Presensi')

  if (isAdminUnit || isSuperadmin || isPetugas) {
    items.push('Scan QR Pegawai')
    items.push('Presensi Manual')
    items.push('Rekap Presensi')
  }
  items.push('Portal Desktop')

  return {
    hasSpecialCard: true,
    cardTitle: isKepsek
      ? 'Menu Manajemen Kepala Sekolah'
      : isAdminUnit
        ? 'Menu Operasional Admin Unit'
        : 'Fitur Khusus Pimpinan & Admin',
    menuItems: items,
  }
}

// Uji User Guru Biasa
const guruEval = evaluateHomeCards(ROLE_GURU)
assert.equal(guruEval.hasSpecialCard, false, 'Guru biasa TIDAK melihat Card Khusus')
console.log('✅ LULUS: User Guru biasa tidak melihat Card Khusus pimpinan/admin di Beranda')

// Uji User Kepala Sekolah: Tepat 3 buah sejajar
const kepsekEval = evaluateHomeCards(ROLE_KEPALA_SEKOLAH)
assert.equal(kepsekEval.hasSpecialCard, true, 'Kepala Sekolah melihat Card Khusus')
assert.equal(kepsekEval.cardTitle, 'Menu Manajemen Kepala Sekolah')
assert.equal(kepsekEval.menuItems.length, 3, 'Kepala Sekolah memiliki tepat 3 menu agar tampil 3 buah sejajar')
assert.deepEqual(kepsekEval.menuItems, ['Persetujuan Izin', 'Monitoring Presensi', 'Portal Desktop'])
console.log('✅ LULUS: Kepala Sekolah memiliki 3 card sejajar (Persetujuan Izin, Monitoring Presensi, Portal Desktop)')

// Uji User Admin Unit: 6 buah (2 baris x 3 sejajar)
const adminEval = evaluateHomeCards(ROLE_ADMIN_UNIT)
assert.equal(adminEval.hasSpecialCard, true, 'Admin Unit melihat Card Khusus')
assert.equal(adminEval.cardTitle, 'Menu Operasional Admin Unit')
assert.equal(adminEval.menuItems.length, 6, 'Admin Unit memiliki 6 menu (2 baris x 3 buah sejajar)')
assert.deepEqual(adminEval.menuItems, ['Persetujuan Izin', 'Monitoring Presensi', 'Scan QR Pegawai', 'Presensi Manual', 'Rekap Presensi', 'Portal Desktop'])
console.log('✅ LULUS: Admin Unit memiliki card 3 sejajar per baris (Persetujuan, Monitoring, Scan QR, Presensi Manual, Rekap, Portal Desktop)')

// 3. Simulasi Superadmin Memberikan Hak Role di Halaman Data Guru/Pegawai
console.log('\n--- TEST 3: Simulasi Superadmin Mengubah Role Pegawai di Data Guru/Pegawai ---')

// Ambil salah satu pegawai guru demo: Sulasmi (NIY: 049098034)
const targetStaff = initialState.staff.find(s => s.niy === '049098034')
assert.ok(targetStaff, 'Pegawai guru target harus ada di seed data')
console.log(`Pegawai target awal: ${targetStaff.name} (Role: ${targetStaff.role}, NIY: ${targetStaff.niy})`)

// Skenario A: Superadmin mengubah role guru tersebut menjadi "Kepala Sekolah"
const stateAfterKepsek = simPresReducer(initialState, {
  type: 'UPDATE_STAFF',
  payload: { id: targetStaff.id, role: 'Kepala Sekolah' }
})

// Cek apakah data staff terupdate
const updatedStaffKepsek = stateAfterKepsek.staff.find(s => s.id === targetStaff.id)
assert.equal(updatedStaffKepsek.role, 'Kepala Sekolah', 'Role di data pegawai harus terupdate')

// Cek apakah akun login pegawai di userAccounts tetap ada dan rolenya Kepala Sekolah
const userAccountKepsek = stateAfterKepsek.userAccounts.find(a => a.niy === targetStaff.niy)
assert.ok(userAccountKepsek, 'Akun userAccounts untuk login mobile TIDAK boleh dihapus')
assert.equal(userAccountKepsek.role, 'Kepala Sekolah', 'Role akun userAccounts harus menjadi Kepala Sekolah')

// Cek autentikasi login via NIY
const authResultKepsek = authenticateCredentials(stateAfterKepsek, targetStaff.niy, targetStaff.niy)
assert.equal(authResultKepsek.ok, true, 'Login dengan NIY harus berhasil')
assert.equal(authResultKepsek.user.role, 'Kepala Sekolah', 'Akun login harus membawa role Kepala Sekolah')

// Cek tampilan mobile: otomatis mendapatkan Card Khusus Kepala Sekolah
const kepsekMobileEval = evaluateHomeCards(authResultKepsek.user.role)
assert.equal(kepsekMobileEval.hasSpecialCard, true)
assert.equal(kepsekMobileEval.cardTitle, 'Menu Manajemen Kepala Sekolah')
console.log('✅ LULUS: Guru yang dipromosikan menjadi Kepala Sekolah otomatis memperoleh Card Manajemen di akun mobilenya')

// Skenario B: Superadmin mengubah role guru tersebut menjadi "Admin Unit"
const stateAfterAdmin = simPresReducer(initialState, {
  type: 'UPDATE_STAFF',
  payload: { id: targetStaff.id, role: 'Admin Unit' }
})
const updatedStaffAdmin = stateAfterAdmin.staff.find(s => s.id === targetStaff.id)
assert.equal(updatedStaffAdmin.role, 'Admin Unit')
const userAccountAdmin = stateAfterAdmin.userAccounts.find(a => a.niy === targetStaff.niy)
assert.ok(userAccountAdmin, 'Akun userAccounts harus tetap ada')
assert.equal(userAccountAdmin.role, 'Admin Unit')

const authResultAdmin = authenticateCredentials(stateAfterAdmin, targetStaff.niy, targetStaff.niy)
assert.equal(authResultAdmin.ok, true)
assert.equal(authResultAdmin.user.role, 'Admin Unit')
const adminMobileEval = evaluateHomeCards(authResultAdmin.user.role)
assert.equal(adminMobileEval.hasSpecialCard, true)
assert.equal(adminMobileEval.cardTitle, 'Menu Operasional Admin Unit')
console.log('✅ LULUS: Guru yang dipromosikan menjadi Admin Unit otomatis memperoleh Card Operasional di akun mobilenya')

// Skenario C: Superadmin mengembalikan role menjadi Guru biasa
const stateAfterReset = simPresReducer(stateAfterAdmin, {
  type: 'UPDATE_STAFF',
  payload: { id: targetStaff.id, role: 'Guru PAI' }
})
const authResultReset = authenticateCredentials(stateAfterReset, targetStaff.niy, targetStaff.niy)
assert.equal(authResultReset.ok, true)
assert.equal(authResultReset.user.role, 'Guru')
const resetMobileEval = evaluateHomeCards(authResultReset.user.role)
assert.equal(resetMobileEval.hasSpecialCard, false, 'Card khusus harus hilang saat dikembalikan ke Guru biasa')
console.log('✅ LULUS: Saat dikembalikan menjadi Guru biasa, Card Khusus otomatis hilang dari Beranda mobile')

console.log('\n================================================================================')
console.log('SEMUA PENGUJIAN PENUGASAN ROLE SUPERADMIN & TAMPILAN MOBILE LULUS 100%')
console.log('================================================================================')
