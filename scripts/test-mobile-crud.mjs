// ============================================================================
// UJI CRUD FITUR MOBILE (GURU/PEGAWAI) — END TO END DI LAPIS STORE
// ----------------------------------------------------------------------------
// Cakupan:
//   1. CREATE presensi masuk: tercatat di data pegawai DAN riwayat presensi.
//   2. Riwayat presensi tersimpan ke storage, jadi tidak hilang setelah
//      aplikasi dimuat ulang.
//   3. Presensi pulang memperbarui baris hari yang sama (bukan baris baru).
//   4. Presensi masuk dua kali tidak menghasilkan dua baris riwayat.
//   5. CREATE pengajuan izin/cuti: muncul di daftar milik sendiri, dan hari
//      pengajuannya terbaca sebagai izin oleh Riwayat/Slip/Rekap.
//   6. UPDATE persetujuan izin: Kepala Sekolah -> Menunggu Superadmin ->
//      Disetujui, dan statusnya tersimpan.
//   7. UPDATE profil: data pribadi berubah, field terkunci tetap ditolak.
//
// Jalankan: node scripts/test-mobile-crud.mjs
// ============================================================================

import assert from 'node:assert/strict'
import { createTestServer } from './_test-server.mjs'

// ---- Penyimpanan palsu supaya reducer bisa menulis & membaca localStorage.
const memory = new Map()
const storageApi = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
}
globalThis.window = { localStorage: storageApi, sessionStorage: storageApi }

let lulus = 0
let gagal = 0
const rincian = []

async function uji(nama, fn) {
  try {
    await fn()
    lulus += 1
    console.log(`LULUS  ${nama}`)
  } catch (err) {
    gagal += 1
    console.error(`GAGAL  ${nama}\n       ${err.message}`)
  }
}

const server = await createTestServer()

const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const {
  simPresReducer, initialState,
  selectSelfLeaves, selectRiwayatPresensiSaya, selectSelfStaff,
  PERSISTED_ATTENDANCE_HISTORY_KEY, PERSISTED_LEAVES_KEY, PERSISTED_STAFF_KEY,
} = store

const { izinPerTanggal } = await server.ssrLoadModule('/src/data/presensiMobile.js')
const { buildPengajuan } = await server.ssrLoadModule('/src/data/jenisIzinCuti.js')

// ---- Keadaan awal: satu guru yang sedang login.
// Role pegawai di data master berupa jabatan spesifik ("Guru Kelas 6 &
// Kurikulum", "Guru PAI", ...), jadi dicari lewat awalan "Guru".
const guru = initialState.staff.find((s) => s.unitId === 'sd' && String(s.role).startsWith('Guru'))
assert.ok(guru, 'Butuh data guru untuk uji')

let state = {
  ...initialState,
  currentUser: {
    id: 900,
    staffId: guru.id,
    pegawaiId: guru.id,
    niy: guru.niy,
    name: guru.name,
    role: 'Guru',
    unitId: guru.unitId,
    status: 'Aktif',
  },
}

console.log('UJI CRUD FITUR MOBILE')
console.log('='.repeat(80))

// ============================================================================
// 1. CREATE PRESENSI MASUK
// ============================================================================
await uji('Presensi masuk tercatat pada data pegawai', () => {
  state = simPresReducer(state, {
    type: 'CHECK_IN',
    payload: { id: guru.id, masuk: '07:15', method: 'Face Recognition' },
  })
  const staff = state.staff.find((s) => s.id === guru.id)
  assert.equal(staff.masuk, '07:15')
  assert.equal(staff.method, 'Face Recognition')
  assert.equal(staff.attendanceDate, new Date().toISOString().slice(0, 10))
})

await uji('Presensi masuk langsung muncul di Riwayat milik sendiri', () => {
  const riwayat = selectRiwayatPresensiSaya(state, 400)
  const hariIni = riwayat.filter((r) => r.date === new Date().toISOString().slice(0, 10))
  assert.equal(hariIni.length, 1, 'Harus ada tepat satu baris untuk hari ini')
  assert.equal(hariIni[0].masuk, '07:15')
})

// ============================================================================
// 2. PERSISTENSI: BARIS RIWAYAT TIDAK BOLEH HILANG SETELAH MUAT ULANG
// ============================================================================
await uji('Riwayat presensi ditulis ke storage', () => {
  const raw = storageApi.getItem(PERSISTED_ATTENDANCE_HISTORY_KEY)
  assert.ok(raw, 'Riwayat presensi harus tersimpan di storage')
  const tersimpan = JSON.parse(raw)
  const hariIni = tersimpan.filter((r) => r.staffId === guru.id && r.date === new Date().toISOString().slice(0, 10))
  assert.equal(hariIni.length, 1, 'Storage harus memuat satu baris untuk hari ini')
  assert.equal(hariIni[0].masuk, '07:15')
})

await uji('Setelah dimuat ulang, baris presensi hari ini masih ada', async () => {
  // Modul dimuat ulang supaya initial state diambil ulang dari storage.
  const ulang = await server.ssrLoadModule('/src/store/simPresStore.jsx?muat-ulang=1')
  const baris = ulang.initialState.attendanceHistory.filter(
    (r) => r.staffId === guru.id && r.date === new Date().toISOString().slice(0, 10),
  )
  assert.equal(baris.length, 1, 'Baris hari ini harus selamat dari muat ulang')
  assert.equal(baris[0].masuk, '07:15')
})

// ============================================================================
// 3. UPDATE PRESENSI PULANG
// ============================================================================
await uji('Presensi pulang memperbarui baris hari yang sama', () => {
  state = simPresReducer(state, {
    type: 'CHECK_OUT',
    payload: { id: guru.id, pulang: '16:05', method: 'Face Recognition' },
  })
  const hariIni = state.attendanceHistory.filter((r) => r.staffId === guru.id && r.date === new Date().toISOString().slice(0, 10))
  assert.equal(hariIni.length, 1, 'Presensi pulang tidak boleh menambah baris baru')
  assert.equal(hariIni[0].pulang, '16:05')
  assert.equal(state.staff.find((s) => s.id === guru.id).pulang, '16:05')
})

await uji('Presensi pulang juga tersimpan di storage', () => {
  const tersimpan = JSON.parse(storageApi.getItem(PERSISTED_ATTENDANCE_HISTORY_KEY))
  const hariIni = tersimpan.filter((r) => r.staffId === guru.id && r.date === new Date().toISOString().slice(0, 10))
  assert.equal(hariIni.length, 1)
  assert.equal(hariIni[0].pulang, '16:05')
})

// ============================================================================
// 4. PRESENSI MASUK KEDUA TIDAK BOLEH MUNCUL KEMBALI
// ============================================================================
await uji('Presensi masuk kedua tidak menambah baris riwayat', () => {
  state = simPresReducer(state, {
    type: 'CHECK_IN',
    payload: { id: guru.id, masuk: '09:30', method: 'QR Code (Admin Mobile)' },
  })
  const hariIni = state.attendanceHistory.filter((r) => r.staffId === guru.id && r.date === new Date().toISOString().slice(0, 10))
  assert.equal(hariIni.length, 1, 'Satu pegawai hanya boleh punya satu baris per tanggal')
  assert.equal(hariIni[0].masuk, '09:30', 'Jam terbaru yang berlaku')
  assert.equal(hariIni[0].pulang, '16:05', 'Jam pulang tidak boleh hilang')
})

// ============================================================================
// 5. CREATE PENGAJUAN IZIN/CUTI
// ============================================================================
const tanggalIzin = '2026-03-02'
let idPengajuan = 9001

await uji('Pengajuan izin muncul di daftar milik sendiri', () => {
  const pengajuan = buildPengajuan({
    id: idPengajuan,
    staffId: guru.id,
    jenis: 'Izin Pribadi',
    mulai: tanggalIzin,
    selesai: tanggalIzin,
    alasan: 'Keperluan keluarga',
  })
  state = simPresReducer(state, { type: 'ADD_LEAVE', payload: pengajuan })
  const milikSaya = selectSelfLeaves(state)
  const cari = milikSaya.find((l) => l.id === idPengajuan)
  assert.ok(cari, 'Pengajuan harus terlihat di daftar milik sendiri')
  assert.equal(cari.status, 'Menunggu')
  assert.equal(cari.staffId, guru.id)
})

await uji('Pengajuan yang masih Menunggu belum relieving hari kerja', () => {
  const milikSaya = selectSelfLeaves(state)
  const peta = izinPerTanggal(milikSaya)
  assert.equal(peta.has(tanggalIzin), false, 'Pengajuan Menunggu tidak boleh relieving hari kerja')
})

await uji('Pengajuan izin tersimpan di storage', () => {
  const tersimpan = JSON.parse(storageApi.getItem(PERSISTED_LEAVES_KEY))
  assert.ok(tersimpan.some((l) => l.id === idPengajuan), 'Pengajuan harus tersimpan di storage')
})

// ============================================================================
// 6. UPDATE PERSETUJUAN IZIN (KEPALEK SEKOLAH -> SUPERADMIN)
// ============================================================================
await uji('Kepala Sekolah menyetujui -> status Menunggu Superadmin', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: idPengajuan,
    status: 'Menunggu Superadmin',
    tahapApproval: 2,
    approvalKepsek: { status: 'Disetujui', approverName: 'Kepsek', approverRole: 'Kepala Sekolah', tanggal: new Date().toISOString() },
  })
  const leave = state.leaves.find((l) => l.id === idPengajuan)
  assert.equal(leave.status, 'Menunggu Superadmin')
  assert.equal(leave.approvalKepsek.status, 'Disetujui')
})

await uji('Superadmin menyetujui -> status Disetujui dan tersimpan', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: idPengajuan,
    status: 'Disetujui',
    tahapApproval: 3,
    approvalSuperadmin: { status: 'Disetujui', approverName: 'Superadmin', approverRole: 'Superadmin', tanggal: new Date().toISOString() },
  })
  const leave = state.leaves.find((l) => l.id === idPengajuan)
  assert.equal(leave.status, 'Disetujui')
  const tersimpan = JSON.parse(storageApi.getItem(PERSISTED_LEAVES_KEY))
  assert.equal(tersimpan.find((l) => l.id === idPengajuan).status, 'Disetujui')
})

await uji('Setelah disetujui, hari pengajuan terbaca sebagai izin (Riwayat/Slip/Rekap)', () => {
  const milikSaya = selectSelfLeaves(state)
  const peta = izinPerTanggal(milikSaya)
  assert.ok(peta.has(tanggalIzin), `Tanggal ${tanggalIzin} harus terbaca sebagai izin`)
  assert.equal(peta.get(tanggalIzin).jenis, 'Izin Pribadi')
})

// ============================================================================
// 7. UPDATE PROFIL
// ============================================================================
await uji('Profil bisa diperbarui dan langsung terlihat', () => {
  state = simPresReducer(state, {
    type: 'UPDATE_STAFF_PROFILE',
    payload: { name: 'Nama Baru, S.Pd', kontak: '081234567890', email: 'baru@simpres.sch.id' },
  })
  const staff = selectSelfStaff(state)
  assert.equal(staff.name, 'Nama Baru, S.Pd')
  assert.equal(staff.kontak, '081234567890')
  assert.equal(staff.email, 'baru@simpres.sch.id')
})

await uji('Perubahan profil tersimpan di storage', () => {
  const tersimpan = JSON.parse(storageApi.getItem(PERSISTED_STAFF_KEY))
  const staff = tersimpan.find((s) => s.id === guru.id)
  assert.equal(staff.name, 'Nama Baru, S.Pd')
  assert.equal(staff.kontak, '081234567890')
})

await uji('Field terkunci (unit, jabatan, NIY) tidak bisa diubah dari profil', () => {
  const sebelum = state.staff.find((s) => s.id === guru.id)
  state = simPresReducer(state, {
    type: 'UPDATE_STAFF_PROFILE',
    payload: { unitId: 'sma', role: 'Superadmin', niy: '999999999', name: 'Nama Baru, S.Pd' },
  })
  const sesudah = state.staff.find((s) => s.id === guru.id)
  assert.equal(sesudah.unitId, sebelum.unitId)
  assert.equal(sesudah.role, sebelum.role)
  assert.equal(sesudah.niy, sebelum.niy)
})

await server.close()

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO CRUD MOBILE LULUS')
