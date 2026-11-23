import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import {
  generateNiy,
  parseNiy,
  validateNiy,
  getNextUnitSequence,
  getUnitCode,
  getUnitIdFromCode,
  KODE_UNIT_DEFAULT,
  TAHUN_YAYASAN_DEFAULT,
} from '../src/data/niyHelper.js'
import { validateEmployee } from '../src/data/employeeSchema.js'
import { buildTemplateSheet, buildTemplateWorkbook } from '../src/data/employeeTemplate.js'
import { validateImport, draftToStaff } from '../src/data/employeeImport.js'
import { UNITS, STAFF, INITIAL_SETTINGS } from '../src/data/seed.js'

console.log('=================================================================')
console.log('🧪 PENGUJIAN SISTEM FORMAT NIY YAYASAN & FITUR UPLOAD PEGAWAI')
console.log('=================================================================')

// 1. UJI KODE UNIT & TAHUN YAYASAN
console.log('\n[1] Memverifikasi Kode Unit & Ketentuan Tahun Yayasan 17...')
assert.equal(getUnitCode('tk'), '01', 'Kode TK harus 01')
assert.equal(getUnitCode('sd'), '02', 'Kode SD harus 02')
assert.equal(getUnitCode('smp'), '03', 'Kode SMP harus 03')
assert.equal(getUnitCode('sma'), '04', 'Kode SMA harus 04')
assert.equal(getUnitIdFromCode('01'), 'tk')
assert.equal(getUnitIdFromCode('02'), 'sd')
assert.equal(getUnitIdFromCode('03'), 'smp')
assert.equal(getUnitIdFromCode('04'), 'sma')
assert.equal(TAHUN_YAYASAN_DEFAULT, '17', 'Tahun berdiri yayasan harus 17')
console.log('  ✅ Kode Unit: TK(01), SD(02), SMP(03), SMA(04) dan Tahun Yayasan (17) terverifikasi!')

// 2. UJI GENERATOR NIY RESMI (CONTOH 011722012)
console.log('\n[2] Memverifikasi Generator NIY Resmi...')
const niyContoh = generateNiy({
  unitId: 'tk',
  tahunMasuk: '2022',
  nomorUrut: 12,
})
console.log('  Hasil generateNiy(tk, 2022, 12):', niyContoh)
assert.equal(niyContoh, '011722012', 'NIY harus persis 011722012 sesuai spesifikasi user')

// Cek unit lain
const niySD = generateNiy({ unitId: 'sd', tahunMasuk: '2020', nomorUrut: 5 })
assert.equal(niySD, '021720005', 'NIY SD urut 5 harus 021720005')

const niySMP = generateNiy({ unitId: 'smp', tanggalMasuk: '2024-08-15', nomorUrut: 1 })
assert.equal(niySMP, '031724001', 'NIY SMP urut 1 harus 031724001')

const niySMA = generateNiy({ unitId: 'sma', tahunMasuk: '2025', nomorUrut: 8 })
assert.equal(niySMA, '041725008', 'NIY SMA urut 8 harus 041725008')
console.log('  ✅ Seluruh kombinasi unit (TK/SD/SMP/SMA) menghasilkan NIY 9 digit yang tepat!')

// 3. UJI PARSING NIY
console.log('\n[3] Memverifikasi Parser NIY...')
const parsed = parseNiy('011722012')
assert.equal(parsed.isValid, true)
assert.equal(parsed.kodeUnit, '01')
assert.equal(parsed.unitId, 'tk')
assert.equal(parsed.tahunYayasan, '17')
assert.equal(parsed.tahunMasuk, '22')
assert.equal(parsed.nomorUrut, '012')
assert.equal(parsed.rawSequence, 12)
console.log('  ✅ Parser berhasil membedah kode unit, tahun yayasan, tahun masuk, dan no urut!')

// 4. UJI VALIDASI FORMAT KETAT
console.log('\n[4] Memverifikasi Aturan Validasi Ketat NIY...')

// Valid
const resValid = validateNiy({
  niy: '011722012',
  unitId: 'tk',
  tanggalMasuk: '2022-07-01',
})
assert.equal(resValid.valid, true)
assert.equal(resValid.error, null)

// Error: Tahun yayasan bukan 17
const resTahunYayasanSalah = validateNiy({
  niy: '011822012', // '18' bukan '17'
  unitId: 'tk',
})
assert.equal(resTahunYayasanSalah.valid, false)
assert.ok(resTahunYayasanSalah.error.includes("Tahun berdiri yayasan pada NIY harus '17'"))

// Error: Kode unit salah (02 di unit TK)
const resUnitSalah = validateNiy({
  niy: '021722012', // 02 adalah SD, tapi didaftarkan di TK
  unitId: 'tk',
})
assert.equal(resUnitSalah.valid, false)
assert.ok(resUnitSalah.error.includes('tidak cocok dengan Unit Sekolah terpilih'))

// Error: Tahun masuk tidak sinkron dengan tanggalMasuk
const resTahunMasukBeda = validateNiy({
  niy: '011722012', // tahun 22
  unitId: 'tk',
  tanggalMasuk: '2025-01-01', // tahun 25
})
assert.equal(resTahunMasukBeda.valid, false)
assert.ok(resTahunMasukBeda.error.includes('tidak cocok dengan tahun Tanggal Masuk'))

// Error: Panjang salah (8 digit)
const res8Digit = validateNiy({ niy: '01172212' })
assert.equal(res8Digit.valid, false)
assert.ok(res8Digit.error.includes('Format NIY harus 9 digit numerik'))

// Error: Nomor urut 000
const resUrutNol = validateNiy({ niy: '011722000' })
assert.equal(resUrutNol.valid, false)
assert.ok(resUrutNol.error.includes('lebih besar dari 000'))

console.log('  ✅ Seluruh aturan validasi (9 digit, wajib 17, kode unit, tahun masuk, urutan) berfungsi presisi!')

// 5. UJI INTEGRASI VALIDASI PEGAWAI (validateEmployee)
console.log('\n[5] Memverifikasi validateEmployee...')
const employeeDraft = {
  niy: '011722012',
  name: 'Siti Aminah, S.Pd',
  unitId: 'tk',
  role: 'Guru Sentra Balok',
  status: 'Aktif',
  statusPegawai: 'Guru Tetap Yayasan',
  tanggalMasuk: '2022-07-01',
  email: 'siti.aminah@simpres.sch.id',
}
const errorsEmp = validateEmployee(employeeDraft, { staff: STAFF, units: UNITS, settings: INITIAL_SETTINGS })
assert.deepEqual(errorsEmp, {}, 'Pegawai dengan NIY valid tidak boleh menghasilkan error')

// Draft dengan NIY tidak sesuai aturan yayasan
const badEmp = { ...employeeDraft, niy: '019922012' } // yayasan 99
const badErrors = validateEmployee(badEmp, { staff: STAFF, units: UNITS, settings: INITIAL_SETTINGS })
assert.ok(badErrors.niy, 'NIY salah harus menghasilkan error pada field niy')
console.log('  ✅ Integrasi validateEmployee sukses.')

// 6. UJI TEMPLATE EXCEL RESMI & SAMPLE ROW (011722012)
console.log('\n[6] Memverifikasi Template Excel Resmi...')
const mockState = { units: UNITS, staff: STAFF, settings: INITIAL_SETTINGS }
const sheetData = buildTemplateSheet(mockState)
const headers = sheetData[2]
const sampleRow = sheetData[3]

const niyIdx = headers.findIndex((h) => h.includes('NIY'))
const sampleNiy = sampleRow[niyIdx]
console.log('  Sample NIY di Template Excel:', sampleNiy)
assert.equal(sampleNiy, '011722012', 'Template resmi harus menggunakan contoh 011722012')

// 7. UJI PROSES UPLOAD / IMPORT SPREADSHEET
console.log('\n[7] Memverifikasi Upload & Import Spreadsheet...')

// Skenario A: Import file dengan NIY valid
const mockValidFile = {
  headerRow: headers,
  dataRows: [
    {
      rowNum: 4,
      cells: sampleRow,
    },
  ],
  detectedHeaderRow: 3,
}
const resultA = validateImport(mockValidFile, mockState)
console.log('  Errors import sample row:', resultA.errors)
assert.equal(resultA.errors.length, 0, 'Sample row dengan NIY 011722012 harus lolos validasi import 100%')
assert.equal(resultA.valid.length, 1)
assert.equal(resultA.valid[0].draft.niy, '011722012')
console.log('  ✅ Import data dengan NIY resmi 011722012 berhasil diproses!')

// Skenario B: Import file dengan NIY KOSONG (Fitur Auto-Generate)
console.log('\n[8] Memverifikasi Fitur Auto-Generate NIY saat Upload (NIY Kosong)...')
const rowNoNiy = [...sampleRow]
rowNoNiy[niyIdx] = '' // kosongkan NIY

const mockNoNiyFile = {
  headerRow: headers,
  dataRows: [
    { rowNum: 4, cells: rowNoNiy },
  ],
  detectedHeaderRow: 3,
}
const resultB = validateImport(mockNoNiyFile, mockState)
assert.equal(resultB.errors.length, 0, 'Baris tanpa NIY tidak boleh error karena sistem otomatis mengisinya')
assert.equal(resultB.valid.length, 1)
const autoNiy = resultB.valid[0].draft.niy
console.log('  NIY yang otomatis dibuatkan sistem untuk unit TK:', autoNiy)
assert.ok(/^\d{9}$/.test(autoNiy), 'Auto NIY harus 9 digit numerik')
assert.equal(autoNiy.slice(0, 2), '01', 'Harus diawali kode unit TK 01')
assert.equal(autoNiy.slice(2, 4), '17', 'Harus mengandung tahun yayasan 17')
assert.equal(autoNiy.slice(4, 6), '22', 'Harus memakai tahun masuk 22')
console.log('  ✅ Fitur auto-generate NIY saat upload spreadsheet berfungsi sempurna!')

// Skenario C: Import file dengan NIY SALAH
console.log('\n[9] Memverifikasi Penolakan Berkas dengan NIY yang Menyalahi Ketentuan...')
const rowBadNiy = [...sampleRow]
rowBadNiy[niyIdx] = '031722012' // 03 adalah SMP, tapi unit baris adalah TKIT

const mockBadFile = {
  headerRow: headers,
  dataRows: [
    { rowNum: 4, cells: rowBadNiy },
  ],
  detectedHeaderRow: 3,
}
const resultC = validateImport(mockBadFile, mockState)
assert.equal(resultC.valid.length, 0, 'Baris dengan NIY salah harus ditolak')
assert.ok(resultC.errors.length > 0, 'Harus ada pesan kesalahan')
console.log('  Pesan kesalahan yang dihasilkan:', resultC.errors[0])
assert.ok(resultC.errors[0].includes('tidak cocok dengan Unit Sekolah'))
console.log('  ✅ Sistem menolak berkas dengan NIY tidak valid dan memberikan pesan edukatif!')

console.log('\n=================================================================')
console.log('🎉 SELURUH SKENARIO PENGUJIAN NIY YAYASAN BERHASIL 100%!')
console.log('=================================================================')
