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
import { readFileSync } from 'node:fs'
import {
  saveRegisteredFaceData,
  getRegisteredFaceData,
  deleteRegisteredFaceData,
  compareFaceDescriptors,
  averageFaceDescriptors,
  faceEuclideanDistance,
  FACE_MATCH_THRESHOLD,
} from '../src/services/faceRecognitionService.js'

// Mock environment browser
const storage = new Map()
globalThis.window = {
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
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

// Uji 6: Pencocokan descriptor sungguhan (tidak dimock).
// Vektor acuan + vektor "wajah sama" (selisih kecil) harus dianggap cocok;
// vektor "wajah orang lain" harus ditolak.
const acuan = new Array(128).fill(0).map((_, i) => Math.sin(i * 0.05))
const wajahSama = acuan.map((v) => v + 0.02)
const wajahLain = new Array(128).fill(0).map((_, i) => Math.cos(i * 0.31))

const cocok = await compareFaceDescriptors(wajahSama, acuan)
uji('Wajah yang sama terdeteksi cocok', cocok.match === true, `distance=${cocok.distance}`)
uji('Skor kecocokan wajah sama di atas 70%', cocok.confidence >= 70, `confidence=${cocok.confidence}`)

const tidakCocok = await compareFaceDescriptors(wajahLain, acuan)
uji('Wajah berbeda terdeteksi tidak cocok', tidakCocok.match === false, `distance=${tidakCocok.distance}`)
uji('Jarak wajah berbeda melewati ambang threshold', tidakCocok.distance > FACE_MATCH_THRESHOLD)

// Uji 7: Vektor tidak valid tidak boleh dianggap cocok
const salahUkuran = await compareFaceDescriptors(new Array(64).fill(0.1), acuan)
uji('Descriptor berukuran salah ditolak', salahUkuran.match === false)
uji('Descriptor null ditolak', (await compareFaceDescriptors(null, acuan)).match === false)

// Uji 8: Rata-rata descriptor menjadi vektor acuan yang stabil
const rata = averageFaceDescriptors([acuan, acuan.map((v) => v + 0.04)])
uji('Rata-rata descriptor menghasilkan 128 dimensi', rata && rata.length === 128)
const jarakRataKeAcuan = faceEuclideanDistance(new Float32Array(rata), new Float32Array(acuan))
const jarakAwalKeAcuan = faceEuclideanDistance(new Float32Array(acuan.map((v) => v + 0.04)), new Float32Array(acuan))
uji('Vektor rata-rata lebih dekat ke acuan daripada satu sampel', jarakRataKeAcuan < jarakAwalKeAcuan,
  `rata=${jarakRataKeAcuan.toFixed(4)} satu=${jarakAwalKeAcuan.toFixed(4)}`)
const cocokRata = await compareFaceDescriptors(wajahSama, rata)
uji('Vektor rata-rata tetap dipakai sebagai acuan pencocokan', cocokRata.match === true)

// Uji 9: Penjaga integritas alur scan di halaman presensi & kios admin.
// Wajah yang TIDAK cocok harus ditolak dengan pesan yang jelas, dan tidak boleh
// ada nilai kecocokan sintetis yang membuat presensi lolos tanpa verifikasi.
const sumberPresensi = readFileSync(new URL('../src/pages/mobile/MobilePresensiPage.jsx', import.meta.url), 'utf8')
const sumberKios = readFileSync(new URL('../src/pages/AdminPresensiScanPage.jsx', import.meta.url), 'utf8')
const sumberEnrollment = readFileSync(new URL('../src/components/mobile/FaceEnrollmentModal.jsx', import.meta.url), 'utf8')

uji('Halaman presensi menampilkan pesan "Akses Ditolak/Wajah Tidak Cocok"', sumberPresensi.includes('Akses Ditolak/Wajah Tidak Cocok'))
uji('Kios admin menampilkan pesan "Akses Ditolak/Wajah Tidak Cocok"', sumberKios.includes('Akses Ditolak/Wajah Tidak Cocok'))
uji('Tidak ada skor kecocokan sintetis di halaman presensi',
  !/\(96 \+ \(\(Number\(staff\.id\)/.test(sumberPresensi))
uji('Kios admin membandingkan descriptor wajah terdaftar',
  sumberKios.includes('compareFaceDescriptors'))
uji('Absen pulang juga memverifikasi wajah',
  sumberPresensi.includes('Verifikasi wajah (pulang) gagal'))
uji('Modal pendaftaran memakai 3 tahap liveness (depan, samping, berkedip)',
  sumberEnrollment.includes('AMBAH') === false
    && sumberEnrollment.includes('analyzeFacePose')
    && sumberEnrollment.includes('hitungEAR')
    && sumberEnrollment.includes('createBlinkTracker'))
uji('Modal pendaftaran tidak lagi memakai ambang mutlak pixel untuk pose',
  !sumberEnrollment.includes('eyeDist <= 10'))

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
if (gagal > 0) process.exit(1)
console.log('\nSELURUH SKENARIO FACE RECOGNITION LULUS\n')

