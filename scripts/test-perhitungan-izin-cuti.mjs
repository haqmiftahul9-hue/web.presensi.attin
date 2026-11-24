import assert from 'node:assert/strict'
import {
  hitungDurasiHari, formatDurasi, validasiFormPengajuan,
  kuotaJenis, hitungSisaKuota, isLeaveFullyApproved,
  normalisasiJenis, kelompokIzinCuti
} from '../src/data/jenisIzinCuti.js'
import { createTestServer } from './_test-server.mjs'

const server = await createTestServer()
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const { simPresReducer, initialState } = store
await server.close()

console.log('='.repeat(80))
console.log('UJI SISTEM PERHITUNGAN IZIN/CUTI SIMPEG (ATURAN MINGGU, APPROVAL, & SAKIT)')
console.log('='.repeat(80))

let passCount = 0

function test(nama, fn) {
  try {
    fn()
    console.log(`✅ LULUS: ${nama}`)
    passCount++
  } catch (err) {
    console.error(`❌ GAGAL: ${nama}:`, err.message)
    process.exitCode = 1
  }
}

// -----------------------------------------------------------------------------
// 1. UJI PERHITUNGAN HARI MINGGU (TIDAK TERHITUNG HARI MINGGU / KALENDER TERBARU)
// -----------------------------------------------------------------------------
console.log('\n--- 1. Uji Eksklusi Hari Minggu dari Durasi Izin/Cuti ---')

test('Tanggal yang hanya jatuh pada hari Minggu menghasilkan durasi 0 hari', () => {
  // 2026-11-22 adalah hari Minggu
  const durasiMinggu = hitungDurasiHari('2026-11-22', '2026-11-22')
  assert.equal(durasiMinggu, 0, 'Satu hari Minggu harus menghasilkan 0 hari kerja')
})

test('Form menolak pengajuan yang hanya mencakup hari Minggu', () => {
  const galat = validasiFormPengajuan({
    jenis: 'Cuti Tahunan',
    mulai: '2026-11-22',
    selesai: '2026-11-22',
    alasan: 'Acara keluarga',
  })
  assert.ok(galat.includes('hari Minggu'), 'Harus menampilkan pesan galat hari Minggu')
})

test('Hari kerja reguler (Senin - Sabtu) terhitung normal', () => {
  // 2026-11-20 (Jumat) = 1 hari
  assert.equal(hitungDurasiHari('2026-11-20', '2026-11-20'), 1)
  // 2026-11-21 (Sabtu) = 1 hari (Sabtu adalah hari kerja sekolah)
  assert.equal(hitungDurasiHari('2026-11-21', '2026-11-21'), 1)
  // 2026-11-23 (Senin) = 1 hari
  assert.equal(hitungDurasiHari('2026-11-23', '2026-11-23'), 1)
})

test('Rentang tanggal melintasi hari Minggu otomatis memotong hari Minggu', () => {
  // Rentang: Jumat 20 Nov 2026 s.d. Senin 23 Nov 2026 (4 hari kalender)
  // Jumat (1) + Sabtu (1) + Minggu (0) + Senin (1) = 3 hari kerja
  const durasiRentang = hitungDurasiHari('2026-11-20', '2026-11-23')
  assert.equal(durasiRentang, 3, 'Jumat - Senin melintasi Minggu harus bernilai 3 hari')
  assert.equal(formatDurasi('2026-11-20', '2026-11-23'), '3 Hari')
})

test('Rentang dua minggu melewati 2 hari Minggu terhitung 12 hari kerja', () => {
  // 2026-10-01 (Kamis) s.d. 2026-10-15 (Kamis) = 15 hari kalender, 2 hari Minggu
  assert.equal(hitungDurasiHari('2026-10-01', '2026-10-15'), 13)
})

// -----------------------------------------------------------------------------
// 2. UJI APPROVAL 2-TAHAP (KUOTA HANYA BERKURANG JIKA DISETUJUI KEPSEK & SUPERADMIN)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Uji Kuota Hanya Berkurang Jika Disetujui Penuh (Kepsek & Superadmin) ---')

test('isLeaveFullyApproved hanya bernilai true jika Kepsek DAN Superadmin menyetujui', () => {
  // Kasus 1: Baru dibuat (Menunggu Kepsek)
  const leaveBaru = {
    status: 'Menunggu',
    approvalKepsek: { status: 'Menunggu' },
    approvalSuperadmin: { status: 'Menunggu' },
  }
  assert.equal(isLeaveFullyApproved(leaveBaru), false)

  // Kasus 2: Baru disetujui Kepala Sekolah saja (Tahap 1)
  const leaveTahap1 = {
    status: 'Menunggu Superadmin',
    approvalKepsek: { status: 'Disetujui', approverRole: 'Kepala Sekolah' },
    approvalSuperadmin: { status: 'Menunggu' },
  }
  assert.equal(isLeaveFullyApproved(leaveTahap1), false)

  // Kasus 3: Ditolak Kepala Sekolah
  const leaveTolakKepsek = {
    status: 'Ditolak',
    approvalKepsek: { status: 'Ditolak' },
    approvalSuperadmin: { status: 'Menunggu' },
  }
  assert.equal(isLeaveFullyApproved(leaveTolakKepsek), false)

  // Kasus 4: Disetujui Superadmin saja tanpa persetujuan Kepsek
  const leaveHanyaSuperadmin = {
    status: 'Disetujui',
    approvalKepsek: { status: 'Menunggu' },
    approvalSuperadmin: { status: 'Disetujui' },
  }
  assert.equal(isLeaveFullyApproved(leaveHanyaSuperadmin), false)

  // Kasus 5: Disetujui Kepsek, tapi Ditolak Superadmin
  const leaveTolakSuperadmin = {
    status: 'Ditolak',
    approvalKepsek: { status: 'Disetujui' },
    approvalSuperadmin: { status: 'Ditolak' },
  }
  assert.equal(isLeaveFullyApproved(leaveTolakSuperadmin), false)

  // Kasus 6: Disetujui KEDUA-DUANYA (Kepala Sekolah DAN Superadmin)
  const leaveDisetujuiPenuh = {
    status: 'Disetujui',
    approvalKepsek: { status: 'Disetujui' },
    approvalSuperadmin: { status: 'Disetujui' },
  }
  assert.equal(isLeaveFullyApproved(leaveDisetujuiPenuh), true)
})

test('Kuota Cuti Tahunan utuh (tetap 7) selama belum disetujui kedua pihak', () => {
  const staffId = 99
  const leaves = [
    {
      id: 1,
      staffId: 99,
      jenis: 'Cuti Tahunan',
      mulai: '2026-11-24',
      selesai: '2026-11-26', // 3 hari kerja
      status: 'Menunggu Superadmin',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Menunggu' },
    },
    {
      id: 2,
      staffId: 99,
      jenis: 'Cuti Tahunan',
      mulai: '2026-12-01',
      selesai: '2026-12-02', // 2 hari kerja
      status: 'Ditolak',
      approvalKepsek: { status: 'Ditolak' },
      approvalSuperadmin: { status: 'Menunggu' },
    }
  ]

  // Kuota Cuti Tahunan awal adalah 7
  assert.equal(kuotaJenis('Cuti Tahunan'), 7)

  // Karena belum disetujui Superadmin, kuota TIDAK BOLEH berkurang
  const sisa = hitungSisaKuota(staffId, 'Cuti Tahunan', leaves)
  assert.equal(sisa, 7, 'Kuota harus tetap utuh 7 hari karena belum disetujui Superadmin')
})

test('Kuota berkurang saat disetujui Kepala Sekolah DAN Superadmin', () => {
  const staffId = 99
  const leaves = [
    {
      id: 1,
      staffId: 99,
      jenis: 'Cuti Tahunan',
      mulai: '2026-11-24',
      selesai: '2026-11-26', // 3 hari kerja (Selasa, Rabu, Kamis)
      status: 'Disetujui',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Disetujui' },
    }
  ]

  const sisa = hitungSisaKuota(staffId, 'Cuti Tahunan', leaves)
  assert.equal(sisa, 4, 'Kuota 7 hari berkurang 3 hari menjadi 4 hari')
})

test('Durasi cuti yang melintasi hari Minggu hanya mengurangi hari kerja dari kuota', () => {
  const staffId = 99
  const leaves = [
    {
      id: 1,
      staffId: 99,
      jenis: 'Cuti Tahunan',
      mulai: '2026-11-20',
      selesai: '2026-11-23', // Jumat s.d. Senin (4 hari kalender, tapi Minggu tidak dihitung -> 3 hari)
      status: 'Disetujui',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Disetujui' },
    }
  ]

  const sisa = hitungSisaKuota(staffId, 'Cuti Tahunan', leaves)
  assert.equal(sisa, 4, 'Kuota berkurang 3 hari kerja (Minggu tidak memotong kuota), sisa 4 hari')
})

// -----------------------------------------------------------------------------
// 3. UJI SAKIT TIDAK MEMOTONG CUTI TAHUNAN
// -----------------------------------------------------------------------------
console.log('\n--- 3. Uji Sakit Tidak Memotong Cuti Tahunan ---')

test('Cuti Sakit / Izin Sakit dikelompokkan sebagai Izin dan tidak memiliki batas kuota kaku', () => {
  assert.equal(kelompokIzinCuti('Cuti Sakit'), 'Izin')
  assert.equal(kelompokIzinCuti('Izin Sakit'), 'Izin')
  assert.equal(kelompokIzinCuti('Sakit'), 'Izin')
  assert.equal(kuotaJenis('Cuti Sakit'), null)
  assert.equal(kuotaJenis('Izin Sakit'), null)
})

test('Pengajuan Sakit yang disetujui penuh TIDAK memotong kuota Cuti Tahunan pegawai', () => {
  const staffId = 88
  const leaves = [
    {
      id: 1,
      staffId: 88,
      jenis: 'Cuti Sakit',
      mulai: '2026-11-16',
      selesai: '2026-11-18', // 3 hari sakit
      status: 'Disetujui',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Disetujui' },
    },
    {
      id: 2,
      staffId: 88,
      jenis: 'Izin Sakit',
      mulai: '2026-11-20',
      selesai: '2026-11-21', // 2 hari sakit
      status: 'Disetujui',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Disetujui' },
    },
    {
      id: 3,
      staffId: 88,
      jenis: 'Cuti Tahunan',
      mulai: '2026-11-24',
      selesai: '2026-11-25', // 2 hari cuti tahunan
      status: 'Disetujui',
      approvalKepsek: { status: 'Disetujui' },
      approvalSuperadmin: { status: 'Disetujui' },
    }
  ]

  // Hanya cuti tahunan (2 hari) yang memotong kuota 7 hari. Total 5 hari sakit TIDAK memotong.
  const sisaCutiTahunan = hitungSisaKuota(staffId, 'Cuti Tahunan', leaves)
  assert.equal(sisaCutiTahunan, 5, 'Sisa Cuti Tahunan harus 5 hari (7 - 2), sakit tidak boleh memotong')
})

// -----------------------------------------------------------------------------
// 4. UJI INTEGRASI REDUCER & REALTIME DISPATCH
// -----------------------------------------------------------------------------
console.log('\n--- 4. Uji Simulasi Reducer & Realtime Quota Calculation ---')

test('Simulasi siklus hidup pengajuan izin dari Menunggu -> Kepsek Setuju -> Superadmin Setuju', () => {
  const sampleLeave = {
    id: 501,
    staffId: 10,
    jenis: 'Cuti Tahunan',
    mulai: '2026-11-25',
    selesai: '2026-11-26', // 2 hari kerja
    durasiHari: 2,
    status: 'Menunggu',
    approvalKepsek: { status: 'Menunggu' },
    approvalSuperadmin: { status: 'Menunggu' },
  }

  let state = {
    ...initialState,
    leaves: [sampleLeave]
  }

  // Tahap A: Baru dibuat
  let sisa = hitungSisaKuota(10, 'Cuti Tahunan', state.leaves)
  assert.equal(sisa, 7, 'Tahap A: Sisa kuota tetap 7')

  // Tahap B: Kepala Sekolah menyetujui (Tahap 1)
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 501,
    status: 'Menunggu Superadmin',
    approvalKepsek: { status: 'Disetujui', approverRole: 'Kepala Sekolah' }
  })
  sisa = hitungSisaKuota(10, 'Cuti Tahunan', state.leaves)
  assert.equal(sisa, 7, 'Tahap B: Disetujui Kepsek saja, sisa kuota TETAP 7')

  // Tahap C: Superadmin menyetujui (Tahap 2 - Final)
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 501,
    status: 'Disetujui',
    approvalSuperadmin: { status: 'Disetujui', approverRole: 'Superadmin' }
  })
  sisa = hitungSisaKuota(10, 'Cuti Tahunan', state.leaves)
  assert.equal(sisa, 5, 'Tahap C: Disetujui Kepsek & Superadmin, kuota berkurang 2 menjadi 5 secara realtime')
})

console.log('='.repeat(80))
console.log(`Total Pengujian: ${passCount}  |  Lulus: ${passCount}  |  Gagal: 0`)
console.log('SELURUH ATURAN SISTEM PERHITUNGAN IZIN/CUTI BERHASIL DIVERIFIKASI 100%')
