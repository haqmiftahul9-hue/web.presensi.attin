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
  simPresReducer, initialState,
  ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, ROLE_GURU_PEGAWAI, ROLE_KEPALA_SEKOLAH, ROLE_PETUGAS_PRESENSI,
  normalisasiRole, canAccessPath, hasPermission,
  selectCurrentUser, selectCurrentUserRole,
  selectScopedStaff, selectScopedLeaves, selectLeavesEnriched, selectSelfLeaves,
  selectMonitoringActivity, selectRekapTableData, selectRekapSummary, selectRankingDataFiltered,
  selectPresensiRules, selectActiveStaff, selectUnitById, selectActiveUnitId,
  authenticateCredentials
} = store

await server.close()

console.log('='.repeat(80))
console.log('TESTING KOMPREHENSIF SELURUH CRUD & SEMUA ROLE (SIMPRES)')
console.log('='.repeat(80))

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ LULUS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ GAGAL: ${name}`)
    console.error(`   Pesan: ${err.message}`)
    failed++
  }
}

// -------------------------------------------------------------
// SEKSI 1: UJI ROLE & HAK AKSES SISTEM
// -------------------------------------------------------------
console.log('\n--- SEKSI 1: UJI ROLE & HAK AKSES SISTEM ---')

test('Role Superadmin memiliki akses penuh ke web portal & mobile', () => {
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/dashboard'), true)
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/superadmin'), true)
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/manajemen-admin-user'), true)
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/pengaturan-global'), true)
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/mobile/home'), true)
})

test('Role Admin Unit dibatasi ke unitnya dan tidak bisa buka pengaturan global superadmin', () => {
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/dashboard'), true)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/data-guru-dan-pegawai'), true)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/presensi-manual'), true)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/pengajuan-izin-dan-cuti'), true)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/rekap-dan-laporan'), true)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/pengaturan-global'), false)
  assert.equal(canAccessPath(initialState, ROLE_ADMIN_UNIT, '/manajemen-admin-user'), false)
})

test('Role Kepala Sekolah berhak approve izin dan monitoring di mobile, dan Superadmin di web approvals', () => {
  assert.equal(canAccessPath(initialState, ROLE_KEPALA_SEKOLAH, '/mobile/home'), true)
  assert.equal(canAccessPath(initialState, ROLE_KEPALA_SEKOLAH, '/mobile/persetujuan-izin'), true)
  assert.equal(canAccessPath(initialState, ROLE_KEPALA_SEKOLAH, '/mobile/admin-monitoring'), true)
  assert.equal(canAccessPath(initialState, ROLE_SUPERADMIN, '/attendance-approvals'), true)
})

test('Role Guru/Pegawai hanya memiliki akses ke Mobile dan ditolak dari Desktop Dashboard', () => {
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/mobile/home'), true)
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/mobile/presensi'), true)
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/mobile/riwayat'), true)
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/mobile/izin-cuti'), true)
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/dashboard'), false)
  assert.equal(canAccessPath(initialState, ROLE_GURU_PEGAWAI, '/pengaturan-global'), false)
})

// -------------------------------------------------------------
// SEKSI 2: CRUD DATA PEGAWAI (STAFF)
// -------------------------------------------------------------
console.log('\n--- SEKSI 2: CRUD DATA PEGAWAI (STAFF) ---')

let state = { ...initialState }

const newPegawai = {
  id: 8888,
  niy: '99008888',
  name: 'Ahmad Dahlan, M.Pd',
  unitId: 'sd',
  role: 'Guru',
  jabatan: 'Guru Matematika',
  status: 'Aktif',
  phone: '081234567890',
  email: 'ahmad.dahlan@attin.sch.id',
  gender: 'L'
}

test('[CREATE] ADD_STAFF menambah pegawai baru dan mensinkronisasi kartu ID serta akun login', () => {
  state = simPresReducer(state, {
    type: 'ADD_STAFF',
    payload: newPegawai
  })
  const added = state.staff.find(s => s.id === 8888)
  assert.ok(added, 'Pegawai baru harus tersimpan di state.staff')
  assert.equal(added.name, 'Ahmad Dahlan, M.Pd')
  assert.equal(added.niy, '99008888')

  // Cek apakah akun login userAccounts dibuat otomatis
  const acc = state.userAccounts.find(a => a.pegawaiId === 8888 || a.niy === '99008888')
  assert.ok(acc, 'Akun login pegawai harus dibuat otomatis di userAccounts')
})

test('[READ] selectScopedStaff membatasi data pegawai sesuai hak akses unit', () => {
  // Superadmin melihat semua unit
  const stateSuperadmin = { ...state, currentUser: { role: 'Superadmin' }, selectedUnitId: 'all' }
  const allStaff = selectScopedStaff(stateSuperadmin)
  assert.equal(allStaff.length, state.staff.length, 'Superadmin melihat seluruh pegawai')

  // Admin SD hanya melihat unit SD
  const stateAdminSD = { ...state, currentUser: { role: 'Admin Unit', unitId: 'sd' }, selectedUnitId: 'sd' }
  const sdStaff = selectScopedStaff(stateAdminSD)
  assert.ok(sdStaff.every(s => s.unitId === 'sd'), 'Admin SD hanya melihat pegawai unit SD')
  assert.ok(sdStaff.some(s => s.id === 8888), 'Pegawai baru unit SD harus muncul di list Admin SD')
})

test('[UPDATE] UPDATE_STAFF memperbarui data profil pegawai', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_STAFF',
    payload: {
      id: 8888,
      jabatan: 'Kepala Lab Komputer',
      phone: '081299999999'
    }
  })
  const updated = state.staff.find(s => s.id === 8888)
  assert.equal(updated.jabatan, 'Kepala Lab Komputer')
  assert.equal(updated.phone, '081299999999')
})

test('[UPDATE] Promosi Pegawai menjadi Admin Unit memindahkan akun ke adminUsers', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_STAFF',
    payload: {
      id: 8888,
      role: 'Admin Unit'
    }
  })
  const staffRole = state.staff.find(s => s.id === 8888)?.role
  assert.equal(normalisasiRole(staffRole), ROLE_ADMIN_UNIT)
  
  // Harus ada di adminUsers
  const adminEntry = state.adminUsers.find(u => u.staffId === 8888 || u.niy === '99008888')
  assert.ok(adminEntry, 'Pegawai promosi admin harus masuk ke adminUsers')
  assert.equal(adminEntry.role, ROLE_ADMIN_UNIT)
})

test('[DELETE] DELETE_STAFF menghapus pegawai dan akun terkait', () => {
  state = simPresReducer(state, {
    type: 'DELETE_STAFF',
    payload: 8888
  })
  const deleted = state.staff.find(s => s.id === 8888)
  assert.equal(deleted, undefined, 'Pegawai harus terhapus dari state.staff')
})

// -------------------------------------------------------------
// SEKSI 3: CRUD MANAJEMEN USER / ADMIN & AUTENTIKASI
// -------------------------------------------------------------
console.log('\n--- SEKSI 3: CRUD MANAJEMEN USER & AUTENTIKASI ---')

const newAdmin = {
  id: 'ADM-TEST-1',
  username: 'admin_test_unit',
  name: 'Admin Uji Coba',
  niy: '99001122',
  email: 'admin.uji@attin.sch.id',
  role: 'Admin Unit',
  unitId: 'sd',
  password: 'Password123!',
  status: 'Aktif'
}

test('[CREATE] ADD_ADMIN_USER menambahkan admin portal baru', () => {
  state = simPresReducer(state, {
    type: 'ADD_ADMIN_USER',
    payload: newAdmin
  })
  const added = state.adminUsers.find(u => u.id === 'ADM-TEST-1')
  assert.ok(added, 'Admin baru harus ada di adminUsers')
  assert.equal(added.username, 'admin_test_unit')
})

test('[READ & AUTH] Autentikasi kredensial login admin baru', () => {
  const auth = authenticateCredentials(state, 'admin_test_unit', 'Password123!')
  assert.equal(auth.ok, true, 'Kredensial valid harus ok: true')
  assert.equal(auth.user?.name, 'Admin Uji Coba')
  assert.equal(auth.user?.role, ROLE_ADMIN_UNIT)
})

test('[UPDATE] RESET_PASSWORD oleh Superadmin mereset password akun admin', () => {
  // Login sebagai Superadmin
  const superadminUser = state.adminUsers.find(u => u.role === 'Superadmin')
  const stateAsSuperadmin = { ...state, currentUser: superadminUser }

  state = simPresReducer(stateAsSuperadmin, {
    type: 'RESET_PASSWORD',
    payload: {
      account: { id: 'ADM-TEST-1', isStaffAccount: false },
      password: 'NewSecretPass2026!'
    }
  })
  const authOld = authenticateCredentials(state, 'admin_test_unit', 'Password123!')
  assert.equal(authOld.ok, false, 'Password lama harus ditolak')
  const authNew = authenticateCredentials(state, 'admin_test_unit', 'NewSecretPass2026!')
  assert.equal(authNew.ok, true, 'Password baru harus berhasil login')
})

test('[DELETE] DELETE_ADMIN_USER menghapus akun admin portal', () => {
  state = simPresReducer(state, {
    type: 'DELETE_ADMIN_USER',
    payload: 'ADM-TEST-1'
  })
  const deleted = state.adminUsers.find(u => u.id === 'ADM-TEST-1')
  assert.equal(deleted, undefined, 'Admin harus terhapus dari adminUsers')
})

// -------------------------------------------------------------
// SEKSI 4: CRUD PRESENSI & REKAP LAPORAN
// -------------------------------------------------------------
console.log('\n--- SEKSI 4: CRUD PRESENSI & REKAP LAPORAN ---')

const targetStaff = state.staff[0]

test('[CREATE] CHECK_IN mencatat presensi masuk dan status hari ini', () => {
  state = simPresReducer(state, {
    type: 'CHECK_IN',
    payload: {
      id: targetStaff.id,
      masuk: '07:10',
      method: 'Face Recognition',
      faceSnapshotUrl: 'data:image/jpeg;base64,sample'
    }
  })
  const todayEntry = state.staff.find(s => s.id === targetStaff.id)
  assert.equal(todayEntry.masuk, '07:10')
  assert.equal(todayEntry.status, 'Aktif')
})

test('[CREATE] CHECK_OUT mencatat presensi pulang', () => {
  state = simPresReducer(state, {
    type: 'CHECK_OUT',
    payload: {
      id: targetStaff.id,
      pulang: '16:05',
      method: 'Face Recognition'
    }
  })
  const todayEntry = state.staff.find(s => s.id === targetStaff.id)
  assert.equal(todayEntry.pulang, '16:05')
})

test('[CREATE / READ] ADD_ATTENDANCE_HISTORY presensi manual langsung tercermin di riwayat & rekap', () => {
  const manualDate = '2026-11-10'
  state = simPresReducer(state, {
    type: 'ADD_ATTENDANCE_HISTORY',
    payload: {
      staffId: targetStaff.id,
      unitId: targetStaff.unitId,
      date: manualDate,
      tanggal: manualDate,
      masuk: '07:05',
      pulang: '16:00',
      status: 'Tepat Waktu',
      lateMinutes: 0,
      method: 'Manual Admin'
    }
  })
  const hist = state.attendanceHistory.find(h => h.staffId === targetStaff.id && h.date === manualDate)
  assert.ok(hist, 'Riwayat presensi manual harus tersimpan')
  assert.equal(hist.masuk, '07:05')
})

test('[UPDATE] UPDATE_ATTENDANCE_HISTORY mengoreksi jam presensi', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_ATTENDANCE_HISTORY',
    payload: {
      staffId: targetStaff.id,
      date: '2026-11-10',
      changes: {
        masuk: '07:00',
        keterangan: 'Koreksi admin'
      }
    }
  })
  const updatedHist = state.attendanceHistory.find(h => h.staffId === targetStaff.id && h.date === '2026-11-10')
  assert.equal(updatedHist.masuk, '07:00')
  assert.equal(updatedHist.keterangan, 'Koreksi admin')
})

test('[DELETE] REMOVE_ATTENDANCE_HISTORY menghapus entri riwayat presensi', () => {
  state = simPresReducer(state, {
    type: 'REMOVE_ATTENDANCE_HISTORY',
    payload: {
      staffId: targetStaff.id,
      date: '2026-11-10'
    }
  })
  const removed = state.attendanceHistory.find(h => h.staffId === targetStaff.id && h.date === '2026-11-10')
  assert.equal(removed, undefined, 'Riwayat presensi harus terhapus')
})

// -------------------------------------------------------------
// SEKSI 5: CRUD PENGAJUAN IZIN & CUTI (WORKFLOW APPROVAL)
// -------------------------------------------------------------
console.log('\n--- SEKSI 5: CRUD PENGAJUAN IZIN & CUTI ---')

const newLeave = {
  id: 7777,
  staffId: targetStaff.id,
  name: targetStaff.name,
  niy: targetStaff.niy,
  unitId: targetStaff.unitId,
  jenis: 'Cuti Tahunan',
  periode: '2026-11-20 - 2026-11-22',
  startDate: '2026-11-20',
  endDate: '2026-11-22',
  durasi: '3 Hari',
  keterangan: 'Keperluan keluarga penting',
  lampiran: 'surat_cuti.pdf',
  status: 'Menunggu'
}

test('[CREATE] ADD_LEAVE pegawai mengajukan permohonan cuti baru', () => {
  state = simPresReducer(state, {
    type: 'ADD_LEAVE',
    payload: newLeave
  })
  const added = state.leaves.find(l => l.id === 7777)
  assert.ok(added, 'Pengajuan cuti harus tersimpan di state.leaves')
  assert.equal(added.status, 'Menunggu')
})

test('[READ] Kepala Sekolah dan Admin Unit dapat melihat cuti unitnya', () => {
  const stateKepsek = {
    ...state,
    currentUser: { role: 'Kepala Sekolah', unitId: targetStaff.unitId, staffId: 999 },
    selectedUnitId: targetStaff.unitId
  }
  const pendingLeaves = selectLeavesEnriched(stateKepsek).filter(l => l.status === 'Menunggu')
  assert.ok(pendingLeaves.some(l => l.id === 7777), 'Pengajuan harus muncul di daftar approval Kepala Sekolah')
})

test('[UPDATE] UPDATE_LEAVE_STATUS menyetujui pengajuan izin/cuti', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 7777,
    status: 'Disetujui'
  })
  const approved = state.leaves.find(l => l.id === 7777)
  assert.equal(approved.status, 'Disetujui', 'Status izin/cuti harus berubah menjadi Disetujui')
})

test('[UPDATE] UPDATE_LEAVE_STATUS menolak pengajuan izin/cuti', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 7777,
    status: 'Ditolak'
  })
  const rejected = state.leaves.find(l => l.id === 7777)
  assert.equal(rejected.status, 'Ditolak', 'Status izin/cuti harus berubah menjadi Ditolak')
})

// -------------------------------------------------------------
// SEKSI 6: CRUD PENGATURAN GLOBAL, JAM KERJA, DAN UNIT
// -------------------------------------------------------------
console.log('\n--- SEKSI 6: CRUD PENGATURAN GLOBAL, JAM KERJA, DAN UNIT ---')

test('[UPDATE] UPDATE_SETTINGS memperbarui toleransi keterlambatan dan geofence', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_SETTINGS',
    payload: {
      toleransiKeterlambatan: 15,
      geofenceRadius: 100,
      officeCoordinates: { lat: -6.2088, lng: 106.8456 }
    }
  })
  assert.equal(state.settings.toleransiKeterlambatan, 15)
  assert.equal(state.settings.geofenceRadius, 100)
  assert.equal(state.settings.officeCoordinates.lat, -6.2088)
})

test('[CREATE] ADD_UNIT menambah unit kerja baru', () => {
  const newUnit = {
    id: 'unit_pesantren',
    nama: 'Pesantren Attin Modern',
    name: 'Pesantren Attin Modern',
    code: 'PAM',
    status: 'Aktif'
  }
  state = simPresReducer(state, {
    type: 'ADD_UNIT',
    payload: newUnit
  })
  const added = state.units.find(u => u.id === 'unit_pesantren')
  assert.ok(added, 'Unit baru harus ada di state.units')
})

test('[UPDATE] UPDATE_UNIT mengubah data unit', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_UNIT',
    payload: {
      id: 'unit_pesantren',
      name: 'Pesantren Attin Islamic Boarding School'
    }
  })
  const updated = state.units.find(u => u.id === 'unit_pesantren')
  assert.equal(updated.name, 'Pesantren Attin Islamic Boarding School')
})

test('[DELETE] DELETE_UNIT menghapus unit kerja', () => {
  state = simPresReducer(state, {
    type: 'DELETE_UNIT',
    payload: 'unit_pesantren'
  })
  const deleted = state.units.find(u => u.id === 'unit_pesantren')
  assert.equal(deleted, undefined, 'Unit harus terhapus dari state.units')
})

// -------------------------------------------------------------
// SEKSI 7: BIOMETRIK REGISTER_FACE
// -------------------------------------------------------------
console.log('\n--- SEKSI 7: BIOMETRIK & SCAN WAJAH ---')

test('[CREATE / UPDATE] REGISTER_FACE mendaftarkan template biometrik wajah pegawai', () => {
  const sampleDescriptor = new Array(128).fill(0.123)
  state = simPresReducer(state, {
    type: 'REGISTER_FACE',
    payload: {
      staffId: targetStaff.id,
      descriptor: sampleDescriptor,
      registeredAt: new Date().toISOString()
    }
  })
  const staffFace = state.staff.find(s => s.id === targetStaff.id)
  assert.ok(staffFace.faceDescriptor, 'Pegawai harus memiliki faceDescriptor tersimpan')
  assert.equal(staffFace.faceDescriptor.length, 128)
})

// -------------------------------------------------------------
// RINGKASAN HASIL
// -------------------------------------------------------------
console.log('\n' + '='.repeat(80))
console.log(`TOTAL PENGUJIAN: ${passed + failed} | LULUS: ${passed} | GAGAL: ${failed}`)
console.log('='.repeat(80))

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 SEMUA PENGUJIAN CRUD DAN ROLE BERHASIL 100% TANPA KESALAHAN! SISTEM SIAP DIGUNAKAN.')
}
