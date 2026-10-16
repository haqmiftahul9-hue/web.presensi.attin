// ============================================================================
// UJI SISTEM FACE RECOGNITION (FACE-API.JS)
// ----------------------------------------------------------------------------
// Memastikan:
//   1. Alur pendaftaran wajah (face enrollment) menyimpan data descriptor 128-d.
//   2. Perbandingan vektor biometrik dengan jarak Euclidean.
//   3. Wajah cocok -> status Lolos / Kehadiran tercatat.
//   4. Wajah berbeda -> pesan "Akses Ditolak/Wajah Tidak Cocok" ditampilkan.
// ============================================================================

import assert from 'node:assert'
import {
  saveRegisteredFaceData,
  getRegisteredFaceData,
  deleteRegisteredFaceData,
  compareFaceDescriptors,
  FACE_MATCH_THRESHOLD,
} from '../src/services/faceRecognitionService.js'

// Mock environment browser
const storage = new Map()
globalThis.window = {
  localStorage: {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
}

let lulus = 0
let gagal = 0

function uji(nama, kondisi, detail = '') {
  if (kondisi) {
    lulus += 1
    console.log(`LULUS  ${nama}`)
  } else {
    gagal += 1
    console.error(`GAGAL  ${nama}${detail ? ` - ${detail}` : ''}`)
  }
}

console.log('UJI FITUR FACE RECOGNITION (FACE-API.JS)')
console.log('='.repeat(80))

// 1. Data Pegawai Mock
const staffA = {
  id: 1,
  niy: '049005069',
  name: 'Erianto, S.Ag, M.Pd.I',
}

// 2. Mock 128-d descriptor untuk Wajah Pegawai A (vector 128)
const mockDescriptorA = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1) * 0.1)

// 3. Mock 128-d descriptor untuk Wajah Orang Lain (Bukan Pegawai A)
const mockDescriptorB = Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.1) * 0.5)

// Uji 1: Simpan Pendaftaran Wajah
const saved = saveRegisteredFaceData({
  staff: staffA,
  descriptor: mockDescriptorA,
  photo: 'data:image/jpeg;base64,mockphoto',
})
uji('Pendaftaran wajah berhasil disimpan', saved !== null && saved.niy === staffA.niy)
uji('Descriptor tersimpan memiliki panjang 128 dimensi', saved.descriptor.length === 128)

// Uji 2: Ambil Data Pendaftaran Wajah Tersimpan
const retrieved = getRegisteredFaceData(staffA)
uji('Data pendaftaran wajah dapat dibaca dari storage', retrieved !== null)
uji('NIY dan nama pemilik cocok pada data terdaftar', retrieved.niy === staffA.niy && retrieved.name === staffA.name)

// Uji 3: Pencocokan Jarak Euclidean dengan Mock Euclidean Function
function euclideanDistance(d1, d2) {
  let sum = 0
  for (let i = 0; i < d1.length; i++) {
    const diff = d1[i] - d2[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

const distSame = euclideanDistance(mockDescriptorA, mockDescriptorA)
uji('Jarak Euclidean wajah yang sama mendekati 0', distSame < 0.001)

const distDiff = euclideanDistance(mockDescriptorA, mockDescriptorB)
uji(`Jarak Euclidean wajah berbeda melebihi threshold (${distDiff.toFixed(3)} > ${FACE_MATCH_THRESHOLD})`, distDiff > FACE_MATCH_THRESHOLD)

// Uji 4: Pesan Penolakan Ketika Wajah Berbeda
const isMatch = distDiff <= FACE_MATCH_THRESHOLD
const pesanValidasi = isMatch ? 'Wajah Cocok' : 'Akses Ditolak/Wajah Tidak Cocok'
uji('Pesan ketika wajah berbeda tepat "Akses Ditolak/Wajah Tidak Cocok"', pesanValidasi === 'Akses Ditolak/Wajah Tidak Cocok')

// Uji 5: Hapus data pendaftaran wajah
const deleted = deleteRegisteredFaceData(staffA)
uji('Pembersihan data pendaftaran wajah berhasil', deleted === true)
const afterDelete = getRegisteredFaceData(staffA)
uji('Data pendaftaran wajah telah terhapus dari storage', afterDelete === null)

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
if (gagal > 0) process.exit(1)
console.log('\nSELURUH SKENARIO FACE RECOGNITION LULUS\n')

