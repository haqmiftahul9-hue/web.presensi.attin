// ============================================================================
// UJI FILTER RIWAYAT PRESENSI (MOBILE GURU/PEGAWAI)
//
// Cakupan:
//   1. Parsing & format tanggal Indonesia (dd/mm/yyyy <-> YYYY-MM-DD).
//   2. Mode Bulanan  -> "Oktober 2026" menampilkan seluruh Oktober.
//   3. Mode Rentang  -> 01/10/2026 s.d. 15/10/2026 hanya menampilkan 1-15 Oktober.
//   4. Empty state   -> rentang tanpa data menghasilkan daftar kosong.
//   5. Pemisahan data -> guru hanya melihat presensi miliknya sendiri.
//
// Jalankan: node scripts/test-filter-riwayat.mjs
// ============================================================================

import { createServer } from 'vite'
import {
  filterRiwayatPeriode, rekapRentang, rentangDariPeriode, labelPeriode,
  tanggalIDKeISO, isoKeTanggalID, tanggalLengkapISO, hitungRentangHari,
  izinPerTanggal, statusHari, MODE_BULANAN, MODE_RENTANG,
} from '../src/data/presensiMobile.js'

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(64)} ${String(aktual).padEnd(22)} (harapan: ${diharapkan})`)
}

function ujiDaftar(nama, aktual, diharapkan) {
  const a = JSON.stringify(aktual)
  const b = JSON.stringify(diharapkan)
  const ok = a === b
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(64)} ${a.padEnd(30)} (harapan: ${b})`)
}

// ===== 1. PARSING & FORMAT TANGGAL =========================================
uji('dd/mm/yyyy -> ISO (01/10/2026)', tanggalIDKeISO('01/10/2026'), '2026-10-01')
uji('dd/mm/yyyy -> ISO (15/10/2026)', tanggalIDKeISO('15/10/2026'), '2026-10-15')
uji('Tanpa nol di depan (5/1/2026)', tanggalIDKeISO('5/1/2026'), '2026-01-05')
uji('ISO -> dd/mm/yyyy', isoKeTanggalID('2026-10-01'), '01/10/2026')
uji('Format salah ditolak', tanggalIDKeISO('2026-10-01'), null)
uji('Tanggal tak ada ditolak (31/02/2026)', tanggalIDKeISO('31/02/2026'), null)
uji('Bulan di luar rentang ditolak (01/13/2026)', tanggalIDKeISO('01/13/2026'), null)
uji('Teks kosong ditolak', tanggalIDKeISO(''), null)
uji('Label lengkap tanggal (01 Oktober 2026)', tanggalLengkapISO('2026-10-01'), 'Kamis, 01 Oktober 2026')
uji('Label lengkap tanggal (05 Oktober 2026 = Senin)', tanggalLengkapISO('2026-10-05'), 'Senin, 05 Oktober 2026')
uji('Jumlah hari rentang 1-15 Oktober', hitungRentangHari('2026-10-01', '2026-10-15'), 15)
uji('Jumlah hari rentang satu hari', hitungRentangHari('2026-10-01', '2026-10-01'), 1)
uji('Jumlah hari rentang terbalik', hitungRentangHari('2026-10-15', '2026-10-01'), 0)
uji('Jumlah hari tanpa rentang', hitungRentangHari(null, null), 0)

// ===== DATA CONTOH =========================================================
// Riwayat October 2026 milik seorang guru. 01-15 Oktober sudah diisi;
// 16-31 Oktober sengaja dikosongkan agar filter rentang bisa diuji.
const OKTOBER = [
  ['2026-10-01', '07:05', '16:02', 0],
  ['2026-10-02', '07:25', '16:10', 15],
  ['2026-10-05', '07:11', '16:00', 1],
  ['2026-10-09', '08:00', '15:30', 50],
  ['2026-10-10', '07:25', '13:00', 0],
  ['2026-10-15', '07:10', '16:05', 0],
]
const riwayat = OKTOBER.map(([date, masuk, pulang, lateMinutes], i) => ({
  id: `r${i}`,
  date,
  staffId: 1,
  masuk,
  pulang,
  lateMinutes,
  method: 'Face Recognition',
}))

const izinTanggal = izinPerTanggal([
  { id: 'i1', staffId: 1, jenis: 'Izin', periode: '06-07 Oktober 2026', durasi: '2 hari', status: 'Disetujui' },
  { id: 'i2', staffId: 1, jenis: 'Cuti', periode: '20 Oktober 2026', durasi: '1 hari', status: 'Disetujui' },
])

const tgl = (rows) => rows.map((r) => r.date)

// ===== 2. MODE BULANAN =====================================================
const perBulanan = filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_BULANAN, key: '2026-10' } })
// Izin "06-07 Oktober" dipecah jadi dua hari, cuti "20 Oktober" jadi satu hari.
ujiDaftar('Bulanan: seluruh Oktober (riwayat + izin)', tgl(perBulanan), [
  '2026-10-20', '2026-10-15', '2026-10-10', '2026-10-09', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-02', '2026-10-01',
])
uji('Bulanan: 20 Oktober ikut sebagai hari cuti', perBulanan.some((r) => r.date === '2026-10-20' && r.izin), true)
uji('Bulanan: tidak ada hari di luar Oktober', perBulanan.every((r) => r.date.startsWith('2026-10')), true)

// Bulan lain kosong -> empty state.
const perNovember = filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_BULANAN, key: '2026-11' } })
uji('Bulanan November tanpa data -> daftar kosong', perNovember.length, 0)
uji('Label periode bulanan', labelPeriode({ mode: MODE_BULANAN, key: '2026-10' }), 'Oktober 2026')

// ===== 3. MODE RENTANG TANGGAL ============================================
const perRentang = filterRiwayatPeriode({
  riwayat,
  izinTanggal,
  periode: { mode: MODE_RENTANG, dari: '2026-10-01', sampai: '2026-10-15' },
})
ujiDaftar('Rentang 01-15 Oktober', tgl(perRentang), [
  '2026-10-15', '2026-10-10', '2026-10-09', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-02', '2026-10-01',
])
uji('Rentang: 20 Oktober (cuti) di luar rentang', perRentang.some((r) => r.date === '2026-10-20'), false)
uji('Rentang: 02 Oktober tetap ada (terlambat 15 mnt)', perRentang.find((r) => r.date === '2026-10-02')?.lateMinutes, 15)
uji('Rentang: 06 Oktober ikut sebagai hari izin', perRentang.find((r) => r.date === '2026-10-06')?.izin?.jenis, 'Izin')

// Rentang kedua, dipanggil lagi tanpa mengubah data sumber (tidak ada reload).
const perRentang2 = filterRiwayatPeriode({
  riwayat,
  izinTanggal,
  periode: { mode: MODE_RENTANG, dari: '2026-10-09', sampai: '2026-10-10' },
})
ujiDaftar('Rentang 09-10 Oktober (Jumat-Sabtu)', tgl(perRentang2), ['2026-10-10', '2026-10-09'])
uji('Rentang 09-10: status Jumat 08:00 = Terlambat', statusHari({ tanggal: '2026-10-09', masuk: '08:00' }).label, 'Terlambat 50 mnt')
uji('Rentang 09-10: status Sabtu 07:25 = Tepat Waktu', statusHari({ tanggal: '2026-10-10', masuk: '07:25' }).label, 'Tepat Waktu')

// Beralih dari rentang ke bulanan pada data yang sama harus mengembalikan hasil penuh.
const kembaliBulanan = filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_BULANAN, key: '2026-10' } })
uji('Kembali ke bulanan mengembalikan seluruh Oktober', kembaliBulanan.length, perBulanan.length)

// ===== 4. EMPTY STATE ======================================================
const kosong = filterRiwayatPeriode({
  riwayat,
  izinTanggal,
  periode: { mode: MODE_RENTANG, dari: '2026-12-01', sampai: '2026-12-15' },
})
uji('Rentang tanpa data -> daftar kosong (empty state)', kosong.length, 0)
uji('Rentang terbalik -> daftar kosong', filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_RENTANG, dari: '2026-10-15', sampai: '2026-10-01' } }).length, 0)
uji('Rentang tanpa tanggal -> daftar kosong', filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_RENTANG } }).length, 0)
uji('Bulan tanpa key -> daftar kosong', filterRiwayatPeriode({ riwayat, izinTanggal, periode: { mode: MODE_BULANAN } }).length, 0)
uji('Label periode rentang', labelPeriode({ mode: MODE_RENTANG, dari: '2026-10-01', sampai: '2026-10-15' }), '01 Oktober 2026 - 15 Oktober 2026')

// ===== 5. REKAP MENGIKUTI PERIODE YANG DIPILIH ==============================
// Jalankan jalur yang sama persis dengan halaman: rentangDariPeriode() ->
// rekapRentang(), supaya angka header dan isi daftar diuji bersama.
function jalankanHalaman(periode) {
  const rentang = rentangDariPeriode(periode)
  return {
    rentang,
    daftar: filterRiwayatPeriode({ riwayat, izinTanggal, periode }),
    rekap: rekapRentang({
      riwayat,
      izinTanggal,
      dari: rentang.dari,
      sampai: rentang.sampai,
      totalHariKerja: hitungRentangHari(rentang.dari, rentang.sampai) || 1,
    }),
  }
}

uji('Rentang bulanan: awal bulan', rentangDariPeriode({ mode: MODE_BULANAN, key: '2026-10' }).dari, '2026-10-01')
uji('Rentang bulanan: akhir bulan', rentangDariPeriode({ mode: MODE_BULANAN, key: '2026-10' }).sampai, '2026-10-31')
uji('Rentang bulanan tanpa key', rentangDariPeriode({ mode: MODE_BULANAN }).dari, '')
uji('Rentang tanggal: batas ikut apa adanya', rentangDariPeriode({ mode: MODE_RENTANG, key: '2026-10', dari: '2026-10-01', sampai: '2026-10-15' }).sampai, '2026-10-15')

const okt = jalankanHalaman({ mode: MODE_BULANAN, key: '2026-10' })
uji('Halaman bulanan: jumlah hari di daftar', okt.daftar.length, 9)
uji('Halaman bulanan: rekap hadir', okt.rekap.hadir, 6)
uji('Halaman bulanan: rekap terlambat', okt.rekap.terlambat, 3)
uji('Halaman bulanan: rekap tepat waktu', okt.rekap.tepatWaktu, 3)
uji('Halaman bulanan: rekap izin (06 + 07 Oktober)', okt.rekap.izin, 2)
uji('Halaman bulanan: rekap cuti (20 Oktober)', okt.rekap.cuti, 1)
uji('Halaman bulanan: total hari kerja', okt.rekap.totalHariKerja, 31)
uji('Halaman bulanan: jumlah hari di rekap = jumlah hari di daftar', okt.rekap.hariKerja, okt.daftar.length)

// REGRESI: berpindah dari rentang tanggal ke bulanan tidak boleh meninggalkan
// sisa rentang lama pada angka rekap.
const setelahRentang = jalankanHalaman({ mode: MODE_RENTANG, dari: '2026-10-09', sampai: '2026-10-10' })
uji('Halaman rentang 9-10: jumlah hari', setelahRentang.daftar.length, 2)
uji('Halaman rentang 9-10: rekap hadir', setelahRentang.rekap.hadir, 2)
const kembali = jalankanHalaman({ mode: MODE_BULANAN, key: '2026-10' })
uji('REGRESI: kembali ke bulanan mengembalikan seluruh Oktober', kembali.daftar.length, 9)
uji('REGRESI: kembali ke bulanan mengembalikan seluruh angka rekap', kembali.rekap.hadir, 6)
uji('REGRESI: kembali ke bulanan mengembalikan izin/cuti', kembali.rekap.izin + kembali.rekap.cuti, 3)

const rentang15 = jalankanHalaman({ mode: MODE_RENTANG, dari: '2026-10-01', sampai: '2026-10-15' })
uji('Halaman rentang 1-15: jumlah hari', rentang15.daftar.length, 8)
uji('Halaman rentang 1-15: rekap hadir', rentang15.rekap.hadir, 6)
uji('Halaman rentang 1-15: rekap izin', rentang15.rekap.izin, 2)
uji('Halaman rentang 1-15: rekap cuti di luar rentang', rentang15.rekap.cuti, 0)
uji('Halaman rentang 1-15: total hari kerja', rentang15.rekap.totalHariKerja, 15)
uji('Halaman rentang 1-15: jumlah hari di rekap = jumlah hari di daftar', rentang15.rekap.hariKerja, rentang15.daftar.length)

const jumatSabtu = jalankanHalaman({ mode: MODE_RENTANG, dari: '2026-10-09', sampai: '2026-10-10' })
uji('Halaman rentang 9-10: rekap terlambat', jumatSabtu.rekap.terlambat, 1)
uji('Halaman rentang 9-10: rekap tepat waktu', jumatSabtu.rekap.tepatWaktu, 1)
uji('Halaman rentang 9-10: persen 100', jumatSabtu.rekap.persen, 100)

const tanpaData = jalankanHalaman({ mode: MODE_RENTANG, dari: '2026-12-01', sampai: '2026-12-15' })
uji('Halaman rentang kosong: daftar kosong', tanpaData.daftar.length, 0)
uji('Halaman rentang kosong: rekap hadir 0', tanpaData.rekap.hadir, 0)
uji('Halaman rentang kosong: persen 0', tanpaData.rekap.persen, 0)

// ===== 6. DATA MILIK SENDIRI SAJA (melalui store) ==========================
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
let store
try {
  store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
} finally {
  await server.close()
}

const { selectSelfStaff, selectRiwayatPresensiSaya, selectSelfLeaves } = store

const stateGanda = {
  staff: [
    { id: 1, niy: '0001', name: 'Guru, S.Pd', role: 'Guru', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0 },
    { id: 2, niy: '0002', name: 'Lain, S.Pd', role: 'Guru', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0 },
  ],
  units: [{ id: 'sd', nama: 'SDIT Attin Sumbar', radius: 75 }],
  leaves: [
    { id: 'l1', staffId: 1, jenis: 'Izin', periode: '06 Oktober 2026', durasi: '1 hari', status: 'Disetujui' },
    { id: 'l2', staffId: 2, jenis: 'Izin', periode: '06 Oktober 2026', durasi: '1 hari', status: 'Disetujui' },
  ],
  adminUsers: [],
  logs: [],
  userAccounts: [
    { id: 'u1', staffId: 1, nama: 'Guru', role: 'Guru' },
  ],
  currentUser: { id: 'u1', staffId: 1, nama: 'Guru', role: 'Guru' },
  permissionMatrix: {},
  selectedUnitId: 'all',
  settings: { zonaWaktu: 'WIB', presensi: {} },
  attendanceHistory: [
    { id: 'h1', date: '2026-10-01', staffId: 1, masuk: '07:05', pulang: '16:02', lateMinutes: 0, method: 'Face Recognition' },
    { id: 'h2', date: '2026-10-01', staffId: 2, masuk: '09:30', pulang: '16:00', lateMinutes: 135, method: 'QR Code' },
    { id: 'h3', date: '2026-10-02', staffId: 1, masuk: '07:25', pulang: '16:10', lateMinutes: 15, method: 'Face Recognition' },
    { id: 'h4', date: '2026-10-02', staffId: 2, masuk: '07:00', pulang: '16:00', lateMinutes: 0, method: 'QR Code' },
  ],
}

const staffLogin = selectSelfStaff(stateGanda)
uji('Pegawai yang login terdeteksi', staffLogin?.id, 1)

const riwayatSaya = selectRiwayatPresensiSaya(stateGanda, 400)
uji('Riwayat yang login hanya berisi miliknya sendiri', riwayatSaya.length, 2)
uji('Tidak ada baris pegawai lain di riwayat', riwayatSaya.every((r) => r.staffId === 1), true)
uji('Jam masuk pegawai lain tidak bocor', riwayatSaya.some((r) => r.masuk === '09:30'), false)

const izinSaya = selectSelfLeaves(stateGanda)
uji('Izin yang login hanya miliknya sendiri', izinSaya.length, 1)
uji('Izin pegawai lain tidak bocor', izinSaya.every((l) => l.staffId === 1), true)

// Filter di atas data yang sudah dipisah per pegawai.
const petaIzinSaya = izinPerTanggal(izinSaya)
const daftarSaya = filterRiwayatPeriode({
  riwayat: riwayatSaya,
  izinTanggal: petaIzinSaya,
  periode: { mode: MODE_RENTANG, dari: '2026-10-01', sampai: '2026-10-10' },
})
ujiDaftar('Filter rentang hanya berisi hari milik sendiri', tgl(daftarSaya), ['2026-10-06', '2026-10-02', '2026-10-01'])
uji('Tidak ada kehadiran pegawai lain di hasil filter', daftarSaya.some((r) => r.staffId && r.staffId !== 1), false)

console.log('UJI FILTER RIWAYAT PRESENSI (MOBILE)')
console.log('='.repeat(118))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(118))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')
