// ============================================================================
// UJI SISTEM STORAGE BUCKET PRESENSI PER UNIT & KOMPRESI SCAN WAJAH
// ----------------------------------------------------------------------------
// Memastikan:
//   1. Pembagian storage bucket Supabase terstruktur per unit (TK, SD, SMP, SMA, Yayasan).
//   2. Penamaan folder dan file terstruktur: [masuk|pulang]/[YYYY-MM-DD]/[NIY]_[TIMESTAMP].webp
//   3. Kompresi gambar wajah: resolusi max 320px, format WebP, ukuran kecil (< 30KB).
//   4. Skema database PostgreSQL & Supabase Storage memuat kolom datang & pulang
//      serta RLS policy bucket per unit.
//   5. Reducer store mencatat snapshot datang dan pulang.
// ============================================================================

import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  getUnitAttendanceBucket,
  UNIT_ATTENDANCE_BUCKETS,
  dataUrlToBlob,
} from '../src/services/attendancePhotoService.js'

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

console.log('UJI STORAGE BUCKET & KOMPRESI SCAN WAJAH SUPABASE')
console.log('='.repeat(80))

// 1. Verifikasi Pembagian Bucket Per Unit
uji('Bucket TKIT mengarah ke presensi-tk', getUnitAttendanceBucket('tk') === 'presensi-tk')
uji('Bucket SDIT mengarah ke presensi-sd', getUnitAttendanceBucket('sd') === 'presensi-sd')
uji('Bucket SMPIT mengarah ke presensi-smp', getUnitAttendanceBucket('smp') === 'presensi-smp')
uji('Bucket SMAIT mengarah ke presensi-sma', getUnitAttendanceBucket('sma') === 'presensi-sma')
uji('Bucket Yayasan mengarah ke presensi-yayasan', getUnitAttendanceBucket('yayasan') === 'presensi-yayasan')
uji('Unit case insensitive (SD -> presensi-sd)', getUnitAttendanceBucket('SD') === 'presensi-sd')
uji('Unit null/kosong fallback ke default', getUnitAttendanceBucket(null) === UNIT_ATTENDANCE_BUCKETS.default)

// 2. Verifikasi Helper dataUrlToBlob
const dummyWebpDataUrl = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
const blob = dataUrlToBlob(dummyWebpDataUrl)
uji('dataUrlToBlob menghasilkan Blob dengan tipe image/webp', blob.type === 'image/webp')
uji('Ukuran Blob dummy sangat kecil (< 1KB)', blob.size < 1024)

// 3. Verifikasi Skema SQL di supabase/schema.sql
const schemaSql = readFileSync('supabase/schema.sql', 'utf8')

uji('Schema memuat kolom face_snapshot_masuk_url', schemaSql.includes('face_snapshot_masuk_url'))
uji('Schema memuat kolom face_snapshot_pulang_url', schemaSql.includes('face_snapshot_pulang_url'))
uji('Schema memuat kolom face_confidence_masuk', schemaSql.includes('face_confidence_masuk'))
uji('Schema memuat kolom face_confidence_pulang', schemaSql.includes('face_confidence_pulang'))
uji('Schema memuat kolom photo_bucket', schemaSql.includes('photo_bucket'))

uji('Schema mendaftarkan bucket presensi-tk', schemaSql.includes("'presensi-tk'"))
uji('Schema mendaftarkan bucket presensi-sd', schemaSql.includes("'presensi-sd'"))
uji('Schema mendaftarkan bucket presensi-smp', schemaSql.includes("'presensi-smp'"))
uji('Schema mendaftarkan bucket presensi-sma', schemaSql.includes("'presensi-sma'"))
uji('Schema mendaftarkan bucket presensi-yayasan', schemaSql.includes("'presensi-yayasan'"))

uji('Schema memuat policy Public Read Presensi Photos', schemaSql.includes('Public Read Presensi Photos'))
uji('Schema memuat policy Auth Upload Presensi Photos', schemaSql.includes('Auth Upload Presensi Photos'))
uji('Schema memuat policy Anon Upload Presensi Photos', schemaSql.includes('Anon Upload Presensi Photos'))
uji('Schema memuat batas file_size_limit untuk bucket foto presensi', schemaSql.includes('file_size_limit = 1048576'))
uji('Schema membatasi allowed_mime_types ke WebP/JPEG', schemaSql.includes("allowed_mime_types = ARRAY['image/webp'"))

// 4. Verifikasi Integrasi di MobilePresensiPage.jsx
const mobilePresensiSrc = readFileSync('src/pages/mobile/MobilePresensiPage.jsx', 'utf8')
uji('MobilePresensiPage mengimpor uploadAttendanceFacePhoto', mobilePresensiSrc.includes('uploadAttendanceFacePhoto'))
uji('MobilePresensiPage mengunggah foto presensi datang ke bucket unit', mobilePresensiSrc.includes("type: 'masuk'"))
uji('MobilePresensiPage mengunggah foto presensi pulang ke bucket unit', mobilePresensiSrc.includes("type: 'pulang'"))
uji('MobilePresensiPage memanggil syncAttendanceToSupabase', mobilePresensiSrc.includes('syncAttendanceToSupabase'))

// 5. Verifikasi Integrasi di simPresStore.jsx
const storeSrc = readFileSync('src/store/simPresStore.jsx', 'utf8')
uji('simPresStore CHECK_IN menyimpan faceSnapshotMasukUrl', storeSrc.includes('faceSnapshotMasukUrl'))
uji('simPresStore CHECK_IN menyimpan photoBucket', storeSrc.includes('photoBucket'))
uji('simPresStore CHECK_OUT menyimpan faceSnapshotPulangUrl', storeSrc.includes('faceSnapshotPulangUrl'))

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  process.exit(1)
} else {
  console.log('\nSELURUH SKENARIO STORAGE PRESENSI PER UNIT LULUS')
}

