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
  normalisasiRole,
  canAccessPath,
  roleBolehPath,
  simPresReducer,
  ROLE_SUPERADMIN,
  ROLE_ADMIN_UNIT,
  ROLE_KEPALA_SEKOLAH,
  ROLE_GURU_PEGAWAI,
  PERMISSION_MATRIX,
} = store

await server.close()

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ LULUS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ GAGAL: ${name} - ${err.message}`)
    failed++
  }
}

console.log('--- 1. Testing normalisasiRole ---')
test("normalisasiRole('Admin') should be Admin Unit", () => {
  assert.equal(normalisasiRole('Admin'), ROLE_ADMIN_UNIT)
})
test("normalisasiRole('admin') should be Admin Unit", () => {
  assert.equal(normalisasiRole('admin'), ROLE_ADMIN_UNIT)
})
test("normalisasiRole('Admin SD') should be Admin Unit", () => {
  assert.equal(normalisasiRole('Admin SD'), ROLE_ADMIN_UNIT)
})
test("normalisasiRole('admin sekolah') should be Admin Unit", () => {
  assert.equal(normalisasiRole('admin sekolah'), ROLE_ADMIN_UNIT)
})
test("normalisasiRole('Kepala Sekolah') should be Kepala Sekolah", () => {
  assert.equal(normalisasiRole('Kepala Sekolah'), ROLE_KEPALA_SEKOLAH)
})
test("normalisasiRole('kepsek') should be Kepala Sekolah", () => {
  assert.equal(normalisasiRole('kepsek'), ROLE_KEPALA_SEKOLAH)
})
test("normalisasiRole('Guru PAI') should be Guru", () => {
  assert.equal(normalisasiRole('Guru PAI'), ROLE_GURU_PEGAWAI)
})
test("normalisasiRole('Superadmin') should be Superadmin", () => {
  assert.equal(normalisasiRole('Superadmin'), ROLE_SUPERADMIN)
})

console.log('\n--- 2. Testing roleBolehPath and canAccessPath for Mobile ---')
const mockState = {
  permissionMatrix: PERMISSION_MATRIX,
}

test("roleBolehPath('/mobile/home', Admin Unit) should be true", () => {
  assert.equal(roleBolehPath('/mobile/home', ROLE_ADMIN_UNIT), true)
})
test("roleBolehPath('/mobile/home', Kepala Sekolah) should be true", () => {
  assert.equal(roleBolehPath('/mobile/home', ROLE_KEPALA_SEKOLAH), true)
})
test("roleBolehPath('/mobile/home', Guru) should be true", () => {
  assert.equal(roleBolehPath('/mobile/home', ROLE_GURU_PEGAWAI), true)
})
test("roleBolehPath('/mobile/home', Superadmin) should be true", () => {
  assert.equal(roleBolehPath('/mobile/home', ROLE_SUPERADMIN), true)
})

test("canAccessPath(Admin Unit, /mobile/home) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_ADMIN_UNIT, '/mobile/home'), true)
})
test("canAccessPath(Admin Unit, /mobile/persetujuan-izin) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_ADMIN_UNIT, '/mobile/persetujuan-izin'), true)
})
test("canAccessPath(Admin Unit, /mobile/admin-monitoring) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_ADMIN_UNIT, '/mobile/admin-monitoring'), true)
})
test("canAccessPath(Admin Unit, /mobile/admin-scan) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_ADMIN_UNIT, '/mobile/admin-scan'), true)
})
test("canAccessPath(Admin Unit, /mobile/admin-presensi-manual) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_ADMIN_UNIT, '/mobile/admin-presensi-manual'), true)
})

test("canAccessPath(Kepala Sekolah, /mobile/home) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_KEPALA_SEKOLAH, '/mobile/home'), true)
})
test("canAccessPath(Kepala Sekolah, /mobile/persetujuan-izin) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_KEPALA_SEKOLAH, '/mobile/persetujuan-izin'), true)
})
test("canAccessPath(Kepala Sekolah, /mobile/admin-monitoring) should be true", () => {
  assert.equal(canAccessPath(mockState, ROLE_KEPALA_SEKOLAH, '/mobile/admin-monitoring'), true)
})

test("canAccessPath(Guru, /dashboard) should be false", () => {
  assert.equal(canAccessPath(mockState, ROLE_GURU_PEGAWAI, '/dashboard'), false)
})

console.log('\n--- 3. Testing UPDATE_STAFF Reducer & Reactivity ---')
const initialStaff = [
  { id: 101, niy: '2023001', name: 'Ustadz Fauzi', role: 'Guru', unitId: 'sd', status: 'Aktif' },
]
const initialUserAccounts = [
  { id: 'USR-101', username: '2023001', niy: '2023001', pegawaiId: 101, role: 'Guru', status: 'Aktif' },
]
const stateBeforeUpdate = {
  staff: initialStaff,
  userAccounts: initialUserAccounts,
  adminUsers: [],
  employeeCards: [],
  logs: [],
  currentUser: { id: 'USR-101', staffId: 101, pegawaiId: 101, niy: '2023001', role: 'Guru', name: 'Ustadz Fauzi' },
  permissionMatrix: PERMISSION_MATRIX,
}

test("Changing role to Admin Unit updates staff, userAccounts, adminUsers, and currentUser", () => {
  const stateAfterAdmin = simPresReducer(stateBeforeUpdate, {
    type: 'UPDATE_STAFF',
    payload: { id: 101, role: 'Admin Unit' },
  })
  assert.equal(stateAfterAdmin.staff.find((s) => s.id === 101)?.role, ROLE_ADMIN_UNIT)
  assert.equal(stateAfterAdmin.userAccounts.find((a) => a.pegawaiId === 101)?.role, ROLE_ADMIN_UNIT)
  assert.equal(stateAfterAdmin.adminUsers.some((u) => u.staffId === 101 && u.role === ROLE_ADMIN_UNIT), true)
  assert.equal(stateAfterAdmin.currentUser?.role, ROLE_ADMIN_UNIT)
})

test("Changing role to Kepala Sekolah updates staff, userAccounts, adminUsers, and currentUser", () => {
  const stateAfterKepsek = simPresReducer(stateBeforeUpdate, {
    type: 'UPDATE_STAFF',
    payload: { id: 101, role: 'Kepala Sekolah' },
  })
  assert.equal(stateAfterKepsek.staff.find((s) => s.id === 101)?.role, ROLE_KEPALA_SEKOLAH)
  assert.equal(stateAfterKepsek.userAccounts.find((a) => a.pegawaiId === 101)?.role, ROLE_KEPALA_SEKOLAH)
  assert.equal(stateAfterKepsek.adminUsers.some((u) => u.staffId === 101 && u.role === ROLE_KEPALA_SEKOLAH), true)
  assert.equal(stateAfterKepsek.currentUser?.role, ROLE_KEPALA_SEKOLAH)
})

console.log(`\n============================`)
console.log(`Total pengujian: ${passed + failed} | Lulus: ${passed} | Gagal: ${failed}`)
if (failed > 0) process.exit(1)
