// ============================================================================
// VERIFIKASI END-TO-END PIPELINE FACE RECOGNITION (Browser + face-api.js)
// ----------------------------------------------------------------------------
// Menguji alur yang sesungguhnya dipakai aplikasi, memakai foto wajah nyata:
//
//   1. Deteksi wajah + landmark + descriptor di browser (model sungguhan).
//   2. Analisis pose (depan / samping) pada landmark nyata.
//   3. Pendaftaran -> descriptor tersimpan -> dibaca lagi sebagai acuan.
//   4. Scan presensi: wajah yang sama harus COCOK, wajah berbeda harus
//      DITOLAK (jarak Euclidean > threshold).
//   5. Rata-rata beberapa descriptor tetap cocok sebagai acuan.
//   6. Kotak deteksi berada pada ruang koordinat piksel gambar asli.
// ============================================================================

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const FIXTURE_DIR = path.join(root, 'node_modules', '@vladmandic', 'face-api', 'demo')
const BASE_URL = process.env.FACE_VERIFY_URL || 'http://localhost:5174'

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

const tersedia = [1, 2, 3, 4, 5, 6]
  .map((i) => ({ i, file: path.join(FIXTURE_DIR, `sample${i}.jpg`) }))
  .filter((f) => existsSync(f.file))

if (!tersedia.length) {
  console.error('Tidak ada fixture wajah untuk diuji.')
  process.exit(1)
}

// Chromium penuh (bukan headless-shell) dipakai karena driver headless-shell
// tidak tersedia di lingkungan ini.
const CHROMIUM = process.env.CHROMIUM_PATH
  || 'C:\\Users\\iif\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe'

const browser = await chromium.launch({
  executablePath: existsSync(CHROMIUM) ? CHROMIUM : undefined,
  headless: true,
})
const page = await browser.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.error('  [browser]', m.text())
})

// Sajikan fixture foto lewat route agar tidak perlu menaruh berkas di public/.
for (const f of tersedia) {
  await page.route(`**/fixture/sample${f.i}.jpg`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/jpeg', body: readFileSync(f.file) }),
  )
}

try {
  await page.goto(`${BASE_URL}/tmp/face-verify.html`, { waitUntil: 'networkidle' })
} catch (err) {
  console.error(`Tidak dapat terhubung ke ${BASE_URL}. Pastikan dev server berjalan (misal: npm run dev di port 5174).`, err.message)
  await browser.close()
  process.exit(1)
}
await page.waitForFunction(() => window.__ready === true, { timeout: 30000 })

// Muat model face-api dari /models/face-api (sama seperti aplikasi).
const modelSiap = await page.evaluate(async () => {
  await window.__svc.loadFaceApiModels()
  return window.__svc.isFaceApiLoaded()
})
uji('Model face-api berhasil dimuat di browser', modelSiap === true)

// Deteksi wajah pada setiap fixture: kumpulkan descriptor + landmark + kotak.
const hasil = await page.evaluate(async (daftar) => {
  const out = []
  for (const nomor of daftar) {
    const img = new Image()
    img.src = `/fixture/sample${nomor}.jpg`
    await img.decode()

    const landmarksOnly = await window.__svc.detectSingleFaceWithLandmarks(img, {
      inputSize: 320,
      scoreThreshold: 0.3,
    })
    const lengkap = await window.__svc.detectSingleFaceAndDescriptor(img, {
      inputSize: 320,
      scoreThreshold: 0.3,
    })

    out.push({
      nomor,
      lebarGambar: img.naturalWidth,
      tinggiGambar: img.naturalHeight,
      terdeteksi: lengkap.detected,
      skor: lengkap.score,
      panjangDescriptor: lengkap.descriptor?.length ?? 0,
      descriptor: lengkap.descriptor,
      landmarks: landmarksOnly.landmarks,
      box: lengkap.box,
      pose: landmarksOnly.landmarks
        ? window.__live.analyzeFacePose(landmarksOnly.landmarks)
        : null,
      ear: landmarksOnly.landmarks ? window.__live.hitungEAR(landmarksOnly.landmarks) : null,
      smile: landmarksOnly.landmarks ? window.__live.hitungSmileScore(landmarksOnly.landmarks) : null,
    })
  }
  return out
}, tersedia.map((f) => f.i))

console.log('\nHASIL DETEKSI PER FIXTURE')
for (const h of hasil) {
  console.log(
    `  sample${h.nomor}: terdeteksi=${h.terdeteksi} skor=${h.skor?.toFixed(3)} ` +
    `deskriptor=${h.panjangDescriptor}d pose=${h.pose?.valid ? `${h.pose.arah}(frontal=${h.pose.frontal}, side=${h.pose.side})` : 'tidak valid'} ` +
    `EAR=${h.ear?.toFixed(3)} Senyum=${h.smile?.valid ? `${(h.smile.score * 100).toFixed(0)}%(isSmiling=${h.smile.isSmiling})` : 'tidak valid'}`,
  )
}
console.log('')

const terdeteksi = hasil.filter((h) => h.terdeteksi && h.panjangDescriptor === 128)

uji('Wajah terdeteksi pada fixture foto', terdeteksi.length > 0, `${terdeteksi.length} dari ${hasil.length}`)
if (!terdeteksi.length) {
  console.log('='.repeat(80))
  console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
  await browser.close()
  process.exit(1)
}
uji('Descriptor selalu berukuran 128 dimensi', hasil.every((h) => h.panjangDescriptor === 128 || h.panjangDescriptor === 0))
uji('Landmark 68 titik tersedia untuk analisis pose', terdeteksi.every((h) => h.landmarks?.length === 68))
uji('Analisis pose valid pada landmark nyata', terdeteksi.every((h) => h.pose?.valid === true))
uji('EAR terbaca pada landmark nyata', terdeteksi.every((h) => typeof h.ear === 'number' && h.ear > 0))
uji('Kalkulasi senyuman terbaca pada landmark nyata', terdeteksi.every((h) => h.smile?.valid === true && typeof h.smile.score === 'number'))

// --- Kotak deteksi harus berada di ruang piksel gambar asli -----------------
const kotakDalamBatas = hasil.filter((h) => h.box).every((h) =>
  h.box.x >= -1 &&
  h.box.y >= -1 &&
  h.box.x + h.box.width <= h.lebarGambar + 2 &&
  h.box.y + h.box.height <= h.tinggiGambar + 2,
)
uji('Kotak deteksi berada dalam batas piksel gambar asli (tidak diskalakan keliru)', kotakDalamBatas)

// --- Pendaftaran: descriptor tersimpan & terbaca sebagai acuan --------------
const pendaftaran = await page.evaluate(async (target) => {
  const staff = { id: 999, niy: 'UJI-001', name: 'Pegawai Uji' }
  const record = window.__svc.saveRegisteredFaceData({
    staff,
    descriptor: target.descriptor,
    photo: null,
  })
  const dibaca = window.__svc.getRegisteredFaceData(staff)
  return {
    tersimpan: Boolean(record),
    panjangTersimpan: record?.descriptor?.length ?? 0,
    terbaca: Boolean(dibaca),
    panjangDibaca: dibaca?.descriptor?.length ?? 0,
    deskriptor: dibaca?.descriptor ?? null,
  }
}, terdeteksi[0])

uji('Pendaftaran wajah menyimpan descriptor 128-d', pendaftaran.tersimpan && pendaftaran.panjangTersimpan === 128)
uji('Descriptor pendaftaran terbaca kembali dari storage', pendaftaran.terbaca && pendaftaran.panjangDibaca === 128)

// --- Scan presensi: wajah yang sama harus cocok ------------------------------
const scan = await page.evaluate(async (daftar) => {
  const svc = window.__svc
  const acuan = daftar[0].descriptor
  const hasilBanding = []
  for (const d of daftar) {
    const banding = await svc.compareFaceDescriptors(d.descriptor, acuan)
    hasilBanding.push({
      nomor: d.nomor,
      match: banding.match,
      distance: banding.distance,
      confidence: banding.confidence,
    })
  }
  return hasilBanding
}, terdeteksi)

console.log('HASIL PEMBANDINGAN SCAN (acuan = sample pertama yang terdeteksi)')
for (const b of scan) {
  console.log(`  sample${b.nomor}: match=${b.match} jarak=${b.distance} keyakinan=${b.confidence}%`)
}
console.log('')

const scanSendiri = scan.find((b) => b.nomor === terdeteksi[0].nomor)
uji('Scan wajah yang sama menghasilkan kecocokan', scanSendiri?.match === true, `jarak=${scanSendiri?.distance}`)
uji('Keyakinan kecocokan wajah sendiri di atas 70%', (scanSendiri?.confidence ?? 0) >= 70)

// sample1 dan sample2 berasal dari pemotretan yang sama (orang yang sama),
// menguji kemampuan mengenali orang yang sama pada tangkapan foto berbeda.
const scanSamaLainFoto = scan.find((b) => b.nomor === 2)
if (scanSamaLainFoto) {
  uji('Foto berbeda dari orang yang sama terdeteksi cocok (cross-photo)', scanSamaLainFoto.match === true, `jarak=${scanSamaLainFoto.distance}`)
}

// sample3..6 adalah individu berbeda, sehingga wajib ditolak (jarak > threshold).
const scanOrangLain = scan.filter((b) => b.nomor >= 3)
if (scanOrangLain.length) {
  const ditolakSemua = scanOrangLain.every((b) => b.match === false)
  uji('Wajah dari orang berbeda ditolak (tidak lolos sebagai orang yang sama)', ditolakSemua,
    scanOrangLain.map((b) => `s${b.nomor}:match=${b.match}/jarak=${b.distance}`).join(' | '))
}

// --- Rata-rata descriptor tetap sebagai acuan yang valid --------------------
const rata = await page.evaluate(async (daftar) => {
  const svc = window.__svc
  const acuan = daftar[0].descriptor
  const variasinya = daftar.map((d) => d.descriptor)
  const merged = svc.averageFaceDescriptors(variasinya)
  if (!merged) return { ok: false }
  const banding = await svc.compareFaceDescriptors(daftar[0].descriptor, merged)
  return { ok: true, panjang: merged.length, match: banding.match, distance: banding.distance }
}, terdeteksi)

uji('Rata-rata descriptor menghasilkan vektor 128-d', rata.ok && rata.panjang === 128)
uji('Vektor rata-rata tetap cocok sebagai acuan scan', rata.ok && rata.match === true, `jarak=${rata.distance}`)

// --- Alur pendaftaran:descriptor dari frontal -> pencocokan di scan ---------
const alurLengkap = await page.evaluate(async (daftar) => {
  const svc = window.__svc
  const live = window.__live
  const staff = { id: 998, niy: 'UJI-002', name: 'Pegawai Uji 2' }

  // Simulasikan langkah 1 pendaftaran: ambil descriptor dari beberapa frame
  // wajah menghadap depan lalu rata-ratakan.
  const kandidat = daftar
    .filter((d) => d.pose?.frontal)
    .map((d) => d.descriptor)
  if (!kandidat.length) return { ok: false, alasan: 'tidak ada fixture menghadap depan' }

  const acuan = svc.averageFaceDescriptors(kandidat)
  const record = svc.saveRegisteredFaceData({ staff, descriptor: acuan, photo: null })

  // Scan: bandingkan foto yang SAMA dan foto yang BERBEDA.
  const sama = await svc.compareFaceDescriptors(kandidat[0], acuan)
  const beda = daftar
    .filter((d) => !d.pose?.frontal)
    .map((d) => d.descriptor)[0]
  const lain = beda ? await svc.compareFaceDescriptors(beda, acuan) : null

  return {
    ok: true,
    acuanPanjang: acuan.length,
    tersimpan: record?.descriptor?.length === 128,
    samaMatch: sama.match,
    samaJarak: sama.distance,
    lainMatch: lain ? lain.match : null,
    lainJarak: lain ? lain.distance : null,
    poseValid: live.analyzeFacePose(daftar[0].landmarks).valid,
  }
}, terdeteksi)

uji('Alur pendaftaran menyimpan acuan 128-d', alurLengkap.ok && alurLengkap.acuanPanjang === 128 && alurLengkap.tersimpan)
uji('Scan wajah terdaftar menghasilkan kecocokan', alurLengkap.ok && alurLengkap.samaMatch === true, `jarak=${alurLengkap.samaJarak}`)
if (alurLengkap.lainMatch !== null) {
  uji('Scan wajah yang tidak terdaftar ditolak', alurLengkap.lainMatch === false, `jarak=${alurLengkap.lainJarak}`)
}

await browser.close()

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)
if (gagal > 0) process.exit(1)
console.log('\nSELURUH VERIFIKASI PIPELINE FACE RECOGNITION LULUS\n')
