/**
 * Analisis liveness wajah untuk pendaftaran biometrik (Face Enrollment).
 * ----------------------------------------------------------------------------
 * Dua kemampuan yang dipakai modal pendaftaran:
 *   1. analyzeFacePose()    -> menentukan apakah wajah sedang menghadap DEPAN
 *                              atau sudah menoleh ke SAMPING (yaw kiri/kanan).
 *   2. createBlinkTracker() -> mendeteksi satu kali kedip mata (liveness).
 *
 * Seluruh metrik dihitung dari landmark 68 titik face-api.js dan DINORMALISASI
 * terhadap ukuran wajah sendiri (jarak antar-mata & lebar rahang). Dengan begitu
 * ambang yang sama berlaku untuk kamera 320px maupun 1080px, dan untuk wajah
 * yang dekat maupun jauh dari kamera.
 *
 * Modul ini murni (tidak menyentuh DOM) sehingga bisa diuji langsung di Node.
 */

// ---------------------------------------------------------------------------
// Indeks landmark 68 face-api.js
// ---------------------------------------------------------------------------
const LM = {
  rahangKiri: 0,      // ujung rahang sisi kiri gambar
  rahangKanan: 16,    // ujung rahang sisi kanan gambar
  ujungHidung: 30,    // ujung hidung (puncak)
  mataKiri: [36, 37, 38, 39, 40, 41],
  mataKanan: [42, 43, 44, 45, 46, 47],
}

/**
 * Ambang "menghadap depan".
 * - nose : offset ujung hidung terhadap titik tengah kedua mata, dinormalisasi
 *          dengan jarak antar-mata. 0.115 ~ sudut menoleh 19 derajat.
 * - jaw  : offset ujung hidung terhadap titik tengah rahang, dinormalisasi
 *          dengan lebar wajah. 0.050 ~ sudut menoleh 18 derajat.
 */
export const AMBANG_DEPAN = { nose: 0.115, jaw: 0.050 }

/**
 * Ambang "menghadap samping".
 * - nose : 0.145 ~ sudut menoleh 25 derajat
 * - jaw  : 0.065 ~ sudut menoleh 23 derajat
 */
export const AMBANG_SAMPING = { nose: 0.145, jaw: 0.065 }

/**
 * Jarak antar-mata minimal (piksel video) agar landmark dianggap layak.
 * Di bawah ini landmark terlalu kecil dan terlalu rentan noise.
 */
export const UKURAN_WAJAH_MIN = 14

function jarak(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

function rataRata(nums) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function titikTengahMata(landmarks, indeks) {
  const titik = indeks.map((i) => landmarks[i])
  return {
    x: rataRata(titik.map((p) => p.x)),
    y: rataRata(titik.map((p) => p.y)),
  }
}

/**
 * EAR (Eye Aspect Ratio) dari 6 titik kontur mata — formula standar.
 * Nilai tinggi = mata terbuka, nilai mendekati 0 = mata tertutup.
 */
export function hitungEAR(landmarks) {
  if (!landmarks || landmarks.length < 68) return null
  const kiri = LM.mataKiri.map((i) => landmarks[i])
  const kanan = LM.mataKanan.map((i) => landmarks[i])
  if (kiri.some((p) => !p) || kanan.some((p) => !p)) return null

  const earSatuMata = (mata) => {
    const A = jarak(mata[1], mata[5])
    const B = jarak(mata[2], mata[4])
    const C = jarak(mata[0], mata[3])
    return C > 0 ? (A + B) / (2.0 * C) : null
  }

  const earKiri = earSatuMata(kiri)
  const earKanan = earSatuMata(kanan)
  if (earKiri === null || earKanan === null) return null
  return (earKiri + earKanan) / 2
}

/**
 * Menganalisis orientasi kepala (yaw) dari landmark wajah.
 *
 * Mengembalikan:
 *   {
 *     valid      : landmark cukup & wajah cukup besar untuk dianalisis,
 *     frontal    : wajah sedang menghadap depan,
 *     side       : wajah sedang menoleh ke samping (kiri atau kanan),
 *     netral     : di antara dua ambang (belum frontal maupun samping),
 *     arah       : 'depan' | 'kiri' | 'kanan',
 *     noseOffset : signed, ternormalisasi jarak antar-mata,
 *     jawOffset  : signed, ternormalisasi lebar wajah,
 *     frontalScore: 0..1+ (1 = tepat di batas "depan"),
 *     sideScore  : 0..1+ (1 = tepat di batas "samping"),
 *     gauge      : -1.5..1.5 posisi jarum untuk indikator kemiringan,
 *   }
 */
export function analyzeFacePose(landmarks) {
  const kosong = {
    valid: false,
    frontal: false,
    side: false,
    netral: false,
    arah: 'depan',
    noseOffset: 0,
    jawOffset: 0,
    frontalScore: 0,
    sideScore: 0,
    gauge: 0,
  }
  if (!landmarks || landmarks.length < 68) return kosong

  const mataKiri = titikTengahMata(landmarks, LM.mataKiri)
  const mataKanan = titikTengahMata(landmarks, LM.mataKanan)
  const ujungHidung = landmarks[LM.ujungHidung]
  const rahangKiri = landmarks[LM.rahangKiri]
  const rahangKanan = landmarks[LM.rahangKanan]

  if (!ujungHidung || !rahangKiri || !rahangKanan) return kosong

  const jarakMata = Math.abs(mataKanan.x - mataKiri.x)
  const lebarWajah = Math.abs(rahangKanan.x - rahangKiri.x)

  // Wajah terlalu kecil -> landmark tidak reliabel, abaikan frame ini.
  if (jarakMata < UKURAN_WAJAH_MIN || lebarWajah < UKURAN_WAJAH_MIN) return kosong

  const tengahMata = (mataKiri.x + mataKanan.x) / 2
  const tengahRahang = (rahangKiri.x + rahangKanan.x) / 2

  // Tanda positif = hidung bergeser ke arah kanan gambar.
  const noseOffset = (ujungHidung.x - tengahMata) / jarakMata
  const jawOffset = (ujungHidung.x - tengahRahang) / lebarWajah

  const frontalScore = Math.max(
    Math.abs(noseOffset) / AMBANG_DEPAN.nose,
    Math.abs(jawOffset) / AMBANG_DEPAN.jaw,
  )
  const sideScore = Math.max(
    Math.abs(noseOffset) / AMBANG_SAMPING.nose,
    Math.abs(jawOffset) / AMBANG_SAMPING.jaw,
  )

  const frontal = frontalScore <= 1
  const side = sideScore >= 1
  const netral = !frontal && !side

  const arahTanda = 0.6 * (noseOffset / AMBANG_SAMPING.nose) + 0.4 * (jawOffset / AMBANG_SAMPING.jaw)
  const gauge = Math.max(-1.5, Math.min(1.5, arahTanda))

  let arah = 'depan'
  if (!frontal) {
    if (arahTanda > 0.06) arah = 'kanan'
    else if (arahTanda < -0.06) arah = 'kiri'
  }

  return {
    valid: true,
    frontal,
    side,
    netral,
    arah,
    noseOffset,
    jawOffset,
    frontalScore,
    sideScore,
    gauge,
  }
}

/**
 * Tracker kedip mata.
 *
 * Berbeda dari ambang EAR absolut, tracker ini memakai baseline dinamis:
 * nilai EAR tertinggi yang pernah terlihat menjadi "acu mata terbuka", sehingga
 * ambang menyesuaikan ukuran mata & pencahayaan tiap pengguna. Satu kedip
 * terdeteksi saat EAR turun ke <= 78% baseline lalu kembali naik ke >= 88%.
 */
export function createBlinkTracker({
  windowSize = 24,
  minSamples = 8,
  closedRatio = 0.78,
  openRatio = 0.88,
  earMax = 0.6,
} = {}) {
  const samples = []
  let baseline = null
  let phase = 'menunggu' // 'menunggu' | 'terkedip'
  let blinked = false

  function hitungBaseline() {
    if (samples.length < minSamples) return null
    const urut = [...samples].sort((a, b) => a - b)
    // Persentil ke-80: tahan terhadap frame mata tertutup sesaat.
    const idx = Math.floor(0.8 * (urut.length - 1))
    return urut[idx]
  }

  return {
    reset() {
      samples.length = 0
      baseline = null
      phase = 'menunggu'
      blinked = false
    },
    get phase() {
      return phase
    },
    get blinked() {
      return blinked
    },
    get baseline() {
      return baseline
    },
    /**
     * Masukkan satu nilai EAR. Mengembalikan status kedip terbaru.
     * @param {number} ear
     */
    update(ear) {
      if (typeof ear !== 'number' || !Number.isFinite(ear) || ear <= 0) {
        return { phase, blinked, baseline, ratio: null, siap: false }
      }

      // Nilai EAR di luar rentang fisiologis menandakan landmark terganggu
      // (mis. wajah miring atau terlalu kecil). Nilainya dijepit agar tidak
      // merusak baseline — bukan dibuang, karena tracker tetap harus dapat
      // berfungsi pada kondisi pencahayaan yang buruk.
      const nilai = Math.min(ear, earMax)

      samples.push(nilai)
      if (samples.length > windowSize) samples.splice(0, 1)
      baseline = hitungBaseline()

      if (!baseline) {
        return { phase, blinked, baseline, ratio: null, siap: false }
      }

      const ratio = nilai / baseline

      if (phase === 'menunggu') {
        if (ratio <= closedRatio) {
          phase = 'terkedip'
        }
      } else if (ratio >= openRatio) {
        // Mata kembali terbuka setelah sempat tertutup -> satu kedip lengkap.
        phase = 'menunggu'
        blinked = true
      }

      return { phase, blinked, baseline, ratio, siap: true }
    },
  }
}
