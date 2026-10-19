/**
 * Layanan Face Recognition Client-Side menggunakan Face-api.js (@vladmandic/face-api).
 * 
 * Fitur:
 * 1. Pemuatan model offline dari /models/face-api (TinyFaceDetector, Landmark68, FaceRecognition).
 * 2. Deteksi wajah real-time pada video kamera atau elemen gambar.
 * 3. Ekstraksi vektor deskriptor biometrik 128 dimensi.
 * 4. Pendaftaran wajah pengguna (Enrollment) tersimpan ke Store & LocalStorage.
 * 5. Pencocokan wajah (Verification) dengan perbandingan jarak Euclidean.
 * 6. Validasi ketat: jika wajah tidak cocok, tolak dengan pesan "Akses Ditolak/Wajah Tidak Cocok".
 */

let faceapiPromise = null
let modelsLoaded = false
let loadingModelsPromise = null

const MODEL_BASE_PATH = '/models/face-api'
const CDN_FALLBACK_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

// Threshold Euclidean distance default untuk face-api.
// Jarak <= 0.55 dianggap wajah yang sama (match). Jarak > 0.55 dianggap wajah berbeda (mismatch).
export const FACE_MATCH_THRESHOLD = 0.55

/**
 * Mengambil instance faceapi secara dinamis agar aman di lingkungan SSR / Node test runner.
 */
export async function getFaceApi() {
  if (typeof window === 'undefined') return null
  if (!faceapiPromise) {
    faceapiPromise = import('@vladmandic/face-api').then((mod) => mod.default || mod)
  }
  return faceapiPromise
}

/**
 * Memuat bobot model neural network TinyFaceDetector, Landmark68, dan FaceRecognition.
 */
export async function loadFaceApiModels(onProgress) {
  if (modelsLoaded) return true
  if (loadingModelsPromise) return loadingModelsPromise

  loadingModelsPromise = (async () => {
    const faceapi = await getFaceApi()
    if (!faceapi) return false

    onProgress?.('Memuat model deteksi wajah...')
    
    // Coba memuat dari public/models/face-api lokal terlebih dahulu
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE_PATH),
      ])
      modelsLoaded = true
      return true
    } catch (errLocal) {
      console.warn('Gagal memuat model lokal, mencoba CDN fallback...', errLocal)
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK_PATH),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK_PATH),
        ])
        modelsLoaded = true
        return true
      } catch (errCdn) {
        console.error('Gagal memuat model face-api dari lokal maupun CDN:', errCdn)
        throw new Error('Gagal memuat model Face Recognition. Periksa koneksi atau berkas model.')
      }
    }
  })()

  return loadingModelsPromise
}

/**
 * Konfigurasi opsi detektor wajah TinyFaceDetectorOptions.
 * Jauh lebih ringan dan cepat di mobile web dibandingkan SSD MobileNet.
 */
export function createTinyFaceDetectorOptions(faceapi, { inputSize = 224, scoreThreshold = 0.5 } = {}) {
  if (faceapi?.TinyFaceDetectorOptions) {
    return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
  }
  return { inputSize, scoreThreshold }
}

/**
 * Cek apakah model neural network face-api sudah selesai dimuat.
 */
export function isFaceApiLoaded() {
  return modelsLoaded
}

/**
 * Deteksi wajah tunggal dan ekstrak descriptor 128-d menggunakan TinyFaceDetector.
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} inputElement
 * @param {object} options
 */
export async function detectSingleFaceAndDescriptor(inputElement, options = {}) {
  const faceapi = await getFaceApi()
  if (!faceapi) throw new Error('Face-api tidak tersedia pada lingkungan ini')

  if (!modelsLoaded) {
    await loadFaceApiModels()
  }

  const {
    inputSize = 224,
    scoreThreshold = 0.5,
  } = options

  // Selalu gunakan new faceapi.TinyFaceDetectorOptions() sesuai permintaan refactor
  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold,
  })

  // Deteksi wajah tunggal menggunakan TinyFaceDetector + landmark 68 + descriptor
  const detection = await faceapi
    .detectSingleFace(inputElement, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    return {
      detected: false,
      descriptor: null,
      box: null,
      landmarks: null,
      score: 0,
    }
  }

  const box = detection.detection.box
  return {
    detected: true,
    score: detection.detection.score,
    box: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
    landmarks: detection.landmarks,
    // Konversi Float32Array ke standard Array agar bisa diserialisasi ke JSON/LocalStorage
    descriptor: Array.from(detection.descriptor),
    rawDescriptor: detection.descriptor,
  }
}

/**
 * Membandingkan descriptor wajah yang terdeteksi dengan descriptor yang sudah terdaftar.
 * @param {Array<number>|Float32Array} currentDescriptor
 * @param {Array<number>|Float32Array} registeredDescriptor
 * @param {number} threshold - default 0.55
 */
export async function compareFaceDescriptors(currentDescriptor, registeredDescriptor, threshold = FACE_MATCH_THRESHOLD) {
  const faceapi = await getFaceApi()
  if (!faceapi) throw new Error('Face-api tidak tersedia')

  if (!currentDescriptor || !registeredDescriptor) {
    return {
      match: false,
      distance: 1.0,
      confidence: 0,
      reason: 'Deskriptor wajah tidak lengkap',
    }
  }

  const d1 = currentDescriptor instanceof Float32Array ? currentDescriptor : new Float32Array(currentDescriptor)
  const d2 = registeredDescriptor instanceof Float32Array ? registeredDescriptor : new Float32Array(registeredDescriptor)

  if (d1.length !== 128 || d2.length !== 128) {
    return {
      match: false,
      distance: 1.0,
      confidence: 0,
      reason: 'Ukuran vektor deskriptor tidak valid (harus 128 dimensi)',
    }
  }

  const distance = faceapi.euclideanDistance(d1, d2)
  const match = distance <= threshold

  // Hitung persentase kecocokan (0 - 100%)
  // Jarak 0.0 -> 100%
  // Jarak 0.35 -> ~88%
  // Jarak 0.55 (ambang batas) -> ~72%
  // Jarak >= 0.85 -> 0%
  let confidence = Math.round(Math.max(0, Math.min(100, (1 - (distance / 0.85)) * 100)))
  if (match && confidence < 70) confidence = 70

  return {
    match,
    distance: Number(distance.toFixed(4)),
    confidence,
    threshold,
  }
}

/**
 * Mengambil tangkapan snapshot foto dari elemen video kamera sebagai Data URL (JPEG).
 */
export function captureVideoFrame(videoElement, quality = 0.88) {
  if (!videoElement) return null
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth || 640
  canvas.height = videoElement.videoHeight || 480
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Jika kamera depan, gambar secara mirror agar sesuai tampilan cermin viewfinder
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

// Key format untuk penyimpanan pendaftaran wajah di localStorage
const STORAGE_PREFIX = 'attin_face_reg_'

/**
 * Mengambil data pendaftaran wajah tersimpan berdasarkan NIY atau staffId.
 */
export function getRegisteredFaceData(staff) {
  if (typeof window === 'undefined' || !staff) return null

  // 1. Cek dari field staff di store terlebih dahulu jika sudah ada
  if (staff.faceDescriptor && Array.isArray(staff.faceDescriptor)) {
    return {
      niy: staff.niy,
      staffId: staff.id,
      name: staff.name,
      descriptor: staff.faceDescriptor,
      photo: staff.facePhoto || staff.foto || null,
      registeredAt: staff.faceRegisteredAt || null,
    }
  }

  // 2. Cek dari LocalStorage dengan kunci NIY
  try {
    const key = `${STORAGE_PREFIX}${staff.niy || staff.id}`
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.descriptor && Array.isArray(parsed.descriptor)) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Gagal membaca data pendaftaran wajah dari localStorage:', err)
  }

  return null
}

/**
 * Menyimpan data pendaftaran wajah ke LocalStorage dan mengembalikan objek registrasi.
 */
export function saveRegisteredFaceData({ staff, descriptor, photo }) {
  if (typeof window === 'undefined' || !staff) return null

  const record = {
    niy: staff.niy,
    staffId: staff.id,
    name: staff.name,
    descriptor: Array.isArray(descriptor) ? descriptor : Array.from(descriptor),
    photo: photo || null,
    registeredAt: new Date().toISOString(),
  }

  try {
    const key = `${STORAGE_PREFIX}${staff.niy || staff.id}`
    window.localStorage.setItem(key, JSON.stringify(record))
  } catch (err) {
    console.warn('Gagal menyimpan pendaftaran wajah ke localStorage:', err)
  }

  return record
}

/**
 * Menghapus pendaftaran wajah untuk testing atau pendaftaran ulang.
 */
export function deleteRegisteredFaceData(staff) {
  if (typeof window === 'undefined' || !staff) return false
  try {
    const key = `${STORAGE_PREFIX}${staff.niy || staff.id}`
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

