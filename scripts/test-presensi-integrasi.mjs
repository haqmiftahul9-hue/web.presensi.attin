// ============================================================================
// UJI INTEGRASI: seluruh sistem memakai calculateAttendanceStatus().
//
// Dua bagian:
//   1. Pindaian statis  -> tidak boleh ada sisa konsep shift, dan setiap
//                          halaman harus memanggil fungsi status yang sama.
//   2. Uji perilaku    -> store Dimuat lewat Vite (JSX) lalu dicek bahwa
//                          selectPresensiRules / selectTerlambat /
//                          selectRekapSummary memakai aturan jam kerja global.
//
// Jalankan: node scripts/test-presensi-integrasi.mjs
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { createServer } from 'vite'
import { calculateAttendanceStatus } from '../src/data/jamKerja.js'

let lulus = 0
let gagal = 0
const rincian = []

function cek(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(62)} ${String(aktual).padEnd(18)} (harapan: ${diharapkan})`)
}

function catat(nama, ok, detail = '') {
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

// ===== 1. PINDAIAN STATIS ===================================================

const POLA_SHIFT = [
  { pola: /\bnamaShift\b/, arti: 'fungsi namaShift' },
  { pola: /\bsebelumShift\b/, arti: 'flag sebelumShift' },
  { pola: /\bshift_?id\b/i, arti: 'shift_id' },
  { pola: /\bshift\b/i, arti: 'kata "shift"' },
  { pola: /\bhitungKeterlambatan\b/, arti: 'fungsi hitungKeterlambatan' },
  { pola: /toleransiKeterlambatan/, arti: 'toleransi keterlambatan per unit' },
  { pola: /toleransiTerlambat/, arti: 'toleransi terlambat' },
  { pola: /unit\?*\.(masuk|pulang)/, arti: 'jam masuk/pulang per unit' },
]

// Komentar sah yang menjelaskan penghapusan shift tidak boleh dianggap
// pelanggaran, jadi komentar dibuang sebelum pindaian.
function buangKomentar(isi) {
  return isi
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function kumpulkanFile(dir, acc = []) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) kumpulkanFile(p, acc)
    else if (/\.(js|jsx)$/.test(nama)) acc.push(p)
  }
  return acc
}

const fileSrc = kumpulkanFile('src')
const pelanggaran = []
for (const file of fileSrc) {
  // src/utils/qrcode.js memakai .shift() milik array — bukan shift kerja.
  if (file.endsWith(`${sep}utils${sep}qrcode.js`)) continue
  buangKomentar(readFileSync(file, 'utf8')).split('\n').forEach((baris, i) => {
    for (const { pola, arti } of POLA_SHIFT) {
      if (pola.test(baris)) pelanggaran.push(`${file}:${i + 1}  [${arti}] ${baris.trim()}`)
    }
  })
}
catat('Tidak ada sisa konsep shift di src/', pelanggaran.length === 0, pelanggaran.join(' | '))

// Setiap halaman laporan/presensi harus memanggil fungsi status yang sama.
const PEMAKAI_FUNGSI = [
  'src/data/presensiMobile.js',
  'src/data/seed.js',
  'src/store/simPresStore.jsx',
  'src/pages/RekapLaporanPage.jsx',
  'src/pages/MonitoringPresensiPage.jsx',
  'src/components/DetailEmployeeModal.jsx',
  'src/components-dashboard/RecentActivity.jsx',
  'src/components-dashboard/WeeklyTrend.jsx',
  'src/pages/mobile/MobilePresensiPage.jsx',
  'src/pages/mobile/MobileRiwayatPage.jsx',
]
for (const file of PEMAKAI_FUNGSI) {
  const isi = readFileSync(file, 'utf8')
  catat(
    `Memakai fungsi status bersama: ${file}`,
    /calculateAttendanceStatus|jamKerjaRules|selectTerlambat|selectRekapSummary|selectRekapTableData|selectRekapReportData/.test(isi),
  )
}

// Halaman wajib menampilkan Jam Kerja, bukan Shift.
const WAJIB_JAM_KERJA = [
  ['src/pages/mobile/MobileBerandaPage.jsx', 'Jam Kerja'],
  ['src/pages/mobile/MobilePresensiPage.jsx', 'Jam Kerja'],
  ['src/pages/mobile/MobileProfilPage.jsx', 'Jam Kerja Global'],
  ['src/pages/mobile/MobileSlipPage.jsx', 'Jam kerja global'],
  ['src/pages/RekapLaporanPage.jsx', 'Jam Kerja'],
  ['src/pages/MonitoringPresensiPage.jsx', 'Batas Jam Presensi (Jam Kerja Global)'],
]
for (const [file, teks] of WAJIB_JAM_KERJA) {
  catat(`Menampilkan "${teks}": ${file}`, readFileSync(file, 'utf8').includes(teks))
}

// ===== 2. UJI PERILAKU STORE (dimuat lewat Vite) =============================

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

const {
  simPresReducer,
  selectPresensiRules,
  selectTerlambat,
  selectRekapSummary,
  selectRekapTableData,
  selectMonitoringActivity,
} = store

const stateDasar = {
  staff: [],
  units: [{ id: 'sd', nama: 'SDIT Attin Sumbar', radius: 75 }],
  leaves: [],
  adminUsers: [],
  logs: [],
  userAccounts: [],
  settings: { zonaWaktu: 'WIB', presensi: { radiusGeofencePerUnit: { sd: 75 } } },
  attendanceHistory: [],
  permissionMatrix: {},
  currentUser: null,
  selectedUnitId: 'all',
}

// Aturan per hari, bukan per unit.
for (const [iso, hari, jamMasuk, jamPulang] of [
  ['2026-10-05', 'Senin', '07:10', '16:00'],
  ['2026-10-09', 'Jumat', '07:10', null],
  ['2026-10-10', 'Sabtu', '07:30', '13:00'],
  ['2026-10-11', 'Minggu', null, null],
]) {
  const rules = selectPresensiRules(stateDasar, 'sd', iso)
  cek(`selectPresensiRules ${hari} hari`, rules.hari, hari)
  cek(`selectPresensiRules ${hari} jam masuk`, rules.jamMasuk, jamMasuk)
  cek(`selectPresensiRules ${hari} jam pulang`, rules.jamPulang, jamPulang)
}

// Reducer CHECK_IN memakai fungsi global, bukan field manual.
const stateAwal = {
  ...stateDasar,
  staff: [{ id: 1, niy: '0001', name: 'Uji, S.Pd', role: 'Guru', unitId: 'sd', status: 'Aktif', masuk: null, method: null, lateMinutes: 0 }],
}
const stateCheckIn = simPresReducer(stateAwal, {
  type: 'CHECK_IN',
  payload: { id: 1, masuk: '07:25:04', method: 'Face Recognition' },
})
const hariIni = calculateAttendanceStatus(new Date(), stateCheckIn.staff[0].masuk)
cek('CHECK_IN lateMinutes = fungsi global', stateCheckIn.staff[0].lateMinutes, hariIni.lateMinutes)
cek('CHECK_IN riwayat lateMinutes', stateCheckIn.attendanceHistory[0].lateMinutes, hariIni.lateMinutes)
cek('CHECK_IN riwayat status', stateCheckIn.attendanceHistory[0].status, hariIni.status)
cek('CHECK_IN riwayat jamKerja', stateCheckIn.attendanceHistory[0].jamKerja, hariIni.jamKerja)
cek('CHECK_IN riwayat hari', stateCheckIn.attendanceHistory[0].hari, hariIni.hari)

cek(
  'CHECK_OUT tanpa presensi masuk ditolak reducer',
  simPresReducer(stateAwal, { type: 'CHECK_OUT', payload: { id: 1, pulang: '16:00' } }),
  stateAwal,
)

// Selector menghitung ulang dari jam masuk, tidak mempercayai field tersimpan.
const staffLambat = { ...stateAwal.staff[0], masuk: '07:11', lateMinutes: 999 }
const stateUji = { ...stateAwal, staff: [staffLambat] }
cek('selectTerlambat: Senin 07:11', selectTerlambat(stateUji, '2026-10-05').length, 1)
cek('selectTerlambat: Senin 07:09', selectTerlambat({ ...stateUji, staff: [{ ...staffLambat, masuk: '07:09' }] }, '2026-10-05').length, 0)
cek('selectTerlambat: Sabtu 07:30 tepat', selectTerlambat({ ...stateUji, staff: [{ ...staffLambat, masuk: '07:30' }] }, '2026-10-10').length, 0)
cek('selectTerlambat: Sabtu 07:31 terlambat', selectTerlambat({ ...stateUji, staff: [{ ...staffLambat, masuk: '07:31' }] }, '2026-10-10').length, 1)

const ringkas = selectRekapSummary(stateUji, null, 'Harian', '2026-10-05')
cek('selectRekapSummary tepatWaktu', ringkas.tepatWaktu, 0)
cek('selectRekapSummary terlambat', ringkas.terlambat, 1)
cek('selectRekapSummary totalLateMinutes', ringkas.totalLateMinutes, 1)
cek('selectRekapSummary hari', ringkas.hari, 'Senin')
cek('selectRekapSummary jamKerja', ringkas.jamKerja, '07:10 - 16:00')

const tabel = selectRekapTableData(stateUji, 'sd', 'Harian', '2026-10-05')
cek('selectRekapTableData kolom jamKerja', tabel[0].jamKerja, '07:10 - 16:00')
cek('selectRekapTableData kolom lateMinutes', tabel[0].lateMinutes, 1)
cek('selectRekapTableData stMasuk', tabel[0].stMasuk, 'Terlambat 1 menit')

const monitoring = selectMonitoringActivity(stateUji, '2026-10-05')
cek('selectMonitoringActivity lateMinutes', monitoring[0].lateMinutes, 1)
cek('selectMonitoringActivity jamKerja', monitoring[0].jamKerja, '07:10 - 16:00')

console.log('UJI INTEGRASI PRESENSI (shift -> jam kerja)')
console.log('='.repeat(110))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(110))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')
