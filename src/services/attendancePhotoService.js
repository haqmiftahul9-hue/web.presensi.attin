import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

/**
 * Pemetaan ID unit sekolah ke nama bucket Supabase Storage.
 * Masing-masing unit memiliki bucket terpisah agar foto presensi
 * scan wajah (datang & pulang) tersimpan secara rapi dan terstruktur.
 */
export const UNIT_ATTENDANCE_BUCKETS = {
  tk: 'presensi-tk',
  sd: 'presensi-sd',
  smp: 'presensi-smp',
  sma: 'presensi-sma',
  yayasan: 'presensi-yayasan',
  default: 'face-snapshots',
}

/**
 * Resolusi nama bucket berdasarkan unit pegawai.
 *
 * @param {string|number} [unitId]
 * @returns {string} Nama bucket di Supabase Storage
 */
export function getUnitAttendanceBucket(unitId) {
  if (!unitId) return UNIT_ATTENDANCE_BUCKETS.default
  const key = String(unitId).toLowerCase().trim()
  return UNIT_ATTENDANCE_BUCKETS[key] || `presensi-${key}`
}

/**
 * Format tanggal ISO lokal (YYYY-MM-DD).
 */
function getLocalDateString(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Format waktu lokal (HHMMSS) untuk penamaan file unik.
 */
function getLocalTimeString(d = new Date()) {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}${m}${s}`
}

/**
 * Konversi Data URL base64 ke Blob.
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp'
  const binary = atob(parts[1])
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}

/**
 * Memastikan bucket unit presensi tersedia di Supabase Storage.
 *
 * @param {string} bucketName
 * @returns {Promise<boolean>}
 */
export async function ensureAttendanceBucket(bucketName) {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) {
      console.warn(`[AttendancePhoto] listBuckets error:`, error.message)
      return false
    }
    const exists = buckets?.some((b) => b.name === bucketName || b.id === bucketName)
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 1048576, // 1MB batas keras, target kompresi < 30KB
        allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
      })
      if (createErr) {
        console.warn(`[AttendancePhoto] Gagal membuat bucket ${bucketName}:`, createErr.message)
        return false
      }
    }
    return true
  } catch (err) {
    console.warn(`[AttendancePhoto] Exception saat memeriksa bucket ${bucketName}:`, err)
    return false
  }
}

/**
 * Kompresi dan cropping foto wajah dari video frame atau canvas.
 * - Resolusi maksimal: 320x320 px (sangat tajam untuk identifikasi/audit wajah)
 * - Format: WebP kualitas 0.55 (fallback ke JPEG 0.60 jika WebP tidak didukung)
 * - Ukuran output: ~12KB - 25KB (jauh di bawah 50KB, hemat storage & bandwidth)
 *
 * @param {HTMLVideoElement|HTMLCanvasElement|string} source
 * @param {{ x: number, y: number, width: number, height: number }|null} [detectionBox]
 * @param {object} [options]
 * @param {number} [options.maxDimension=320]
 * @param {number} [options.quality=0.55]
 * @param {number} [options.padding=20]
 * @returns {Promise<{ blob: Blob, dataUrl: string, width: number, height: number, sizeKb: number }|null>}
 */
export async function compressFaceSnapshot(source, detectionBox = null, options = {}) {
  if (typeof window === 'undefined') return null
  if (!source) return null

  const maxDimension = options.maxDimension || 320
  const quality = options.quality ?? 0.55
  const padding = options.padding ?? 20

  try {
    let srcCanvas
    let cropX = 0
    let cropY = 0
    let cropW = 0
    let cropH = 0

    if (typeof source === 'string') {
      // Input sudah berupa data URL
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = source
      })
      srcCanvas = document.createElement('canvas')
      srcCanvas.width = img.naturalWidth || img.width
      srcCanvas.height = img.naturalHeight || img.height
      const ctx = srcCanvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      cropW = srcCanvas.width
      cropH = srcCanvas.height
    } else if (source instanceof HTMLVideoElement) {
      const vWidth = source.videoWidth || 640
      const vHeight = source.videoHeight || 480
      if (!vWidth || !vHeight) return null

      srcCanvas = document.createElement('canvas')
      srcCanvas.width = vWidth
      srcCanvas.height = vHeight
      const ctx = srcCanvas.getContext('2d')
      ctx.drawImage(source, 0, 0, vWidth, vHeight)

      if (detectionBox && detectionBox.width > 0 && detectionBox.height > 0) {
        // Crop area wajah dengan padding aman
        cropX = Math.max(0, Math.floor(detectionBox.x - padding))
        cropY = Math.max(0, Math.floor(detectionBox.y - padding))
        cropW = Math.min(vWidth - cropX, Math.floor(detectionBox.width + padding * 2))
        cropH = Math.min(vHeight - cropY, Math.floor(detectionBox.height + padding * 2))
      } else {
        // Center crop bujur sangkar dari kamera jika tidak ada kotak wajah spesifik
        const size = Math.min(vWidth, vHeight)
        cropX = Math.floor((vWidth - size) / 2)
        cropY = Math.floor((vHeight - size) / 2)
        cropW = size
        cropH = size
      }
    } else if (source instanceof HTMLCanvasElement) {
      srcCanvas = source
      cropW = source.width
      cropH = source.height
      if (detectionBox) {
        cropX = Math.max(0, Math.floor(detectionBox.x - padding))
        cropY = Math.max(0, Math.floor(detectionBox.y - padding))
        cropW = Math.min(source.width - cropX, Math.floor(detectionBox.width + padding * 2))
        cropH = Math.min(source.height - cropY, Math.floor(detectionBox.height + padding * 2))
      }
    } else {
      return null
    }

    if (!srcCanvas || cropW <= 0 || cropH <= 0) return null

    // Hitung skala penurunan ukuran agar dimensi maksimum <= maxDimension (320px)
    const scale = Math.min(1, maxDimension / Math.max(cropW, cropH))
    const targetW = Math.max(1, Math.round(cropW * scale))
    const targetH = Math.max(1, Math.round(cropH * scale))

    const targetCanvas = document.createElement('canvas')
    targetCanvas.width = targetW
    targetCanvas.height = targetH
    const targetCtx = targetCanvas.getContext('2d')
    if (!targetCtx) return null

    targetCtx.imageSmoothingEnabled = true
    targetCtx.imageSmoothingQuality = 'high'
    targetCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH)

    // Kompresi ke format WebP (efisiensi tinggi) dengan fallback JPEG
    let dataUrl = targetCanvas.toDataURL('image/webp', quality)
    let mime = 'image/webp'

    if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/webp')) {
      dataUrl = targetCanvas.toDataURL('image/jpeg', 0.60)
      mime = 'image/jpeg'
    }

    const blob = dataUrlToBlob(dataUrl)
    const sizeKb = Number((blob.size / 1024).toFixed(2))

    return {
      blob,
      dataUrl,
      width: targetW,
      height: targetH,
      sizeKb,
    }
  } catch (err) {
    console.warn('[AttendancePhoto] Kesalahan kompresi foto scan wajah:', err)
    return null
  }
}

/**
 * Upload foto scan wajah presensi (datang / pulang) ke Supabase Storage.
 *
 * Struktur terorganisir per unit & tanggal:
 *   [bucket: presensi-tk | presensi-sd | presensi-smp | presensi-sma]
 *     └── [masuk | pulang]
 *           └── [YYYY-MM-DD]
 *                 └── [NIY]_[HHMMSS].webp
 *
 * @param {object} params
 * @param {object} params.staff - data staff { id, niy, name, unitId }
 * @param {string} [params.unitId] - id unit ('tk', 'sd', 'smp', 'sma')
 * @param {'masuk'|'pulang'} [params.type='masuk'] - jenis presensi (datang / pulang)
 * @param {HTMLVideoElement|HTMLCanvasElement|string} params.imageSource - sumber gambar (video kamera / canvas)
 * @param {{ x: number, y: number, width: number, height: number }|null} [params.detectionBox] - box wajah face-api
 * @param {Date} [params.date] - waktu presensi
 * @returns {Promise<{ url: string|null, bucket: string, path: string, sizeKb?: number }>}
 */
export async function uploadAttendanceFacePhoto({
  staff,
  unitId,
  type = 'masuk',
  imageSource,
  detectionBox = null,
  date = new Date(),
}) {
  if (!staff || !imageSource) {
    return { url: null, bucket: '', path: '' }
  }

  // 1. Tentukan target unit & bucket
  const targetUnit = unitId || staff.unitId || 'sd'
  const targetBucket = getUnitAttendanceBucket(targetUnit)

  // 2. Kompresi gambar menjadi WebP ringan (< 30KB)
  const compressed = await compressFaceSnapshot(imageSource, detectionBox, {
    maxDimension: 320,
    quality: 0.55,
  })

  if (!compressed || !compressed.blob) {
    console.warn('[AttendancePhoto] Kompresi gagal, foto bukti tidak dapat diunggah.')
    return { url: null, bucket: targetBucket, path: '' }
  }

  // 3. Bangun path file terstruktur: [tipe]/[YYYY-MM-DD]/[NIY]_[HHMMSS].webp
  const dateSlug = getLocalDateString(date)
  const timeSlug = getLocalTimeString(date)
  const niyClean = String(staff.niy || staff.id || 'pegawai').replace(/[^a-zA-Z0-9_-]/g, '')
  const ext = compressed.blob.type.includes('webp') ? 'webp' : 'jpg'
  const filePath = `${type}/${dateSlug}/${niyClean}_${timeSlug}.${ext}`

  if (!isSupabaseConfigured || !supabase) {
    console.info(`[AttendancePhoto] Supabase offline, foto scan wajah (${compressed.sizeKb} KB) disimpan via DataURL.`)
    return {
      url: compressed.dataUrl,
      bucket: targetBucket,
      path: filePath,
      sizeKb: compressed.sizeKb,
    }
  }

  try {
    // 4. Pastikan bucket unit sudah ada
    await ensureAttendanceBucket(targetBucket)

    // 5. Upload ke bucket unit
    let uploadBucket = targetBucket
    let uploadPath = filePath

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(uploadBucket)
      .upload(uploadPath, compressed.blob, {
        contentType: compressed.blob.type,
        cacheControl: '86400',
        upsert: false,
      })

    // Fallback jika bucket unit memiliki kendala izin: coba bucket default 'face-snapshots'
    if (uploadErr) {
      console.warn(`[AttendancePhoto] Upload ke ${targetBucket} gagal (${uploadErr.message}), mencoba fallback ke face-snapshots...`)
      uploadBucket = UNIT_ATTENDANCE_BUCKETS.default
      uploadPath = `${targetUnit}/${filePath}`
      await ensureAttendanceBucket(uploadBucket)
      const { data: fbData, error: fbErr } = await supabase.storage
        .from(uploadBucket)
        .upload(uploadPath, compressed.blob, {
          contentType: compressed.blob.type,
          cacheControl: '86400',
          upsert: false,
        })
      if (fbErr) {
        console.warn(`[AttendancePhoto] Fallback upload juga gagal:`, fbErr.message)
        return {
          url: compressed.dataUrl, // Gunakan base64 lokal sebagai fallback aman
          bucket: targetBucket,
          path: filePath,
          sizeKb: compressed.sizeKb,
        }
      }
    }

    // 6. Ambil URL publik foto
    const { data: urlData } = supabase.storage
      .from(uploadBucket)
      .getPublicUrl(uploadPath)

    const finalUrl = urlData?.publicUrl || compressed.dataUrl

    console.info(
      `[AttendancePhoto] Foto scan wajah ${type} (${staff.name} - ${staff.niy}) berhasil terupload ke '${uploadBucket}/${uploadPath}' [${compressed.sizeKb} KB]`,
    )

    return {
      url: finalUrl,
      bucket: uploadBucket,
      path: uploadPath,
      sizeKb: compressed.sizeKb,
    }
  } catch (err) {
    console.warn('[AttendancePhoto] Exception saat upload foto presensi:', err)
    return {
      url: compressed.dataUrl,
      bucket: targetBucket,
      path: filePath,
      sizeKb: compressed.sizeKb,
    }
  }
}

/**
 * Simpan / perbarui rekam presensi ke tabel 'public.attendance' di Supabase.
 * Menyimpan tautan foto scan wajah datang dan pulang secara idempotent.
 *
 * @param {object} params
 * @param {object} params.staff - data staff { id, niy, unitId }
 * @param {string} params.unitId - id unit
 * @param {Date} params.tanggal - objek tanggal presensi
 * @param {string} [params.jamMasuk] - jam masuk (HH:MM:SS)
 * @param {string} [params.jamPulang] - jam pulang (HH:MM:SS)
 * @param {string} [params.status] - status presensi ('Tepat Waktu' / 'Terlambat')
 * @param {number} [params.lateMinutes] - menit keterlambatan
 * @param {string} [params.method] - 'Face Recognition' / 'QR Code'
 * @param {string} [params.faceSnapshotUrl] - URL foto scan wajah (datang atau default)
 * @param {string} [params.faceSnapshotPulangUrl] - URL foto scan wajah (pulang)
 * @param {number} [params.faceConfidence] - skor kecocokan biometrik
 * @param {string} [params.photoBucket] - bucket unit penyimpanan
 * @param {object} [params.coordinates] - { latitude, longitude, distance, outsideRadius }
 * @returns {Promise<boolean>}
 */
export async function syncAttendanceToSupabase({
  staff,
  unitId,
  tanggal = new Date(),
  jamMasuk = null,
  jamPulang = null,
  status = 'Tepat Waktu',
  lateMinutes = 0,
  method = 'Face Recognition',
  faceSnapshotUrl = null,
  faceSnapshotPulangUrl = null,
  faceConfidence = null,
  photoBucket = null,
  coordinates = {},
}) {
  if (!isSupabaseConfigured || !supabase || !staff?.id) return false

  try {
    const targetUnit = unitId || staff.unitId || 'sd'
    const dateStr = getLocalDateString(tanggal)
    const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(tanggal)

    const payload = {
      staff_id: staff.id,
      unit_id: targetUnit,
      tanggal: dateStr,
      hari,
      status,
      late_minutes: lateMinutes || 0,
      method,
      updated_at: new Date().toISOString(),
    }

    if (jamMasuk) payload.jam_masuk = jamMasuk
    if (jamPulang) payload.jam_pulang = jamPulang
    if (faceSnapshotUrl) {
      payload.face_snapshot_url = faceSnapshotUrl
      payload.face_snapshot_masuk_url = faceSnapshotUrl
    }
    if (faceSnapshotPulangUrl) {
      payload.face_snapshot_pulang_url = faceSnapshotPulangUrl
    }
    if (faceConfidence !== null && faceConfidence !== undefined) {
      if (jamMasuk && !jamPulang) payload.face_confidence_masuk = faceConfidence
      if (jamPulang) payload.face_confidence_pulang = faceConfidence
      payload.face_confidence = faceConfidence
    }
    if (photoBucket) {
      payload.photo_bucket = photoBucket
    }
    if (coordinates.latitude) payload.latitude = coordinates.latitude
    if (coordinates.longitude) payload.longitude = coordinates.longitude
    if (coordinates.distance !== undefined) payload.distance_meters = coordinates.distance
    if (coordinates.outsideRadius !== undefined) payload.outside_radius = coordinates.outsideRadius

    const { error } = await supabase.from('attendance').upsert(payload, {
      onConflict: 'staff_id,tanggal',
    })

    if (error) {
      console.warn('[AttendancePhoto] Sinkronisasi baris attendance Supabase gagal:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn('[AttendancePhoto] Exception sinkronisasi attendance:', err)
    return false
  }
}

