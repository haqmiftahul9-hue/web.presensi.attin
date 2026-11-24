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
  pangkalHidung: 33,  // bawah hidung / septum
  mataKiri: [36, 37, 38, 39, 40, 41],
  mataKanan: [42, 43, 44, 45, 46, 47],
  bibirKiri: 48,      // sudut bibir kiri
  bibirKanan: 54,     // sudut bibir kanan
  bibirAtasPusat: 51, // tengah bibir atas
  bibirBawahPusat: 57 // tengah bibir bawah
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

/**
 * Menganalisis ekspresi senyuman dari 68 landmark wajah.
 *
 * Menggunakan proyeksi koordinat lokal wajah (rotation & scale invariant):
 * 1. Menghitung aksis mata u (horizontal) dan v (vertikal ke arah dagu).
 * 2. Menghitung rasio lebar mulut: jarak sudut bibir (48 ke 54) dinormalisasi jarak mata.
 *    - Wajah netral: rasio ~0.75 - 0.90
 *    - Wajah tersenyum: rasio melebar ke ~1.00 - 1.30+
 * 3. Menghitung pengangkatan sudut bibir (corner lift): proyeksi sudut bibir
 *    relatif terhadap pusat bibir sepanjang aksis v.
 *    - Wajah netral/sedih: lift <= 0.03 (sudut bibir sejajar/di bawah garis bibir)
 *    - Wajah tersenyum: otot zygomaticus menarik sudut bibir ke atas (lift >= 0.08)
 * 4. Menghasilkan skor 0.0 - 1.0 (0% - 100%) dan flag isSmiling.
 *
 * Catatan penting: Menguap atau membuka mulut ("A" / "O") memperlebar celah bibir
 * secara vertikal, namun sudut bibir justru menyempit (widthRatio mengecil) dan
 * tertarik ke bawah (cornerLift <= 0), sehingga TIDAK salah terdeteksi sebagai senyuman.
 */
export function hitungSmileScore(landmarks) {
  if (!landmarks || landmarks.length < 68) {
    return {
      valid: false,
      score: 0,
      widthRatio: 0,
      cornerLift: 0,
      isSmiling: false,
    }
  }

  const mataKiri = titikTengahMata(landmarks, LM.mataKiri)
  const mataKanan = titikTengahMata(landmarks, LM.mataKanan)
  const cL = landmarks[LM.bibirKiri]
  const cR = landmarks[LM.bibirKanan]
  const topLip = landmarks[LM.bibirAtasPusat]
  const botLip = landmarks[LM.bibirBawahPusat]

  if (!mataKiri || !mataKanan || !cL || !cR || !topLip || !botLip) {
    return {
      valid: false,
      score: 0,
      widthRatio: 0,
      cornerLift: 0,
      isSmiling: false,
    }
  }

  const eyeVec = { x: mataKanan.x - mataKiri.x, y: mataKanan.y - mataKiri.y }
  const eyeDist = Math.hypot(eyeVec.x, eyeVec.y)

  // Wajah terlalu kecil
  if (eyeDist < UKURAN_WAJAH_MIN) {
    return {
      valid: false,
      score: 0,
      widthRatio: 0,
      cornerLift: 0,
      isSmiling: false,
    }
  }

  // Vektor satuan koordinat wajah:
  // u = sumbu sejajar mata (kiri ke kanan)
  // v = sumbu tegak lurus mata (ke bawah mengarah dagu)
  const u = { x: eyeVec.x / eyeDist, y: eyeVec.y / eyeDist }
  const v = { x: -u.y, y: u.x }

  // 1. Rasio lebar mulut
  const mouthVec = { x: cR.x - cL.x, y: cR.y - cL.y }
  const mouthWidth = Math.hypot(mouthVec.x, mouthVec.y)
  const widthRatio = mouthWidth / eyeDist

  // 2. Pengangkatan sudut bibir (Corner Lift)
  // Titik tengah bibir dan titik tengah kedua sudut
  const mouthCenter = { x: (topLip.x + botLip.x) / 2, y: (topLip.y + botLip.y) / 2 }
  const cornersMid = { x: (cL.x + cR.x) / 2, y: (cL.y + cR.y) / 2 }

  // Posisi pada sumbu v (semakin kecil nilainya = semakin tinggi ke arah mata)
  const mouthCenterV = mouthCenter.x * v.x + mouthCenter.y * v.y
  const cornersV = cornersMid.x * v.x + cornersMid.y * v.y
  // Positif jika sudut bibir terangkat lebih tinggi dibanding pusat bibir
  const cornerLift = (mouthCenterV - cornersV) / eyeDist

  // Hitung komponen skor normalisasi 0..1
  // Lebar mulut: netral di bawah 0.88, senyum jelas di atas 1.04
  const scoreWidth = Math.max(0, Math.min(1, (widthRatio - 0.88) / 0.16))

  // Corner lift: netral/turun di bawah 0.04, senyum jelas di atas 0.11
  const scoreLift = Math.max(0, Math.min(1, (cornerLift - 0.04) / 0.08))

  // Bobot komposit:
  // Keduanya penting; jika sudut terangkat sangat kuat (senyum tipis tapi jelas),
  // atau mulut melebar dengan sudut sedikit terangkat (senyum lebar).
  let rawScore = 0.5 * scoreWidth + 0.5 * scoreLift

  // Bonus sinergi: jika kedua indikator positif, senyuman sangat meyakinkan
  if (scoreWidth > 0.4 && scoreLift > 0.4) {
    rawScore = Math.min(1, rawScore + 0.15)
  }

  // Batalkan jika sudut bibir tertarik ke bawah (misal cemberut atau menguap)
  if (cornerLift <= 0.01) {
    rawScore = Math.min(rawScore, 0.2)
  }

  const score = Math.max(0, Math.min(1, Number(rawScore.toFixed(3))))
  const isSmiling = score >= 0.65

  return {
    valid: true,
    score,
    widthRatio: Number(widthRatio.toFixed(3)),
    cornerLift: Number(cornerLift.toFixed(3)),
    isSmiling,
  }
}

/**
 * Tracker senyuman untuk alur pendaftaran liveness.
 *
 * Menjamin senyuman terdeteksi secara stabil selama beberapa frame beruntun
 * (default: 3 frame ~ 100-200ms) untuk mencegah kesalahan deteksi sesaat (noise).
 */
export function createSmileTracker({
  consecutiveThreshold = 3,
  scoreThreshold = 0.65,
} = {}) {
  let consecutiveFrames = 0
  let smiled = false
  let highestScore = 0

  return {
    reset() {
      consecutiveFrames = 0
      smiled = false
      highestScore = 0
    },
    get smiled() {
      return smiled
    },
    get consecutiveFrames() {
      return consecutiveFrames
    },
    get highestScore() {
      return highestScore
    },
    /**
     * Masukkan landmarks frame saat ini.
     * @param {Array} landmarks
     * @param {object} [pose] - informasi orientasi kepala dari analyzeFacePose
     */
    update(landmarks, pose = null) {
      const res = hitungSmileScore(landmarks)

      if (!res.valid) {
        return {
          valid: false,
          score: 0,
          smiling: false,
          consecutive: 0,
          highestScore,
          message: 'Wajah tidak terdeteksi jelas',
          siap: false,
        }
      }

      // Pastikan wajah juga tidak menoleh ekstrem (wajah harus menghadap depan saat tersenyum)
      if (pose && pose.valid && pose.side) {
        consecutiveFrames = 0
        return {
          valid: true,
          score: res.score,
          smiling: false,
          consecutive: 0,
          highestScore,
          message: 'Hadapkan wajah ke depan kamera',
          siap: true,
        }
      }

      highestScore = Math.max(highestScore, res.score)

      if (res.score >= scoreThreshold) {
        consecutiveFrames += 1
      } else if (res.score >= scoreThreshold * 0.75) {
        // Dekat ambang batas: kurangi perlahan agar toleran
        consecutiveFrames = Math.max(0, consecutiveFrames - 1)
      } else {
        consecutiveFrames = 0
      }

      if (consecutiveFrames >= consecutiveThreshold) {
        smiled = true
      }

      let message = 'Silakan tersenyum ke kamera 😊'
      if (smiled) {
        message = 'Senyuman terverifikasi! ✓'
      } else if (consecutiveFrames > 0) {
        message = 'Senyuman terdeteksi! Tahan sebentar... 😊'
      } else if (res.score >= 0.4) {
        message = 'Sedikit lagi, lebarkan senyuman Anda... 😊'
      }

      return {
        valid: true,
        score: res.score,
        smiling: smiled,
        consecutive: consecutiveFrames,
        highestScore,
        message,
        siap: true,
        details: res,
      }
    },
  }
}

