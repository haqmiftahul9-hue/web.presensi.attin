import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import {
  EMPLOYEE_COLUMNS,
  EMPLOYEE_GROUPS,
  EMPTY_EMPLOYEE,
  normalizeHeader,
  validateEmployee,
} from '../src/data/employeeSchema.js'
import {
  buildTemplateSheet,
  buildTemplateWorkbook,
} from '../src/data/employeeTemplate.js'
import { validateImport } from '../src/data/employeeImport.js'
import { UNITS, STAFF } from '../src/data/seed.js'

console.log('--- TEST EMPLOYEE SCHEMA, FORM FIELDS, & IMPORT TEMPLATE ---')

// 1. Verifikasi EMPLOYEE_GROUPS
console.log('1. EMPLOYEE_GROUPS verification...')
assert.deepEqual(EMPLOYEE_GROUPS, ['Identitas', 'Kepegawaian', 'Pendidikan', 'Kontak'])
assert.ok(!EMPLOYEE_GROUPS.includes('Keuangan'), 'Keuangan harus dihapus dari EMPLOYEE_GROUPS')
console.log('   OK: EMPLOYEE_GROUPS bersih tanpa Keuangan.')

// 2. Verifikasi EMPLOYEE_COLUMNS
console.log('2. EMPLOYEE_COLUMNS verification...')
const columnKeys = EMPLOYEE_COLUMNS.map((c) => c.key)

// Pastikan field keuangan dihapus
for (const badKey of ['npwp', 'bpjsKesehatan', 'bpjsKetenagakerjaan', 'rekeningBank', 'namaRekening']) {
  assert.ok(!columnKeys.includes(badKey), `Kolom ${badKey} tidak boleh ada di EMPLOYEE_COLUMNS`)
}

// Pastikan agama dihapus
assert.ok(!columnKeys.includes('agama'), 'Kolom agama tidak boleh ada di EMPLOYEE_COLUMNS')

// Pastikan nomorIdentitas diganti dengan pendidikanAsal
assert.ok(!columnKeys.includes('nomorIdentitas'), 'nomorIdentitas harus diganti')
assert.ok(columnKeys.includes('pendidikanAsal'), 'pendidikanAsal harus ada di EMPLOYEE_COLUMNS')

const pendAsalCol = EMPLOYEE_COLUMNS.find((c) => c.key === 'pendidikanAsal')
assert.equal(pendAsalCol.label, 'Pendidikan Asal')
assert.equal(pendAsalCol.group, 'Identitas')
assert.equal(pendAsalCol.type, 'text')
assert.equal(pendAsalCol.required, false)

// Pastikan role bertipe text (manual input tanpa dropdown)
const roleCol = EMPLOYEE_COLUMNS.find((c) => c.key === 'role')
assert.equal(roleCol.type, 'text', 'Role/Jabatan harus bertipe text agar diisi manual tanpa dropdown')

// Pastikan status kepegawaian memiliki pilihan yang tepat tanpa PNS
const statusPegawaiCol = EMPLOYEE_COLUMNS.find((c) => c.key === 'statusPegawai')
assert.ok(statusPegawaiCol, 'statusPegawai column must exist')
assert.equal(statusPegawaiCol.type, 'select')
assert.ok(!statusPegawaiCol.options.includes('PNS'), 'PNS tidak boleh ada di pilihan statusPegawai')

const expectedOptions = [
  'Guru Magang',
  'Guru Kontrak',
  'Guru Tetap Yayasan',
  'Pegawai Magang',
  'Pegawai Kontrak',
  'Pegawai Tetap Yayasan',
]
assert.deepEqual(statusPegawaiCol.options, expectedOptions, 'Pilihan statusPegawai harus persis sesuai permintaan')
console.log('   OK: Kolom EMPLOYEE_COLUMNS 100% sesuai.')

// 3. Verifikasi EMPTY_EMPLOYEE
console.log('3. EMPTY_EMPLOYEE verification...')
assert.equal(EMPTY_EMPLOYEE.pendidikanAsal, '')
assert.equal(EMPTY_EMPLOYEE.agama, undefined)
assert.equal(EMPTY_EMPLOYEE.nomorIdentitas, undefined)
assert.equal(EMPTY_EMPLOYEE.npwp, undefined)
assert.equal(EMPTY_EMPLOYEE.statusPegawai, 'Guru Tetap Yayasan')
console.log('   OK: EMPTY_EMPLOYEE bersih.')

// 4. Verifikasi validateEmployee
console.log('4. validateEmployee verification...')
const mockDraft = {
  niy: '999000111',
  name: 'Ahmad Dahlan',
  unitId: UNITS[0].id,
  role: 'Guru Fisika Eksperimental', // manual input jabatan
  status: 'Aktif',
  statusPegawai: 'Guru Kontrak',
  pendidikanAsal: 'Universitas Negeri Padang', // bebas teks, tanpa validasi NIK 16 digit
  email: 'ahmad@simpres.sch.id',
}
const valErrors = validateEmployee(mockDraft, { staff: STAFF, units: UNITS })
assert.deepEqual(valErrors, {}, 'Valid employee draft should have 0 errors')

// Test invalid email
const badEmailDraft = { ...mockDraft, email: 'not-an-email' }
const badEmailErrors = validateEmployee(badEmailDraft, { staff: STAFF, units: UNITS })
assert.ok(badEmailErrors.email, 'Invalid email should produce error')

// Test valid non-16-digit pendidikanAsal
const textPendDraft = { ...mockDraft, pendidikanAsal: 'SMA Negeri 1 Bukittinggi' }
const textPendErrors = validateEmployee(textPendDraft, { staff: STAFF, units: UNITS })
assert.deepEqual(textPendErrors, {}, 'Pendidikan asal string bebas should not fail')
console.log('   OK: validateEmployee berfungsi dengan benar.')

// 5. Verifikasi Template Excel & Integrasi Import
console.log('5. Excel Template & Import validation...')
const state = { units: UNITS, staff: STAFF }
const sheetData = buildTemplateSheet(state)

// SheetData baris 0 adalah PANDUAN, baris 1 kosong, baris 2 adalah headers, baris 3 adalah sample
const headers = sheetData[2]
console.log('   Headers di template Excel:', headers.join(', '))

assert.ok(headers.some((h) => h.includes('NIY *')), 'Template harus ada NIY *')
assert.ok(headers.some((h) => h.includes('Nama Lengkap *')), 'Template harus ada Nama Lengkap *')
assert.ok(headers.some((h) => h.includes('Pendidikan Asal')), 'Template harus ada Pendidikan Asal')
assert.ok(!headers.some((h) => h.toLowerCase().includes('agama')), 'Template TIDAK boleh ada Agama')
assert.ok(!headers.some((h) => h.toLowerCase().includes('ktp') || h.toLowerCase().includes('nomor identitas')), 'Template TIDAK boleh ada KTP/Nomor Identitas')
assert.ok(!headers.some((h) => h.toLowerCase().includes('npwp')), 'Template TIDAK boleh ada NPWP')
assert.ok(!headers.some((h) => h.toLowerCase().includes('bpjs')), 'Template TIDAK boleh ada BPJS')
assert.ok(!headers.some((h) => h.toLowerCase().includes('rekening')), 'Template TIDAK boleh ada Rekening')

// Verifikasi sample row di template
const sampleRow = sheetData[3]
const pendAsalIdx = headers.findIndex((h) => h.includes('Pendidikan Asal'))
assert.equal(sampleRow[pendAsalIdx], 'Universitas Negeri Padang')

const statusPegawaiIdx = headers.findIndex((h) => h.includes('Status Kepegawaian'))
assert.equal(sampleRow[statusPegawaiIdx], 'Guru Tetap Yayasan')

// Test workbook build & read back to simulate export -> import
const book = buildTemplateWorkbook(state)
const rawBuffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
const parsedBook = XLSX.read(rawBuffer, { type: 'array' })
const firstSheet = parsedBook.Sheets[parsedBook.SheetNames[0]]
const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: true, defval: '', raw: false })

// Import validation on generated template
const headerIndex = aoa.findIndex((r) => r.some((c) => normalizeHeader(c) === 'niy'))
assert.ok(headerIndex >= 0, 'Header row found in template')

const fileObj = {
  headerRow: aoa[headerIndex],
  dataRows: [{ cells: aoa[headerIndex + 1], rowNum: headerIndex + 2 }],
  detectedHeaderRow: headerIndex + 1,
}

const importResult = validateImport(fileObj, state)
console.log('   Import validation errors:', importResult.errors)
assert.equal(importResult.errors.length, 0, 'Generated template sample row must pass validateImport cleanly')
assert.equal(importResult.valid.length, 1, 'Sample row is valid')
assert.equal(importResult.valid[0].draft.pendidikanAsal, 'Universitas Negeri Padang')
assert.equal(importResult.valid[0].draft.statusPegawai, 'Guru Tetap Yayasan')
assert.equal(importResult.valid[0].draft.role, 'Guru Kelas')
console.log('   OK: Download template & import massal 100% konsisten.')

console.log('--- ALL CHECKS PASSED SUCCESSFULLY ---')

