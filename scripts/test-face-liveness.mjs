// ============================================================================
// UJI LIVENESS PENDAFTARAN WAJAH (3 TAHAP)
// ----------------------------------------------------------------------------
// Memastikan:
//   1. Analisis pose (yaw) benar-benar membedakan "hadap depan" vs
//      "hadap samping" dan tidak pernah terjebak di zona abu-abu.
//   2. Ambang pose bebas dari skala gambar (kamera 320px maupun 1080px).
//   3. Tracker kedip mata memakai baseline dinamis (menyesuaikan mata &
//      pencahayaan tiap pengguna) dan tidak salah deteksi saat berkedip
//      pada langkah sebelumnya.
//   4. Rata-rata descriptor menghasilkan vektor acuan yang stabil.
// ============================================================================

import assert from 'node:assert'
import {
  analyzeFacePose,
  hitungEAR,
  createBlinkTracker,
  AMBANG_DEPAN,
  AMBANG_SAMPING,
  UKURAN_WAJAH_MIN,
} from '../src/services/faceLivenessService.js'
import { averageFaceDescriptors } from '../src/services/faceRecognitionService.js'

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

console.log('UJI LIVENESS PENDAFTARAN WAJAH')
console.log('='.repeat(80))

/**
 * Bangun landmark 68 titik untuk wajah tertentu.
 * Parameter dalam koordinat piksel video.
 */
function buatWajah({
  pusatMataKiri = 300,
  pusatMataKanan = 420,
  ujungHidung = 360,
  rahangKiri = 290,
  rahangKanan = 430,
  ear = 0.3,
} = {}) {
  const lm = new Array(68).fill(null).map(() => ({ x: 0, y: 0 }))

  // Kontur mata 6 titik -> EAR = (A+B)/(2C). Dengan A=B dan C=10,
  // EAR = A/10, jadi A = ear * 10.
  const half = (ear * 10) / 2
  const titikMata = (pusat) => {
    const x0 = pusat - 25 / 6 // agar rata-rata titik mata tepat di "pusat"
    return [
      { x: x0, y: 0 },
      { x: x0 + 2.5, y: -half },
      { x: x0 + 5, y: -half },
      { x: x0 + 10, y: 0 },
      { x: x0 + 5, y: half },
      { x: x0 + 2.5, y: half },
    ]
  }

  const mataKiri = titikMata(pusatMataKiri)
  const mataKanan = titikMata(pusatMataKanan)
  mataKiri.forEach((p, i) => { lm[36 + i] = p })
  mataKanan.forEach((p, i) => { lm[42 + i] = p })

  lm[0] = { x: rahangKiri, y: 500 }
  lm[16] = { x: rahangKanan, y: 500 }
  lm[30] = { x: ujungHidung, y: 380 }
  lm[27] = { x: ujungHidung, y: 300 }

  return lm
}

// --- 1. Wajah menghadap depan ------------------------------------------------
const depan = analyzeFacePose(buatWajah())
uji('Wajah tegak classified sebagai "depan"', depan.valid && depan.frontal && !depan.side)
uji('Wajah tegak tidak dianggap "samping"', depan.side === false)
uji('Arah.head menghadap depan terdeteksi', depan.arah === 'depan')

// --- 2. Wajah menoleh ke samping -------------------------------------------
// Hidung bergeser 15 px ke kanan dari titik tengah mata & rahang.
const samping = analyzeFacePose(buatWajah({
  pusatMataKiri: 315,
  pusatMataKanan: 435,
  ujungHidung: 390,
  rahangKiri: 305,
  rahangKanan: 445,
}))
uji('Wajah menoleh classified sebagai "samping"', samping.valid && samping.side && !samping.frontal)
uji('Arah.head menoleh terdeteksi', samping.arah === 'kanan' || samping.arah === 'kiri')

// Menoleh ke arah lain (berlawanan) juga harus terdeteksi sebagai samping.
const sampingKiri = analyzeFacePose(buatWajah({
  pusatMataKiri: 285,
  pusatMataKanan: 405,
  ujungHidung: 330,
  rahangKiri: 275,
  rahangKanan: 415,
}))
uji('Menoleh ke arah sebaliknya juga "samping"', sampingKiri.valid && sampingKiri.side && !sampingKiri.frontal)

// --- 3. Tidak ada zona mati (dead zone) --------------------------------------
// Versi lama: `checkFrontal` butuh rasio rahang 0.50-2.00 sementara
// `checkSideTurn` butuh < 0.45 atau > 2.10. Rasio di antara keduanya
// (mis. 0.47) tidak memenuhi salah pun -> pengguna terjebak selamanya.
const rasioMati = 0.47
const lebar = 140
const jarakKiri = (rasioMati * lebar) / (1 + rasioMati)
const ujungHidungMati = 290 + jarakKiri
const mati = analyzeFacePose(buatWajah({
  pusatMataKiri: 300,
  pusatMataKanan: 420,
  ujungHidung: ujungHidungMati,
  rahangKiri: 290,
  rahangKanan: 430,
}))
uji(
  'Wajah pada zona mati versi lama kini tetap terklasifikasi (tidak terjebak)',
  mati.valid && (mati.frontal || mati.side),
  `frontal=${mati.frontal} side=${mati.side}`,
)

// --- 4. Zona netral pada langkah "samping" ----------------------------------
// Posisi antara "depan" dan "samping" harus tetap netral (tidak salah CLASSIFIED
// sebagai salah satu pun), namun tidak boleh menggagalkan langkah berikutnya.
const netral = analyzeFacePose(buatWajah({
  pusatMataKiri: 304,
  pusatMataKanan: 424,
  ujungHidung: 372,
  rahangKiri: 294,
  rahangKanan: 434,
}))
uji(
  'Posisi antara depan & samping diklasifikasi netral',
  netral.valid && netral.netral && !netral.frontal && !netral.side,
  `frontal=${netral.frontal} side=${netral.side} netral=${netral.netral}`,
)

// --- 5. Skala gambar tidak memengaruhi klasifikasi -------------------------
// Wajah yang sama, digambar pada resolusi 4x lebih besar, harus menghasilkan
// klasifikasi yang sama (semua metrik ternormalisasi).
const kecil = analyzeFacePose(buatWajah({
  pusatMataKiri: 150, pusatMataKanan: 210, ujungHidung: 180, rahangKiri: 145, rahangKanan: 215,
}))
const besar = analyzeFacePose(buatWajah({
  pusatMataKiri: 1200, pusatMataKanan: 1680, ujungHidung: 1440, rahangKiri: 1160, rahangKanan: 1720,
}))
uji(
  'Klasifikasi pose sama pada skala gambar berbeda',
  kecil.frontal === besar.frontal && kecil.side === besar.side,
  `kecil=${kecil.frontal}/${kecil.side} besar=${besar.frontal}/${besar.side}`,
)

// --- 6. Wajah terlalu kecil tidak boleh dianalisis --------------------------
const kecilSekali = analyzeFacePose(buatWajah({
  pusatMataKiri: 20, pusatMataKanan: 28, ujungHidung: 24, rahangKiri: 16, rahangKanan: 32,
}))
uji(
  'Wajah terlalu kecil ditolak (tidak menghasilkan klasifikasi palsu)',
  kecilSekali.valid === false,
  `valid=${kecilSekali.valid}`,
)

// --- 7. Landmark rusak tidak menyebabkan crash ------------------------------
uji('Landmark null ditolak dengan aman', analyzeFacePose(null).valid === false)
uji('Landmark kurang dari 68 titik ditolak', analyzeFacePose(new Array(40).fill({ x: 1, y: 1 })).valid === false)

// --- 8. Sweep kemiringan: harus monoton dari depan ke samping ---------------
let sweepOK = true
let detailSweep = ''
let pernahDepan = false
let pernahSamping = false
for (let geser = 0; geser <= 40; geser += 1) {
  const pose = analyzeFacePose(buatWajah({
    pusatMataKiri: 300 + geser / 2,
    pusatMataKanan: 420 + geser / 2,
    ujungHidung: 360 + geser,
    rahangKiri: 290 + geser / 2,
    rahangKanan: 430 + geser / 2,
  }))
  if (pose.frontal) pernahDepan = true
  if (pose.side) pernahSamping = true
  // Setelah classified "samping" tidak boleh kembali jadi "depan".
  if (pernahSamping && pose.frontal) {
    sweepOK = false
    detailSweep = `kembali ke depan pada geser=${geser}`
    break
  }
}
uji('Klasifikasi kemiringan monoton (depan -> samping)', sweepOK, detailSweep)
uji('Sweep menemukan posisi "depan" dan "samping"', pernahDepan && pernahSamping)
uji(
  'Ambang "samping" lebih lebar dari ambang "depan"',
  AMBANG_SAMPING.nose > AMBANG_DEPAN.nose && AMBANG_SAMPING.jaw > AMBANG_DEPAN.jaw,
)

// --- 9. EAR dihitung dengan benar -------------------------------------------
const earWajah = hitungEAR(buatWajah({ ear: 0.3 }))
uji('EAR wajah terbuka terbaca ~0.3', Math.abs(earWajah - 0.3) < 0.001, `ear=${earWajah}`)
const earTertutup = hitungEAR(buatWajah({ ear: 0.12 }))
uji('EAR wajah tertutup terbaca ~0.12', Math.abs(earTertutup - 0.12) < 0.001, `ear=${earTertutup}`)
uji('EAR null untuk landmark tidak lengkap', hitungEAR(null) === null)

// --- 10. Tracker kedip: baseline dinamis -------------------------------------
function blinkDengan(terbuka, tertutup, jumlahSample = 12) {
  const tracker = createBlinkTracker()
  for (let i = 0; i < jumlahSample; i += 1) {
    tracker.update(terbuka)
  }
  const saatTertutup = tracker.update(tertutup)
  const setelahBuka = tracker.update(terbuka)
  return { tracker, saatTertutup, setelahBuka }
}

const blinkNormal = blinkDengan(0.3, 0.12)
uji('Kedip terdeteksi pada mata normal (0.30 -> 0.12 -> 0.30)', blinkNormal.setelahBuka.blinked === true)
uji('Fase tracker kembali ke "menunggu" setelah kedip', blinkNormal.setelahBuka.phase === 'menunggu')
uji('Fase "terkedip" terdeteksi saat mata tertutup', blinkNormal.saatTertutup.phase === 'terkedip')

// Mata kecil (baseline 0.20) harus tetap terdeteksi -> ambang adaptsif.
const blinkMataKecil = blinkDengan(0.2, 0.08)
uji('Kedip terdeteksi pada mata kecil (0.20 -> 0.08 -> 0.20)', blinkMataKecil.setelahBuka.blinked === true)

// --- 11. Tracker kedip: fluktuasi kecil bukan kedip -------------------------
const trackerFluktuasi = createBlinkTracker()
for (let i = 0; i < 12; i += 1) trackerFluktuasi.update(0.3)
const setelahFluktuasi = trackerFluktuasi.update(0.27)
uji('Fluktuasi kecil (0.30 -> 0.27) tidak dihitung sebagai kedip', setelahFluktuasi.blinked === false)
uji('Fase tetap "menunggu" setelah fluktuasi kecil', setelahFluktuasi.phase === 'menunggu')

// --- 12. Tracker kedip: belum siap sebelum cukup sampel ----------------------
const trackerBaru = createBlinkTracker()
const statusAwal = trackerBaru.update(0.3)
uji('Tracker belum siap sebelum cukup sampel', statusAwal.siap === false)

// --- 13. Rata-rata descriptor ------------------------------------------------
const d1 = new Array(128).fill(0).map((_, i) => i)
const d2 = new Array(128).fill(0).map((_, i) => i + 10)
const rata = averageFaceDescriptors([d1, d2])
uji('Rata-rata dua descriptor menghasilkan titik tengah', rata && Math.abs(rata[0] - 5) < 1e-9 && Math.abs(rata[127] - 132) < 1e-9)
uji('Rata-rata satu descriptor tetap 128 dimensi', averageFaceDescriptors([d1]).length === 128)
uji('Rata-rata tanpa input valid menghasilkan null', averageFaceDescriptors([]) === null)
uji('Rata-rata menolak descriptor berukuran salah', averageFaceDescriptors([new Array(64).fill(1)]) === null)

// --- 14. UKURAN_WAJAH_MIN_EXPORTED ------------------------------------------
uji('Ambang ukuran wajah minimum diekspor', typeof UKURAN_WAJAH_MIN === 'number' && UKURAN_WAJAH_MIN > 0)

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
if (gagal > 0) process.exit(1)
console.log('\nSELURUH SKENARIO LIVENESS PENDAFTARAN WAJAH LULUS\n')
