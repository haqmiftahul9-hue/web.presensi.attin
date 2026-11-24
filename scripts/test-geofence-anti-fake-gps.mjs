/**
 * AUTOMATED TEST SUITE: GEOFENCE ACCURACY, SUPERADMIN RADIUS & ANTI-FAKE GPS
 * SIMPRES ATTIN SUMBAR
 */

import assert from 'node:assert/strict'
import {
  checkIsMockProvider,
  checkAccuracyAnomaly,
  checkTeleportation,
  checkStaticJitterAnomaly,
  hitungJarakMeter,
  inspectGeolocationSecurity,
} from '../src/services/antiFakeGpsService.js'
import { getUnitEffectiveRadius, jarakMeter } from '../src/data/presensiMobile.js'

console.log('================================================================================')
console.log('UJI AKURASI GEOFENCE, RADIUS SUPERADMIN & DETEKSI ANTI-FAKE GPS')
console.log('================================================================================\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ LULUS: ${name}`)
    passCount++
  } catch (err) {
    console.error(`❌ GAGAL: ${name}`)
    console.error(`   ${err.message}`)
    failCount++
  }
}

// ------------------------------------------------------------------------------
// BAGIAN 1: UJI RUMUS HAVERSINE & AKURASI RADIUS
// ------------------------------------------------------------------------------
console.log('--- 1. Uji Akurasi Jarak Haversine & Radius ---')

const TITIK_SD_ATTIN = { latitude: -6.28955, longitude: 106.79244 }

test('Jarak ke titik koordinat yang sama persis bernilai 0 meter', () => {
  const d = hitungJarakMeter(TITIK_SD_ATTIN.latitude, TITIK_SD_ATTIN.longitude, TITIK_SD_ATTIN.latitude, TITIK_SD_ATTIN.longitude)
  assert.equal(d, 0)
  const d2 = jarakMeter(TITIK_SD_ATTIN.latitude, TITIK_SD_ATTIN.longitude, TITIK_SD_ATTIN.latitude, TITIK_SD_ATTIN.longitude)
  assert.equal(d2, 0)
})

test('Jarak Haversine pada pergeseran ~50 meter terukur akurat', () => {
  // 0.00045 derajat lintang kira-kira ~50 meter
  const latPindah = TITIK_SD_ATTIN.latitude + 0.00045
  const d = hitungJarakMeter(TITIK_SD_ATTIN.latitude, TITIK_SD_ATTIN.longitude, latPindah, TITIK_SD_ATTIN.longitude)
  assert.ok(d >= 48 && d <= 52, `Jarak terhitung ${d}m harus berada di kisaran ~50m`)
})

test('Koordinat tidak valid menghasilkan nilai aman 0 atau null', () => {
  assert.equal(hitungJarakMeter(null, undefined, 10, 20), 0)
  assert.equal(jarakMeter(null, undefined, 10, 20), null)
})

// ------------------------------------------------------------------------------
// BAGIAN 2: UJI KEAMANAN DETEKSI ANTI-FAKE GPS
// ------------------------------------------------------------------------------
console.log('\n--- 2. Uji Detektor Anti-Fake GPS Multi-Layer ---')

test('Deteksi flag isMock dari Android / Mock Location Provider', () => {
  const mockPos = {
    coords: { latitude: -6.28955, longitude: 106.79244, accuracy: 10, isMock: true },
  }
  const res = checkIsMockProvider(mockPos)
  assert.equal(res.detected, true)
  assert.ok(res.reason.includes('mock location'))
})

test('Deteksi akurasi palsu buatan (0m atau minus)', () => {
  const zeroAcc = checkAccuracyAnomaly(0)
  assert.equal(zeroAcc.detected, true)

  const negAcc = checkAccuracyAnomaly(-5)
  assert.equal(negAcc.detected, true)

  const normalAcc = checkAccuracyAnomaly(12.4)
  assert.equal(normalAcc.detected, false)
})

test('Deteksi teleportasi mustahil (kecepatan > 150 km/jam)', () => {
  const t0 = Date.now()
  const posA = { latitude: -6.28955, longitude: 106.79244, timestamp: t0 }
  // Pindah sejauh ~2.5 km dalam 5 detik (~1800 km/jam)
  const posB = { latitude: -6.26700, longitude: 106.79244, timestamp: t0 + 5000 }

  const tele = checkTeleportation(posA, posB)
  assert.equal(tele.detected, true)
  assert.ok(tele.reason.includes('Lonjakan perpindahan lokasi mustahil'))
})

test('Perpindahan wajar pejalan kaki tidak terdeteksi sebagai teleportasi', () => {
  const t0 = Date.now()
  const posA = { latitude: -6.28955, longitude: 106.79244, timestamp: t0 }
  // Jalan 15 meter dalam 10 detik (~1.5 m/s)
  const posB = { latitude: -6.28955 + 0.000135, longitude: 106.79244, timestamp: t0 + 10000 }

  const tele = checkTeleportation(posA, posB)
  assert.equal(tele.detected, false)
})

test('Deteksi koordinat statis 100% tanpa fluktuasi satelit (Zero Jitter Anomaly)', () => {
  const history = [
    { latitude: -6.28955, longitude: 106.79244, accuracy: 10 },
    { latitude: -6.28955, longitude: 106.79244, accuracy: 10 },
    { latitude: -6.28955, longitude: 106.79244, accuracy: 10 },
    { latitude: -6.28955, longitude: 106.79244, accuracy: 10 },
  ]
  const jitterRes = checkStaticJitterAnomaly(history)
  assert.equal(jitterRes.detected, true)
  assert.ok(jitterRes.reason.includes('zero jitter anomaly'))
})

test('Satelit alami dengan getaran desimal mikro tidak terdeteksi anomali', () => {
  const naturalHistory = [
    { latitude: -6.289551, longitude: 106.792442, accuracy: 8.5 },
    { latitude: -6.289553, longitude: 106.792440, accuracy: 9.1 },
    { latitude: -6.289549, longitude: 106.792444, accuracy: 8.2 },
    { latitude: -6.289552, longitude: 106.792441, accuracy: 8.8 },
  ]
  const jitterRes = checkStaticJitterAnomaly(naturalHistory)
  assert.equal(jitterRes.detected, false)
})

test('Pipeline inspectGeolocationSecurity meloloskan koordinat satelit sah', () => {
  const genuinePos = {
    coords: {
      latitude: -6.28955,
      longitude: 106.79244,
      accuracy: 9.4,
    },
    timestamp: Date.now(),
  }
  const sec = inspectGeolocationSecurity(genuinePos, { strictMode: false })
  assert.equal(sec.isFake, false)
  assert.equal(sec.reason, null)
  assert.equal(sec.quality, 'sangat_baik')
})

test('Pipeline inspectGeolocationSecurity menolak objek tanpa koordinat', () => {
  const invalid = inspectGeolocationSecurity(null)
  assert.equal(invalid.isFake, true)
  assert.ok(invalid.reason.includes('tidak valid'))
})

// ------------------------------------------------------------------------------
// BAGIAN 3: UJI SINGLE SOURCE OF TRUTH RADIUS SUPERADMIN
// ------------------------------------------------------------------------------
console.log('\n--- 3. Uji Konsistensi Pengaturan Radius Superadmin ---')

test('Radius unit ditentukan secara benar oleh getUnitEffectiveRadius', () => {
  const unitSD = { id: 'sd', radius: 75 }
  const settings = {
    presensi: {
      radiusGeofenceDefault: 50,
      radiusGeofencePerUnit: { tk: 50, sd: 75, smp: 60, sma: 80 },
    },
  }

  // Unit dengan radius langsung
  assert.equal(getUnitEffectiveRadius(unitSD, settings), 75)

  // Unit baru tanpa radius spesifik memakai override per unit
  const unitSMP = { id: 'smp' }
  assert.equal(getUnitEffectiveRadius(unitSMP, settings), 60)

  // Unit tanpa override memakai default global
  const unitBaru = { id: 'asrama' }
  assert.equal(getUnitEffectiveRadius(unitBaru, settings), 50)

  // Fallback tanpa settings sama sekali
  assert.equal(getUnitEffectiveRadius(null, null), 50)
})

console.log('\n================================================================================')
console.log(`Total Pengujian: ${passCount + failCount}  |  Lulus: ${passCount}  |  Gagal: ${failCount}`)
console.log('================================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('SELURUH SKENARIO GEOFENCE & ANTI-FAKE GPS BERHASIL DIVERIFIKASI 100%')
}
