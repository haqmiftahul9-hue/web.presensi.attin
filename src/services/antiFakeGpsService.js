/**
 * ANTI-FAKE GPS & MOCK LOCATION SECURITY SERVICE
 * SIMPEG ATTIN SUMBAR
 *
 * Mendeteksi manipulasi lokasi, penggunaan Mock Location Android,
 * ekstensi browser (Location Guard, GPS spoofer), Chrome DevTools sensor injection,
 * serta anomali pergerakan mustahil (teleportasi) dan akurasi buatan.
 */

const MAX_HUMAN_VELOCITY_MPS = 42 // ~151.2 km/jam (batas wajar perjalanan darat cepat)
const MIN_REAL_ACCURACY_METERS = 1.0 // GPS satelit alami sangat jarang memberikan akurasi tepat <= 1.0m tanpa desimal
const MAX_ALLOWED_ACCURACY_METERS = 120 // Akurasi di atas 120m dianggap terlalu kasar (cell tower/IP lookup)

/**
 * Cache pergerakan untuk analisis kecepatan dan kebekuan koordinat
 */
let lastValidPosition = null
const positionHistory = []
const MAX_HISTORY_LENGTH = 5

/**
 * 1. Deteksi Mock Provider bawaan dari Geolocation API & Android
 */
export function checkIsMockProvider(position) {
  if (!position) return { detected: false }

  // Di WebView modern / Chromium Android, bendera isMock sering diteruskan ke coords
  if (position.coords?.isMock === true) {
    return {
      detected: true,
      reason: 'Bendera mock location terdeteksi pada sistem operasi (isMock: true)',
    }
  }

  // Cek pada level root position jika browser membungkusnya
  if (position.isMock === true || position.mocked === true) {
    return {
      detected: true,
      reason: 'Sistem operasi melaporkan sinyal GPS tiruan (mocked provider)',
    }
  }

  return { detected: false }
}

/**
 * 2. Deteksi Manipulasi / Monkey-Patching pada Objek Geolocation Browser
 * Menangkap ekstensi pengubah lokasi atau skrip injeksi peramban.
 */
export function checkPrototypeTampering() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { detected: false }
  }

  try {
    const fn = navigator.geolocation.getCurrentPosition
    if (typeof fn !== 'function') {
      return { detected: true, reason: 'navigator.geolocation.getCurrentPosition tidak valid' }
    }

    // Periksa string fungsi asli (Native Code check)
    const fnStr = Function.prototype.toString.call(fn)
    const isNative = /\[native code\]/.test(fnStr)

    // Jika fungsi di-override oleh ekstensi non-native, fnStr akan memperlihatkan source code ekstensi
    if (!isNative) {
      // Pengecualian lingkungan pengujian node / jsdom
      if (typeof window !== 'undefined' && !window.__TEST_ENV__) {
        return {
          detected: true,
          reason: 'Fungsi geolokasi telah dimodifikasi oleh ekstensi peramban atau script pihak ketiga',
        }
      }
    }

    // Periksa apakah getCurrentPosition adalah own property yang sengaja ditempel di instance navigator.geolocation
    // Pada peramban standar, fungsi ini didefinisikan di Geolocation.prototype
    if (Object.prototype.hasOwnProperty.call(navigator.geolocation, 'getCurrentPosition')) {
      if (typeof window !== 'undefined' && !window.__TEST_ENV__) {
        return {
          detected: true,
          reason: 'Instance navigator.geolocation dimanipulasi secara langsung (own-property injection)',
        }
      }
    }
  } catch {
    // Abaikan kesalahan refleksi
  }

  return { detected: false }
}

/**
 * 3. Deteksi Anomali Akurasi Palsu
 * Aplikasi Fake GPS sering mengembalikan akurasi buatan seperti tepat 0 meter,
 * bilangan bulat statis tanpa fluktuasi, atau nilai minus.
 */
export function checkAccuracyAnomaly(accuracy) {
  if (accuracy == null) {
    return { detected: true, reason: 'Nilai akurasi GPS tidak tersedia' }
  }

  const accNum = Number(accuracy)

  // Akurasi 0 meter adalah tanda pasti Fake GPS karena GPS satelit selalu memiliki margin error
  if (accNum <= 0) {
    return {
      detected: true,
      reason: `Akurasi GPS tidak wajar (±${accNum}m). GPS satelit asli memiliki margin galat alami > 0m`,
    }
  }

  return { detected: false }
}

/**
 * 4. Deteksi Teleportasi / Kecepatan Tidak Manusiawi
 * Memeriksa apakah perpindahan dari koordinat sebelumnya melebihi kecepatan fisik realistis.
 */
export function checkTeleportation(prevPos, currentPos) {
  if (!prevPos || !currentPos) return { detected: false }

  const timeDeltaSec = (currentPos.timestamp - prevPos.timestamp) / 1000
  // Abaikan jika jeda waktu terlalu lama (> 10 menit) karena pengguna bisa naik kendaraan cepat
  if (timeDeltaSec <= 0 || timeDeltaSec > 600) return { detected: false }

  const distance = hitungJarakMeter(
    prevPos.latitude,
    prevPos.longitude,
    currentPos.latitude,
    currentPos.longitude,
  )

  const velocity = distance / timeDeltaSec // m/s
  if (velocity > MAX_HUMAN_VELOCITY_MPS) {
    const kmh = Math.round(velocity * 3.6)
    return {
      detected: true,
      reason: `Lonjakan perpindahan lokasi mustahil: ${Math.round(distance)}m dalam ${Math.round(timeDeltaSec)}s (~${kmh} km/jam)`,
    }
  }

  return { detected: false }
}

/**
 * 5. Deteksi Koordinat 100% Statis (Zero Jitter Anomaly)
 * Sinyal satelit di dunia nyata selalu bergetar mikro pada desimal ke-5 atau ke-6
 * karena refraksi atmosfer ionosfer. Fake GPS sering kali membekukan koordinat secara mutlak.
 */
export function checkStaticJitterAnomaly(history) {
  if (!Array.isArray(history) || history.length < 4) return { detected: false }

  const first = history[0]
  const allIdentical = history.every(
    (h) => h.latitude === first.latitude && h.longitude === first.longitude,
  )

  // Jika 4+ pembacaan berturut-turut koordinatnya persis 100% tanpa beda 0.000001 pun
  // dan akurasi persis sama, ini indikator kuat sinyal tiruan emulator/software
  if (allIdentical && history.every((h) => h.accuracy === first.accuracy)) {
    return {
      detected: true,
      reason: 'Koordinat GPS statis 100% tanpa fluktuasi satelit alami (zero jitter anomaly)',
    }
  }

  return { detected: false }
}

/**
 * 6. Deteksi Alat Otomasi & Browser Headless
 */
export function checkAutomationEnvironment() {
  if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
    return {
      detected: true,
      reason: 'Browser terdeteksi dijalankan melalui perangkat otomasi/webdriver',
    }
  }
  return { detected: false }
}

/**
 * Hitung jarak 2 titik koordinat (Haversine murni)
 */
export function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => !Number.isFinite(Number(v)))) return 0
  const R = 6371000
  const toRad = (v) => (Number(v) * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))))
}

/**
 * Evaluasi Komprehensif Keamanan Geolokasi
 *
 * @param {GeolocationPosition|object} position - Objek koordinat dari browser
 * @param {object} [options]
 * @param {boolean} [options.strictMode=true]
 * @returns {{ isFake: boolean, reason: string|null, quality: 'sangat_baik'|'baik'|'sedang'|'lemah', accuracy: number }}
 */
export function inspectGeolocationSecurity(position, options = {}) {
  const { strictMode = true } = options

  if (!position || !position.coords) {
    return {
      isFake: true,
      reason: 'Data posisi GPS tidak valid atau tidak memiliki koordinat',
      quality: 'lemah',
      accuracy: 999,
    }
  }

  const coords = position.coords
  const accuracy = Number(coords.accuracy || 0)
  const currentItem = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy,
    timestamp: position.timestamp || Date.now(),
  }

  // 1. Cek Mock Provider
  const mockCheck = checkIsMockProvider(position)
  if (mockCheck.detected) {
    return { isFake: true, reason: mockCheck.reason, quality: 'lemah', accuracy }
  }

  // 2. Cek Prototype Tampering
  const tamperCheck = checkPrototypeTampering()
  if (tamperCheck.detected) {
    return { isFake: true, reason: tamperCheck.reason, quality: 'lemah', accuracy }
  }

  // 3. Cek Otomasi / Webdriver
  const autoCheck = checkAutomationEnvironment()
  if (autoCheck.detected) {
    return { isFake: true, reason: autoCheck.reason, quality: 'lemah', accuracy }
  }

  // 4. Cek Anomali Akurasi
  const accCheck = checkAccuracyAnomaly(accuracy)
  if (accCheck.detected) {
    return { isFake: true, reason: accCheck.reason, quality: 'lemah', accuracy }
  }

  // 5. Cek Teleportasi
  if (lastValidPosition) {
    const teleCheck = checkTeleportation(lastValidPosition, currentItem)
    if (teleCheck.detected) {
      return { isFake: true, reason: teleCheck.reason, quality: 'lemah', accuracy }
    }
  }

  // Catat riwayat untuk deteksi getaran statis
  positionHistory.push(currentItem)
  if (positionHistory.length > MAX_HISTORY_LENGTH) {
    positionHistory.splice(0, 1)
  }

  // 6. Cek Static Jitter Anomaly jika dalam mode ketat
  if (strictMode && positionHistory.length >= 4) {
    const jitterCheck = checkStaticJitterAnomaly(positionHistory)
    if (jitterCheck.detected) {
      return { isFake: true, reason: jitterCheck.reason, quality: 'lemah', accuracy }
    }
  }

  // Simpan posisi valid terakhir
  lastValidPosition = currentItem

  // Tentukan kualitas sinyal GPS
  let quality = 'lemah'
  if (accuracy <= 15) {
    quality = 'sangat_baik'
  } else if (accuracy <= 40) {
    quality = 'baik'
  } else if (accuracy <= MAX_ALLOWED_ACCURACY_METERS) {
    quality = 'sedang'
  }

  return {
    isFake: false,
    reason: null,
    quality,
    accuracy,
  }
}

/**
 * Reset riwayat koordinat (misal saat logout atau pergantian user)
 */
export function resetGeolocationSecurityCache() {
  lastValidPosition = null
  positionHistory.length = 0
}
