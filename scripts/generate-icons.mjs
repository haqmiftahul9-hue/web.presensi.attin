// Generator ikon PWA SimPres.
//
// Ikon digambar dari nol (tanpa dependensi gambar) lalu ditulis sebagai PNG
// lewat encoder PNG minimal di bawah — memakai zlib bawaan Node. Motifnya
// cincin "pemindaian" (finger-scan) dengan latar navy, sesuai tema aplikasi.
//
// Jalankan: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/icons')

const NAVY = [0x0b, 0x1f, 0x3d]
const NAVY_MUDA = [0x16, 0x35, 0x63]
const PUTIH = [0xff, 0xff, 0xff]
const HIJAU = [0x34, 0xd3, 0x99]

// ---------------------------------------------------------------------------
// Encoder PNG (RGBA, 8 bit, filter 0)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const panjang = Buffer.alloc(4)
  panjang.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([panjang, body, crc])
}

/** rows: array Uint8Array (RGJS panjang width*4). */
function tulisPng(width, height, rows) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  rows.forEach((row, y) => {
    raw[y * (width * 4 + 1)] = 0 // filter none
    Buffer.from(row).copy(raw, y * (width * 4 + 1) + 1)
  })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Motif ikon
// ---------------------------------------------------------------------------
function campur(kentang, warna, alpha) {
  return [
    Math.round(kentang[0] * (1 - alpha) + warna[0] * alpha),
    Math.round(kentang[1] * (1 - alpha) + warna[1] * alpha),
    Math.round(kentang[2] * (1 - alpha) + warna[2] * alpha),
  ]
}

/**
 * @param size ukuran sisi (px)
 * @param paddingProporsi ruang aman untuk ikon maskable (0 = penuh)
 */
function gambarIkon(size, paddingProporsi = 0) {
  const rows = []
  const pad = size * paddingProporsi
  const area = size - pad * 2
  const radius = area * (paddingProporsi > 0 ? 0.5 : 0.22) // maskable = lingkaran
  const tengah = size / 2

  for (let y = 0; y < size; y += 1) {
    const row = new Uint8Array(size * 4)
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5

      // Bentuk kapsul: di dalam kotak dengan radius, di luar = transparan.
      const dx = Math.max(pad + radius - px, px - (size - pad - radius), 0)
      const dy = Math.max(pad + radius - py, py - (size - pad - radius), 0)
      const jarakSudut = Math.hypot(dx, dy)
      const dalam = jarakSudut <= radius

      if (!dalam) {
        const i = x * 4
        row[i] = 0
        row[i + 1] = 0
        row[i + 2] = 0
        row[i + 3] = 0
        continue
      }

      // Latar navy dengan gradasi halus dari kiri-atas ke kanan-bawah.
      const t = (px / size + py / size) / 2
      let warna = campur(NAVY, NAVY_MUDA, t * 0.85)

      // Cincin pemindaian (finger-scan) mengelilingi titik tengah.
      const r = Math.hypot(px - tengah, py - tengah) / (area / 2)
      const cincin = 0.16
      const tebal = 0.075
      const pola = (r % cincin) / cincin
      const diCincin = pola < tebal && r > 0.12 && r < 0.98

      // Titik pusat + cincin kecil: melambangkan titik presensi.
      const titikPusat = r < 0.1
      const cincinPusat = Math.abs(r - 0.16) < 0.02

      if (titikPusat) {
        warna = HIJAU
      } else if (diCincin || cincinPusat) {
        warna = campur(warna, PUTIH, 0.95)
      }

      const i = x * 4
      row[i] = warna[0]
      row[i + 1] = warna[1]
      row[i + 2] = warna[2]
      row[i + 3] = 255
    }
    rows.push(row)
  }
  return rows
}

/** Favicon: motif sama tanpa padding, lebih rapat. */
function gambarFavicon(size) {
  const rows = gambarIkon(size, 0)
  return rows
}

const TARGET = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.12],
  ['apple-touch-icon.png', 180, 0.06],
  ['favicon-32.png', 32, 0],
]

mkdirSync(OUT, { recursive: true })
for (const [nama, size, pad] of TARGET) {
  const png = tulisPng(size, size, nama === 'favicon-32.png' ? gambarFavicon(size) : gambarIkon(size, pad))
  writeFileSync(resolve(OUT, nama), png)
  console.log(`${nama} (${size}x${size}) ${png.length} byte`)
}

// Versi SVG (dipakai browser yang mendukung, dan sebagai sumber ikon).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SimPres Kepegawaian">
  <defs>
    <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1F3D"/>
      <stop offset="1" stop-color="#163563"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="113" fill="url(#navy)"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" opacity="0.95">
    <circle cx="256" cy="256" r="42"/>
    <path d="M150 256a106 106 0 0 1 21-62"/>
    <path d="M362 256a106 106 0 0 1-21 62"/>
    <path d="M196 256a60 60 0 0 1 120 0"/>
    <path d="M108 256a148 148 0 0 1 29-88"/>
    <path d="M404 256a148 148 0 0 1-29 88"/>
  </g>
  <circle cx="256" cy="256" r="14" fill="#34D399"/>
</svg>
`
writeFileSync(resolve(OUT, 'icon.svg'), svg)
console.log('icon.svg')