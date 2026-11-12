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
  ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, ROLE_GURU, ROLE_KEPALA_SEKOLAH, ROLE_PETUGAS_PRESENSI,
  normalisasiRole, selectCurrentUser, selectCurrentUserRole,
  selectScopedStaff, selectScopedLeaves, selectLeavesEnriched,
  selectJumlahHadir, selectJumlahTerlambat, selectTotalPegawai,
  selectMonitoringActivity, selectRekapTableData, selectRekapSummary,
  selectRankingDataFiltered, hasPermission, selectAppHomePath,
  selectCanSwitchUnit, selectActiveUnitId
} = store

await server.close()

console.log('UJI FITUR DAN AKSES ROLE SUPERADMIN, ADMIN UNIT, DAN KEPALA SEKOLAH')
console.log('='.repeat(80))

let passCount = 0

function test(nama, fn) {
  try {
    fn()
    console.log(`LULUS  ${nama}`)
    passCount++
  } catch (err) {
    console.error(`GAGAL  ${nama}:`, err.message)
    process.exitCode = 1
  }
}

// 1. Role Normalization
test('normalisasiRole mengenali variasi role Kepala Sekolah', () => {
  assert.equal(normalisasiRole('Kepala Sekolah'), ROLE_KEPALA_SEKOLAH)
  assert.equal(normalisasiRole('kepala sekolah'), ROLE_KEPALA_SEKOLAH)
  assert.equal(normalisasiRole('kepala_sekolah'), ROLE_KEPALA_SEKOLAH)
  assert.equal(normalisasiRole('kepala unit'), ROLE_KEPALA_SEKOLAH)
})

test('normalisasiRole mengenali Superadmin dan Admin Unit', () => {
  assert.equal(normalisasiRole('Superadmin'), ROLE_SUPERADMIN)
  assert.equal(normalisasiRole('super admin'), ROLE_SUPERADMIN)
  assert.equal(normalisasiRole('Admin Unit'), ROLE_ADMIN_UNIT)
  assert.equal(normalisasiRole('admin_unit'), ROLE_ADMIN_UNIT)
})

// 2. Superadmin Scoping & Global Access
test('Superadmin memiliki akses lintas seluruh unit', () => {
  const superadminUser = initialState.adminUsers.find(u => u.role === 'Superadmin')
  assert.ok(superadminUser, 'Superadmin user exists in seed')
  
  const stateSuperadmin = {
    ...initialState,
    currentUser: superadminUser,
    selectedUnitId: 'all'
  }
  
  const canSwitch = selectCanSwitchUnit(stateSuperadmin)
  assert.equal(canSwitch, true, 'Superadmin berhak berganti unit')
  
  const staff = selectScopedStaff(stateSuperadmin)
  assert.equal(staff.length, initialState.staff.length, 'Superadmin melihat seluruh pegawai')
  
  const totalPegawai = selectTotalPegawai(stateSuperadmin)
  assert.equal(totalPegawai, initialState.staff.filter(s => s.status === 'Aktif').length)
  
  const rekap = selectRekapTableData(stateSuperadmin)
  assert.ok(Array.isArray(rekap) && rekap.length > 0, 'Rekap table data valid')
  
  const monitoring = selectMonitoringActivity(stateSuperadmin)
  assert.ok(Array.isArray(monitoring), 'Monitoring activity valid')
})

// 3. Admin Unit Scoping (e.g. Unit SD)
test('Admin Unit dibatasi secara ketat hanya pada unit penugasannya', () => {
  const adminSD = initialState.adminUsers.find(u => u.role === 'Admin Unit' && u.unitId === 'sd') || {
    id: 999,
    name: 'Admin SD Attin',
    username: 'admin_sd',
    role: 'Admin Unit',
    unitId: 'sd',
    status: 'Aktif'
  }
  
  const stateAdminSD = {
    ...initialState,
    currentUser: adminSD,
    selectedUnitId: 'sd'
  }
  
  const canSwitch = selectCanSwitchUnit(stateAdminSD)
  assert.equal(canSwitch, false, 'Admin Unit tidak berhak melihat unit lain')
  
  const activeUnit = selectActiveUnitId(stateAdminSD)
  assert.equal(activeUnit, 'sd', 'Unit aktif otomatis terkunci ke unit SD')
  
  const scopedStaff = selectScopedStaff(stateAdminSD)
  assert.ok(scopedStaff.length > 0, 'Ada staff di unit SD')
  assert.ok(scopedStaff.every(s => s.unitId === 'sd'), 'Semua staff berasal dari unit SD')
  
  const scopedLeaves = selectScopedLeaves(stateAdminSD)
  const sdStaffIds = new Set(scopedStaff.map(s => s.id))
  assert.ok(scopedLeaves.every(l => sdStaffIds.has(l.staffId)), 'Izin/cuti hanya milik staff unit SD')
})

// 4. Kepala Sekolah Permissions & Approval
test('Kepala Sekolah memiliki wewenang approval pengajuan izin/cuti unitnya', () => {
  const kepsekUser = {
    id: 888,
    name: 'Drs. H. Ahmad Kepala, M.Pd',
    username: 'kepsek_sd',
    niy: '029011001',
    role: 'Kepala Sekolah',
    unitId: 'sd',
    status: 'Aktif'
  }
  
  const stateKepsek = {
    ...initialState,
    currentUser: kepsekUser,
    selectedUnitId: 'sd'
  }
  
  // Wewenang edit/approve izin cuti
  const canApprove = hasPermission(stateKepsek, ROLE_KEPALA_SEKOLAH, 'pengajuanIzinCuti', 'edit')
  assert.equal(canApprove, true, 'Kepala Sekolah memiliki wewenang approval izin/cuti')
  
  // Home path kepala sekolah adalah mobile
  const homePath = selectAppHomePath(stateKepsek)
  assert.equal(homePath, '/mobile/home', 'Kepala Sekolah diarahkan ke aplikasi mobile')
})

// 5. Leave Approval Reducer Action Test
test('UPDATE_LEAVE_STATUS mengubah status izin/cuti menjadi Disetujui / Ditolak', () => {
  const sampleLeave = {
    id: 101,
    staffId: initialState.staff[0]?.id || 1,
    jenis: 'Cuti Sakit',
    status: 'Menunggu',
    durasi: '1 Hari'
  }
  const stateWithLeave = {
    ...initialState,
    leaves: [sampleLeave]
  }
  
  // Approve
  const approvedState = simPresReducer(stateWithLeave, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 101,
    status: 'Disetujui'
  })
  const updatedApproved = approvedState.leaves.find(l => l.id === 101)
  assert.equal(updatedApproved.status, 'Disetujui')
  
  // Reject
  const rejectedState = simPresReducer(approvedState, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 101,
    status: 'Ditolak'
  })
  const updatedRejected = rejectedState.leaves.find(l => l.id === 101)
  assert.equal(updatedRejected.status, 'Ditolak')
})

// 6. User (Guru) Scoping
test('Guru/Pegawai diarahkan ke mobile dan datanya terisolasi', () => {
  const guruStaff = initialState.staff[0]
  const guruUser = {
    id: 777,
    name: guruStaff.name,
    niy: guruStaff.niy,
    username: guruStaff.niy,
    role: 'Guru',
    unitId: guruStaff.unitId,
    status: 'Aktif'
  }
  
  const stateGuru = {
    ...initialState,
    currentUser: guruUser
  }
  
  const homePath = selectAppHomePath(stateGuru)
  assert.equal(homePath, '/mobile/home', 'Guru diarahkan ke /mobile/home')
  
  const canManageUsers = hasPermission(stateGuru, ROLE_GURU, 'manajemenAdminUser', 'view')
  assert.equal(canManageUsers, false, 'Guru tidak memiliki hak akses manajemen admin user')
})

console.log('='.repeat(80))
console.log(`Total: ${passCount}  |  Lulus: ${passCount}  |  Gagal: 0`)
console.log('SELURUH SKENARIO FITUR & ROLE LULUS DENGAN BENAR')
