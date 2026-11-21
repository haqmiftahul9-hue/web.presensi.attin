import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPeriodeInfo, BULAN_PENUH, BULAN_SINGKAT, HARI_PENUH, JENIS_PERIODE } from '../src/utils/periodFormatter.js'
import { getBarisTandaTangan, getIdentitasTandaTangan, GARIS_ISIAN, DEFAULT_IDENTITAS_PRESENSI, DEFAULT_IDENTITAS_PETUGAS } from '../src/utils/laporanSignature.js'

console.log('--- TEST 1: Period Formatter Spesifikasi & Dinamis ---')

const now = new Date(2026, 10, 21) // Sabtu, 21 November 2026

// Requirement 1 Cases
const cases = [
  // Harian
  {
    name: 'Harian preset Hari Ini',
    input: { jenis: 'Harian', now },
    expectedHeader: 'Harian - Sabtu, 21 November 2026',
    expectedRingkas: 'Sabtu, 21 Nov 2026',
    expectedSlug: 'Harian_21_November_2026',
  },
  {
    name: 'Harian tanggal spesifik',
    input: { jenis: 'Harian', tanggal: '2026-12-25', now },
    expectedHeader: 'Harian - Jumat, 25 Desember 2026',
    expectedRingkas: 'Jumat, 25 Des 2026',
    expectedSlug: 'Harian_25_Desember_2026',
  },
  // Bulanan
  {
    name: 'Bulanan preset Bulan Ini',
    input: { jenis: 'Bulanan', now },
    expectedHeader: 'Bulanan - November 2026',
    expectedRingkas: 'November 2026',
    expectedSlug: 'Bulanan_November_2026',
  },
  {
    name: 'Bulanan Januari 2027',
    input: { jenis: 'Bulanan', bulan: '2027-01', now },
    expectedHeader: 'Bulanan - Januari 2027',
    expectedRingkas: 'Januari 2027',
    expectedSlug: 'Bulanan_Januari_2027',
  },
  {
    name: 'Bulanan Desember 2025',
    input: { jenis: 'Bulanan', bulan: 11, tahun: 2025, now },
    expectedHeader: 'Bulanan - Desember 2025',
    expectedRingkas: 'Desember 2025',
    expectedSlug: 'Bulanan_Desember_2025',
  },
  // Tahunan
  {
    name: 'Tahunan preset Tahun Ini',
    input: { jenis: 'Tahunan', now },
    expectedHeader: 'Tahunan - Tahun 2026',
    expectedRingkas: 'Tahun 2026',
    expectedSlug: 'Tahunan_2026',
  },
  {
    name: 'Tahunan 2028',
    input: { jenis: 'Tahunan', tahun: 2028, now },
    expectedHeader: 'Tahunan - Tahun 2028',
    expectedRingkas: 'Tahun 2028',
    expectedSlug: 'Tahunan_2028',
  },
  // Custom Tanggal
  {
    name: 'Custom Tanggal 01 Nov - 21 Nov 2026',
    input: { jenis: 'custom', customStart: '2026-11-01', customEnd: '2026-11-21', now },
    expectedHeader: '01 November 2026 s.d. 21 November 2026',
    expectedRingkas: '01 Nov - 21 Nov 2026',
    expectedSlug: 'Custom_01_November_2026_sd_21_November_2026',
  },
  // Mingguan
  {
    name: 'Mingguan 16 Nov - 22 Nov 2026',
    input: { jenis: 'Mingguan', now },
    expectedHeader: 'Mingguan - 16 November 2026 s.d. 22 November 2026',
    expectedRingkas: '16 Nov - 22 Nov 2026',
    expectedSlug: 'Mingguan_16_November_2026_sd_22_November_2026',
  },
]

for (const c of cases) {
  const res = getPeriodeInfo(c.input)
  assert.equal(res.header, c.expectedHeader, `Failed ${c.name} header`)
  assert.equal(res.ringkas, c.expectedRingkas, `Failed ${c.name} ringkas`)
  assert.equal(res.slug, c.expectedSlug, `Failed ${c.name} slug`)
  console.log(`✓ ${c.name} -> Header: "${res.header}", Ringkas: "${res.ringkas}"`)
}

console.log('\n--- TEST 2: Laporan Signature Helper ---')

// Presensi Default
const sigPresensiDefault = getBarisTandaTangan('presensi', null)
assert.equal(sigPresensiDefault.baris2.kiri, 'Mengetahui,')
assert.equal(sigPresensiDefault.baris2.kanan, 'Dikerjakan oleh,')
assert.equal(sigPresensiDefault.jabatan.kiri, DEFAULT_IDENTITAS_PRESENSI.jabatan)
assert.equal(sigPresensiDefault.nama.kiri, `(${DEFAULT_IDENTITAS_PRESENSI.nama})`)
assert.equal(sigPresensiDefault.jabatan.kanan, DEFAULT_IDENTITAS_PETUGAS.jabatan)
assert.equal(sigPresensiDefault.nama.kanan, GARIS_ISIAN)
console.log('✓ Signature Presensi (Default/Fallback) OK')

// Cuti Default
const sigCutiDefault = getBarisTandaTangan('cuti', null)
assert.equal(sigCutiDefault.baris2.kiri, 'Mengetahui,')
assert.equal(sigCutiDefault.baris2.kanan, 'Dikerjakan oleh,')
assert.equal(sigCutiDefault.jabatan.kiri, 'Ketua Yayasan')
assert.equal(sigCutiDefault.nama.kiri, GARIS_ISIAN)
assert.equal(sigCutiDefault.jabatan.kanan, 'Admin Tata Usaha')
assert.equal(sigCutiDefault.nama.kanan, GARIS_ISIAN)
console.log('✓ Signature Cuti (Default/Fallback) OK')

// Presensi with Custom Signatory
const mockSignatory = {
  kepalaSekolah: { nama: 'H. Sudirman, S.Pd', jabatan: 'Kepala SMPIT Attin' },
  petugasPresensi: { nama: 'Fajar Nugraha', jabatan: 'Petugas Presensi SMPIT' },
}
const sigPresensiCustom = getBarisTandaTangan('presensi', mockSignatory)
assert.equal(sigPresensiCustom.jabatan.kiri, 'Kepala SMPIT Attin')
assert.equal(sigPresensiCustom.nama.kiri, '(H. Sudirman, S.Pd)')
assert.equal(sigPresensiCustom.jabatan.kanan, 'Petugas Presensi SMPIT')
assert.equal(sigPresensiCustom.nama.kanan, '(Fajar Nugraha)')
console.log('✓ Signature Presensi (Custom Signatory) OK')

console.log('\n--- TEST 3: Static Checks RekapLaporanPage.jsx ---')

const code = fs.readFileSync('src/pages/RekapLaporanPage.jsx', 'utf8')

// Check JUDUL_LAPORAN
assert.ok(code.includes("presensi: 'REKAP PRESENSI GURU DAN PEGAWAI'"), 'Must have REKAP PRESENSI GURU DAN PEGAWAI')
assert.ok(code.includes("cuti: 'REKAP IZIN / CUTI GURU DAN PEGAWAI'"), 'Must have REKAP IZIN / CUTI GURU DAN PEGAWAI')
console.log('✓ Judul laporan resmi presensi & cuti OK')

// Check Kop border-bottom: 3px double #000
assert.ok(code.includes('border-bottom: 3px double #000'), 'Must have double border for Kop Surat in Print CSS')
console.log('✓ Garis pembatas ganda kop surat print CSS OK')

// Check break-inside: avoid
assert.ok(code.includes('break-inside: avoid'), 'Must have break-inside: avoid for signature block')
console.log('✓ break-inside: avoid for signature block OK')

// Check height 65px for signature space
assert.ok(code.includes('.signature-space { height: 65px; }'), 'Must have 65px signature space')
console.log('✓ Signature space height 65px OK')

// Check Pariaman in signature
assert.ok(code.includes('Pariaman, ${tanggalCetak}') || code.includes('Pariaman, ${dateStr}'), 'Must have Pariaman, [Tanggal Cetak] in signature')
console.log('✓ Tempat & tanggal (Pariaman) OK')

// Check Mengetahui, and Dikerjakan oleh,
assert.ok(code.includes('Mengetahui,'), 'Must have Mengetahui,')
assert.ok(code.includes('Dikerjakan oleh,'), 'Must have Dikerjakan oleh,')
console.log('✓ Mengetahui, and Dikerjakan oleh, OK')

// Check Periode Rekap in UI table
assert.ok(code.includes('>Periode Rekap</th>'), 'Must have Periode Rekap column header in table')
console.log('✓ Periode Rekap column header OK')

// Check no undefined periodLabel in handleReportAction
const handleActionMatch = code.match(/const handleReportAction =[\s\S]*?setShowReportSettings\(false\)/)
assert.ok(handleActionMatch, 'Found handleReportAction block')
assert.ok(!handleActionMatch[0].includes('exportPresensiToPDF(data, unitLabel, periodLabel'), 'No periodLabel bug in exportPresensiToPDF')
assert.ok(!handleActionMatch[0].includes('exportCutiToPDF(data, unitLabel, periodLabel'), 'No periodLabel bug in exportCutiToPDF')
assert.ok(!handleActionMatch[0].includes('exportPresensiToExcel(data, unitLabel, periodLabel'), 'No periodLabel bug in exportPresensiToExcel')
assert.ok(!handleActionMatch[0].includes('exportCutiToExcel(data, unitLabel, periodLabel'), 'No periodLabel bug in exportCutiToExcel')
console.log('✓ No undefined periodLabel in handleReportAction OK')

console.log('\n=============================================')
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY! (100%)')
console.log('=============================================\n')
