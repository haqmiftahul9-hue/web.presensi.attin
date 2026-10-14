// ============================================================================
// UJI ATURAN JAM KERJA & FUNGSI calculateAttendanceStatus()
//
// Menjalankan skenario wajib dari spesifikasi:
//   Senin 07:05 -> Tepat Waktu      Senin 07:11 -> Terlambat
//   Jumat 08:00 -> Terlambat        Jumat pulang 15:30 -> tetap valid
//   Sabtu 07:25 -> Tepat Waktu      Sabtu 07:31 -> Terlambat
//
// Jalankan: node scripts/test-jam-kerja.mjs
// ============================================================================

import {
  calculateAttendanceStatus,
  calculateCheckoutStatus,
  jamKerjaRules,
  daftarJamKerja,
  hitungLateMinutes,
} from '../src/data/jamKerja.js'

// Tanggal acuan per hari (Jumat dan Sabtu di minggu yang sama).
const SENIN = '2026-10-05'
const SELASA = '2026-10-06'
const RABU = '2026-10-07'
const KAMIS = '2026-10-08'
const JUMAT = '2026-10-09'
const SABTU = '2026-10-10'
const MINGGU = '2026-10-11'

let lulus = 0
let gagal = 0
const rincian = []

function cek(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(58)} ${String(aktual).padEnd(16)} (harapan: ${diharapkan})`)
  return ok
}

function cekAngka(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(58)} ${String(aktual).padEnd(16)} (harapan: ${diharapkan})`)
  return ok
}

// --- Skenario wajib ---------------------------------------------------------
cek('Senin masuk 07:05 -> status', calculateAttendanceStatus(SENIN, '07:05').status, 'Tepat Waktu')
cek('Senin masuk 07:11 -> status', calculateAttendanceStatus(SENIN, '07:11').status, 'Terlambat')
cek('Senin masuk 07:11 -> lateMinutes', calculateAttendanceStatus(SENIN, '07:11').lateMinutes, 1)
cek('Jumat masuk 08:00 -> status', calculateAttendanceStatus(JUMAT, '08:00').status, 'Terlambat')
cek('Jumat masuk 08:00 -> lateMinutes', calculateAttendanceStatus(JUMAT, '08:00').lateMinutes, 50)
cek('Jumat pulang 15:30 -> valid', calculateCheckoutStatus(JUMAT, '15:30').valid, true)
cek('Sabtu masuk 07:25 -> status', calculateAttendanceStatus(SABTU, '07:25').status, 'Tepat Waktu')
cek('Sabtu masuk 07:31 -> status', calculateAttendanceStatus(SABTU, '07:31').status, 'Terlambat')
cek('Sabtu masuk 07:31 -> lateMinutes', calculateAttendanceStatus(SABTU, '07:31').lateMinutes, 1)

// --- Contoh dari spesifikasi: masuk 07:25, batas 07:10 -> 15 menit ---------
cek('Senin masuk 07:25 -> lateMinutes', calculateAttendanceStatus(SENIN, '07:25').lateMinutes, 15)
cek('Senin masuk 07:25 -> label', calculateAttendanceStatus(SENIN, '07:25').label, 'Terlambat 15 menit')
cek('Selasa masuk 07:25 -> lateMinutes', calculateAttendanceStatus(SELASA, '07:25').lateMinutes, 15)
cek('Rabu masuk 07:25 -> lateMinutes', calculateAttendanceStatus(RABU, '07:25').lateMinutes, 15)
cek('Kamis masuk 07:25 -> lateMinutes', calculateAttendanceStatus(KAMIS, '07:25').lateMinutes, 15)
cek('Jumat masuk 07:25 -> lateMinutes', calculateAttendanceStatus(JUMAT, '07:25').lateMinutes, 15)
cek('Sabtu masuk 07:25 -> lateMinutes', calculateAttendanceStatus(SABTU, '07:25').lateMinutes, 0)

// --- Batas jam masuk & pulang per hari -------------------------------------
cek('Senin jam masuk', jamKerjaRules(SENIN).jamMasuk, '07:10')
cek('Senin jam pulang', jamKerjaRules(SENIN).jamPulang, '16:00')
cek('Selasa jam masuk', jamKerjaRules(SELASA).jamMasuk, '07:10')
cek('Rabu jam masuk', jamKerjaRules(RABU).jamMasuk, '07:10')
cek('Kamis jam masuk', jamKerjaRules(KAMIS).jamMasuk, '07:10')
cek('Jumat jam masuk', jamKerjaRules(JUMAT).jamMasuk, '07:10')
cek('Jumat jam pulang (bebas)', jamKerjaRules(JUMAT).jamPulang, null)
cek('Jumat pulang bebas', jamKerjaRules(JUMAT).pulangBebas, true)
cek('Sabtu jam masuk', jamKerjaRules(SABTU).jamMasuk, '07:30')
cek('Sabtu jam pulang', jamKerjaRules(SABTU).jamPulang, '13:00')
cek('Minggu bukan hari kerja', jamKerjaRules(MINGGU).hariKerja, false)
cek('Minggu status', calculateAttendanceStatus(MINGGU, '07:00').status, 'Hari Libur')

// --- Tepat pada batas dan belum presensi -----------------------------------
cek('Senin masuk tepat 07:10 -> Tepat Waktu', calculateAttendanceStatus(SENIN, '07:10').status, 'Tepat Waktu')
cek('Sabtu masuk tepat 07:30 -> Tepat Waktu', calculateAttendanceStatus(SABTU, '07:30').status, 'Tepat Waktu')
cek('Senin belum presensi', calculateAttendanceStatus(SENIN, null).status, 'Belum Presensi')
cek('Senin belum presensi -> lateMinutes', calculateAttendanceStatus(SENIN, null).lateMinutes, 0)
cek('Senin 06:59 (lebih awal) -> Tepat Waktu', calculateAttendanceStatus(SENIN, '06:59').status, 'Tepat Waktu')

// --- Format dengan detik (format yang dipakai presensi mobile) ---------------
cek('Senin 07:11:45 -> lateMinutes', calculateAttendanceStatus(SENIN, '07:11:45').lateMinutes, 1)

// --- Jam pulang hari lain --------------------------------------------------
cek('Senin pulang 16:00 -> tepat waktu', calculateCheckoutStatus(SENIN, '16:00').label, 'Tepat Waktu')
cek('Senin pulang 15:30 -> lebih awal 30 menit', calculateCheckoutStatus(SENIN, '15:30').lebihAwal, 30)
cek('Senin pulang 16:30 -> lewat 30 menit', calculateCheckoutStatus(SENIN, '16:30').terlambatPulang, 30)
cek('Sabtu pulang 13:00 -> tepat waktu', calculateCheckoutStatus(SABTU, '13:00').label, 'Tepat Waktu')
cek('Jumat pulang 09:00 -> tetap valid', calculateCheckoutStatus(JUMAT, '09:00').valid, true)

// --- Ringkasan aturan global ----------------------------------------------
const daftar = daftarJamKerja()
cek('Jumlah hari kerja global', daftar.length, 6)
cek('Daftar hari kerja', daftar.map((h) => h.hari).join(','), 'Senin,Selasa,Rabu,Kamis,Jumat,Sabtu')
cek('Daftar jam kerja', daftar.map((h) => h.jamKerja).join(' | '), '07:10 - 16:00 | 07:10 - 16:00 | 07:10 - 16:00 | 07:10 - 16:00 | 07:10 - bebas | 07:30 - 13:00')

// --- Fungsi pembantu -------------------------------------------------------
cekAngka('hitungLateMinutes(07:25, 07:10)', hitungLateMinutes('07:25', '07:10'), 15)
cekAngka('hitungLateMinutes(07:05, 07:10)', hitungLateMinutes('07:05', '07:10'), 0)
cekAngka('hitungLateMinutes(07:05, 07:30)', hitungLateMinutes('07:05', '07:30'), 0)

console.log('UJI ATURAN JAM KERJA SIMPRES')
console.log('='.repeat(96))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(96))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
console.log('')
console.log('Ringkasan aturan jam kerja global (WIB):')
for (const h of daftar) {
  console.log(`  ${h.hari.padEnd(8)} masuk ${h.jamMasuk}  pulang ${h.jamPulang ?? 'bebas (tanpa batas minimal)'}`)
}
console.log('  Minggu   bukan hari kerja')

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')
