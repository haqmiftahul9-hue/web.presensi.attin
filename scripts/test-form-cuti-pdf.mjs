import assert from 'node:assert/strict'
import {
  buildFormCutiDoc, formatTanggalIndo, getNamaKepalaSekolah, getNamaPetugasPresensi,
} from '../src/utils/generateFormCutiPDF.js'
import {
  hitungTanggalMasukKembali, isFormCutiEligible, isSakit, JENIS_CUTI_DISPENSASI,
} from '../src/data/jenisIzinCuti.js'

console.log('--- TEST 1: Helper data jenis izin & cuti ---')
assert.equal(isFormCutiEligible('Cuti Tahunan'), true)
assert.equal(isFormCutiEligible('Cuti Melahirkan'), true)
assert.equal(isFormCutiEligible('Cuti Dispensasi'), true)
assert.equal(isFormCutiEligible('Cuti Menikah'), true)
assert.equal(isFormCutiEligible('Cuti Sakit'), false)
assert.equal(isFormCutiEligible('Sakit'), false)
assert.equal(isFormCutiEligible('Izin Pribadi'), false)

assert.equal(isSakit('Cuti Sakit'), true)
assert.equal(isSakit('Sakit'), true)
assert.equal(isSakit('Cuti Tahunan'), false)

// Test hitungTanggalMasukKembali: jika hari Sabtu (misal 2026-11-28), hari berikutnya Minggu (29), masuk kerja Senin (30)
const masukKembali = hitungTanggalMasukKembali('2026-11-28')
assert.equal(masukKembali, '2026-11-30', `Harus melompati Minggu, dapat: ${masukKembali}`)
console.log('✔ Helper data jenis izin & cuti OK')

console.log('--- TEST 2: Signatories resolver ---')
const kepsekSD = getNamaKepalaSekolah('sd')
assert.equal(kepsekSD, 'Drs. H. Ahmad Fauzi, M.Pd')
const kepsekSMP = getNamaKepalaSekolah('smp')
assert.equal(kepsekSMP, 'Dra. Hj. Nurhasanah, M.Pd')
const kepsekSMA = getNamaKepalaSekolah('sma')
assert.equal(kepsekSMA, 'Dr. Hendri Saputra, M.Pd')
const kepsekTK = getNamaKepalaSekolah('tk')
assert.equal(kepsekTK, 'Hj. Irmawati Rahayu, S.Pd')
console.log('✔ Signatories resolver OK')

console.log('--- TEST 3: Generate PDF Cuti Tahunan ---')
const dummyStaff = {
  id: 2,
  name: 'Bustanul Abidin, S.Pd',
  role: 'Guru Kelas 6 & Kurikulum',
  unitId: 'sd',
  bagian: 'Kurikulum SDIT',
  tanggalMasuk: '2010-01-01',
  kontak: '081234567891',
  alamat: 'Jl. Cendekia No. 43, Cilandak',
}

const dummyUnit = {
  id: 'sd',
  nama: 'SDIT Attin Sumbar',
}

const dummyLeaveTahunan = {
  id: 101,
  staffId: 2,
  jenis: 'Cuti Tahunan',
  mulai: '2026-12-01',
  selesai: '2026-12-03',
  alasan: 'Keperluan keluarga di luar kota',
  tanggalMasukKembali: '2026-12-04',
  alamatCuti: 'Bukittinggi, Sumatera Barat',
  telpCuti: '081234567891',
  hakCuti: 7,
  sisaCuti: 4,
}

const docTahunan = await buildFormCutiDoc({
  leave: dummyLeaveTahunan,
  staff: dummyStaff,
  unit: dummyUnit,
  settings: {},
})

assert.ok(docTahunan, 'Doc jsPDF harus berhasil dibuat')
const bufTahunan = docTahunan.output('arraybuffer')
assert.ok(bufTahunan.byteLength > 1000, 'Ukuran PDF harus valid > 1000 byte')
console.log(`✔ PDF Cuti Tahunan terbuat: ${bufTahunan.byteLength} byte`)

console.log('--- TEST 4: Generate PDF Cuti Dispensasi ---')
const dummyLeaveDisp = {
  id: 102,
  staffId: 2,
  jenis: 'Cuti Dispensasi',
  subJenisDispensasi: 'Melahirkan',
  anakKe: '2',
  mulai: '2026-12-01',
  selesai: '2027-02-28',
  alasan: 'Cuti persalinan anak kedua',
  tanggalMasukKembali: '2027-03-01',
  alamatCuti: 'Jl. Cendekia No. 43, Cilandak',
  telpCuti: '081234567891',
}

const docDisp = await buildFormCutiDoc({
  leave: dummyLeaveDisp,
  staff: dummyStaff,
  unit: dummyUnit,
  settings: {},
})

const bufDisp = docDisp.output('arraybuffer')
assert.ok(bufDisp.byteLength > 1000, 'Ukuran PDF dispensasi harus valid > 1000 byte')
console.log(`✔ PDF Cuti Dispensasi terbuat: ${bufDisp.byteLength} byte`)

console.log('\nSEMUA PENGUJIAN GENERATOR FORM CUTI PDF BERHASIL!')
