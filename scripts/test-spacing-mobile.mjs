// ============================================================================
// UJI SISTEM JARAK MODUL MOBILE (GURU/PEGAWAI)
// ----------------------------------------------------------------------------
// Yang diperiksa di sini murni tampilan — tidak menyentuh data, fitur, atau
// aturan bisnis. Fokusnya satu: jarak di dalam kartu mobile selalu ada dan
// konsisten di 320 / 360 / 375 / 390 / 412 / 430px.
//
// Pengukuran diambil dari stylesheet yang benar-benar dipakai aplikasi
// (src/index.css) dan dari className yang benar-benar dipakai komponen, bukan
// dari konvensi atau catatan. Kalau ada kartu yang kembali ke padding 0, atau
// utility padding yang tertimpa oleh `.sp-card`, di sini akan terlihat.
//
// Jalankan: node scripts/test-spacing-mobile.mjs
// ============================================================================

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(62)} ${String(aktual).padEnd(22)} (harapan: ${diharapkan})`)
}

function ujiBenar(nama, kondisi, detail = '') {
  if (kondisi) lulus += 1
  else gagal += 1
  rincian.push(`${kondisi ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` - ${detail}` : ''}`)
}

const LEBAR_LAYAR = [320, 360, 375, 390, 412, 430]
const HALAMAN = [
  'MobileBerandaPage.jsx',
  'MobilePresensiPage.jsx',
  'MobileRiwayatPage.jsx',
  'MobileIzinCutiPage.jsx',
  'MobileKartuIdPage.jsx',
  'MobileQrPage.jsx',
  'MobileProfilPage.jsx',
  'MobileSlipPage.jsx',
]

const css = readFileSync('src/index.css', 'utf8')

// ============================================================================
// 1. DESIGN TOKEN JARAK
// ============================================================================
for (let n = 1; n <= 6; n += 1) {
  const nilai = n * 4
  const ada = new RegExp(`--mobile-space-${n}:\\s*${nilai}px`).test(css)
  ujiBenar(`Token --mobile-space-${n} = ${nilai}px`, ada)
}
ujiBenar('Token padding horizontal kartu', /--mobile-card-pad-inline:/.test(css))
ujiBenar('Token padding vertikal kartu', /--mobile-card-pad-block:/.test(css))
ujiBenar('Token kontrol sentuh (tinggi/radius)', /--mobile-control-h:/.test(css) && /--mobile-control-radius:/.test(css))

// ============================================================================
// 2. KARTU: PADDING TIDAK BOLEH NOL DAN TIDAK BOLEH KALAH DARI UTILITY
// ============================================================================
const kartu = /\.sp-card\s*{([^}]*)}/.exec(css)?.[1] ?? ''
ujiBenar('.sp-card tidak lagi memakai padding: 0', !/padding:\s*0\b/.test(kartu), kartu.replace(/\s+/g, ' ').slice(0, 70))
ujiBenar('.sp-card memakai padding-inline', /padding-inline:\s*var\(--mobile-card-pad-inline\)/.test(kartu))
ujiBenar('.sp-card punya box-sizing: border-box', /box-sizing:\s*border-box/.test(kartu))

// Akar penyebab XPS: `@tailwind utilities` memunculkan utility SEBELUM aturan
// kustom di stylesheet. Kalau `.sp-card` menimpa `padding` (shorthand), setiap
// `p-4` pada kartu ikut hilang — persis gejala "tulisan menempel border".
const posisiUtility = css.indexOf('@tailwind utilities')
const posisiKartu = css.indexOf('.sp-card {')
ujiBenar(
  '.sp-card ditulis setelah @tailwind utilities (cascade benar)',
  posisiKartu > posisiUtility && posisiUtility > 0,
  `utility@${posisiUtility}, kartu@${posisiKartu}`,
)
ujiBenar(
  '.sp-card tidak memakai shorthand padding (tidak menimpa p-*)',
  !/^\s*padding:/m.test(kartu),
)

// Kartu "tempel penuh" (baris menu/accordion) harus punya modifier sendiri,
// kalau tidak divider-nya akan menyentuh sisi kartu.
ujiBenar('.sp-card-flush tersedia', /\.sp-card-flush\s*{[^}]*padding-inline:\s*0/.test(css))
ujiBenar('.sp-card-head tersedia (kepala kartu + divider)', /\.sp-card-head\s*{[^}]*padding-bottom/.test(css))
ujiBenar('.sp-divider tersedia (divider mandiri)', /\.sp-divider\s*{[^}]*height:\s*1px/.test(css))

// ============================================================================
// 3. JARAK KONKRET PADA TIAP LEBAR LAYAR
// ============================================================================

/** Hitung nilai clamp()/min()/max() px|vw|rem seperti yang dilakukan browser. */
function hitungCSS(nilai, lebarViewport) {
  const teks = String(nilai).trim()
  const px = (s) => {
    const t = s.trim()
    if (t.endsWith('px')) return Number.parseFloat(t)
    if (t.endsWith('rem')) return Number.parseFloat(t) * 16
    if (t.endsWith('vw')) return (Number.parseFloat(t) / 100) * lebarViewport
    return Number.parseFloat(t)
  }
  // clamp(min, nilai, maks) = max(min, min(nilai, maks)) — urutan ini penting,
  // kalau tertukar hasil clamping-nya salah.
  const clamp = /^clamp\(([^,]+),\s*([^,]+),\s*(.+)\)$/.exec(teks)
  if (clamp) {
    return Math.max(
      hitungCSS(clamp[1], lebarViewport),
      Math.min(hitungCSS(clamp[2], lebarViewport), hitungCSS(clamp[3], lebarViewport)),
    )
  }
  const min = /^min\((.+)\)$/.exec(teks)
  if (min) {
    return Math.min(...min[1].split(',').map((s) => hitungCSS(s, lebarViewport)))
  }
  const max = /^max\((.+)\)$/.exec(teks)
  if (max) {
    return Math.max(...max[1].split(',').map((s) => hitungCSS(s, lebarViewport)))
  }
  return px(teks)
}

const containerPadding = /--mobile-card-pad-inline:\s*([^;]+);/.exec(css)?.[1] ?? ''
ujiBenar('Padding kartu memakai clamp() responsif', /clamp\(/.test(containerPadding), containerPadding)

const minInline = Number.parseFloat(/clamp\(([\d.]+)px/.exec(containerPadding)?.[1] ?? '0')
const maksInline = Number.parseFloat(/clamp\([^,]+,[^,]+,\s*([\d.]+)px/.exec(containerPadding)?.[1] ?? '0')
for (const lebar of LEBAR_LAYAR) {
  const padKartu = hitungCSS(containerPadding, lebar)
  // Sisi luar: jarak kartu ke tepi layar. Isi: jarak teks ke tepi kartu.
  const isiDariTepiLayar = padKartu * 2
  ujiBenar(
    `${lebar}px: isi minimal 14px dari tepi layar`,
    isiDariTepiLayar >= 28,
    `kartu ${padKartu.toFixed(1)}px x 2`,
  )
  ujiBenar(`${lebar}px: padding kartu di rentang 14-20px`, padKartu >= 14 && padKartu <= 20, `${padKartu.toFixed(1)}px`)
  // Di 320-375px boleh 14-16px; 390px ke atas naik ke 16-20px.
  if (lebar <= 375) {
    ujiBenar(`${lebar}px: layar kecil memakai 14-16px`, padKartu >= 14 && padKartu <= 16.5, `${padKartu.toFixed(1)}px`)
  } else {
    ujiBenar(`${lebar}px: layar 390px+ memakai >= 15.5px`, padKartu >= 15.5, `${padKartu.toFixed(1)}px`)
  }
}
ujiBenar('Padding kartu minimum 14px', minInline >= 14, `min ${minInline}px`)
ujiBenar('Padding kartu maksimum 20px', maksInline <= 20, `maks ${maksInline}px`)

// Kontrol sentuh: tinggi 44-48px, radius 12-16px.
const kontrolTinggi = Number.parseFloat(/--mobile-control-h:\s*([\d.]+)px/.exec(css)?.[1] ?? '0')
const kontrolRadius = Number.parseFloat(/--mobile-control-radius:\s*([\d.]+)px/.exec(css)?.[1] ?? '0')
ujiBenar('Tinggi tombol/input 44-48px', kontrolTinggi >= 44 && kontrolTinggi <= 48, `${kontrolTinggi}px`)
ujiBenar('Radius tombol 12-16px', kontrolRadius >= 12 && kontrolRadius <= 16, `${kontrolRadius}px`)
ujiBenar(
  'Seluruh kontrol sentuh punya box-sizing: border-box',
  /\.sp-mobile-root button,[\s\S]{0,400}?box-sizing:\s*border-box/.test(css),
)
ujiBenar(
  'Seluruh kontrol sentuh tidak boleh lebih lebar dari wadahnya',
  /\.sp-mobile-root button,[\s\S]{0,400}?max-width:\s*100%/.test(css),
)

const semuaBerkas = [
  ...walk('src/pages/mobile'),
  ...walk('src/components/mobile'),
].filter((f) => /\.(jsx|js)$/.test(f))
const semuaMobileJs = walk('src').filter((f) => /\.(js|jsx)$/.test(f))

/** Semua pemakaian kelas kartu, dengan className-nya. */
function pemakaianKartu(kelas) {
  const hasil = []
  for (const berkas of semuaBerkas) {
    const isi = readFileSync(berkas, 'utf8')
    for (const m of isi.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const className = m[1] ?? m[2] ?? ''
      // Dicocokkan per token, bukan substring: `sp-card-head` dan `sp-card-flush`
      // adalah kelas lain, bukan kartu.
      const token = className.split(/\s+/).filter(Boolean)
      if (token.includes(kelas)) hasil.push({ berkas: berkas.split(/[\\/]/).pop(), className })
    }
  }
  return hasil
}

const P_UTILITY = /(^|\s)p-(\d)(\.5)?(\s|$)/
// Kartu biasa harus punya padding vertikal dari utility (p-3..p-6), kecuali
// ia sengaja menempel penuh (sp-card-flush) yang punya modifier sendiri.
const pakaiKartu = pemakaianKartu('sp-card')
const tanpaPadding = pakaiKartu.filter(
  (p) => !P_UTILITY.test(p.className) && !p.className.split(/\s+/).includes('sp-card-flush'),
)
ujiBenar(
  'Setiap sp-card punya padding vertikal (p-* atau sp-card-flush)',
  tanpaPadding.length === 0,
  tanpaPadding.length
    ? tanpaPadding.map((p) => `${p.berkas}: ${p.className.trim()}`).join(' | ')
    : `${pakaiKartu.length} pemakaian`,
)

// Kartu hero gradient punya padding sendiri di CSS, jadi tidak butuh utility.
const heroCard = /\.sp-hero-card\s*{([^}]*)}/.exec(css)?.[1] ?? ''
ujiBenar('.sp-hero-card punya padding 16-20px sendiri', /padding:\s*clamp\(/.test(heroCard), heroCard.match(/padding:[^;]+/)?.[0] ?? '')
ujiBenar(
  'Setiap sp-hero-card tetap memakai padding kartu',
  pemakaianKartu('sp-hero-card').every((p) => /padding:\s*clamp\(/.test(heroCard) || P_UTILITY.test(p.className)),
)

// Kartu daftar harus memakai padding eksplisit, bukan andalkan utility.
const listCard = /\.sp-list-card\s*{([^}]*)}/.exec(css)?.[1] ?? ''
ujiBenar('.sp-list-card punya padding', /padding:/.test(listCard))
ujiBenar('.sp-list-card memakai token padding kartu', /var\(--mobile-card-pad-inline\)/.test(listCard))

// ============================================================================
// 4. TIDAK ADA DIVIDER / TEKS YANG MENYENTUH SISI KARTU
// ============================================================================
const profil = readFileSync('src/pages/mobile/MobileProfilPage.jsx', 'utf8')
ujiBenar(
  'Baris menu memakai pembungkus border (bukan border di tombolnya)',
  /border-b border-surface-container last:border-b-0/.test(profil),
)
ujiBenar(
  'Baris menu tidak lagi memakai border langsung di tombolnya',
  !/<button[\s\S]{0,320}?border-b border-surface-container/.test(profil),
)
ujiBenar(
  'Kartu menu memakai sp-card-flush + wadah px-4',
  /sp-card sp-card-flush overflow-hidden[\s\S]{0,400}?className="px-4"/.test(profil),
)
ujiBenar('Kartu menu punya padding atas untuk judulnya', /className="px-4 pt-4 pb-3"/.test(profil))
ujiBenar('Baris informasi memakai kepala kartu', profil.includes('sp-card-head'))
ujiBenar('Tidak ada header kartu lama dengan pb-1', !/flex items-center gap-2 pb-1"/.test(profil))

// Baris informasi: kelas yang sama dipakai seragam di kartu kepegawaian,
// jam kerja global, detail kartu harian, dan data kartu ID.
ujiBenar('Baris label:nilai memakai .sp-data-row', /className="sp-data-row"/.test(profil))
const kartuId = readFileSync('src/pages/mobile/MobileKartuIdPage.jsx', 'utf8')
ujiBenar('Baris label:nilai pada Kartu ID memakai .sp-data-row', /className="sp-data-row"/.test(kartuId))
ujiBenar(
  '.sp-data-row punya padding vertikal + divider',
  /\.sp-data-row\s*{[^}]*padding-block/.test(css) && /\.sp-data-row\s*{[^}]*border-bottom/.test(css),
)
ujiBenar('Baris terakhir tidak memakai divider', /\.sp-data-row:last-child\s*{[^}]*border-bottom:\s*0/.test(css))
ujiBenar(
  'Value rata kanan tetap punya jarak aman (tidak menempel border)',
  /\.sp-data-row-value\s*{[^}]*min-width:\s*0/.test(css) && /\.sp-data-row\s*{[^}]*gap:/.test(css),
)

// ============================================================================
// 5. KARTU DI DALAM KARTU TIDAK BOLEH MENGHITUNG PADDING DUA KALI
// ============================================================================
// Kartu kamera (ScanFrame) pernah duduk di dalam kartu mode presensi: dengan
// padding kartu yang aktif, hasilnya ruang 2x dan bingkai menyempit.
const presensi = readFileSync('src/pages/mobile/MobilePresensiPage.jsx', 'utf8')
const kartuDiDalamKartu = [...presensi.matchAll(/className="([^"]*\bsp-card\b[^"]*)"[\s\S]{0,900}?<ScanFrame/g)]
ujiBenar(
  'Tidak ada sp-card yang membungkus ScanFrame (kartu di dalam kartu)',
  kartuDiDalamKartu.length === 0,
  kartuDiDalamKartu.map((m) => m[1]).join(' | '),
)
ujiBenar('Kartu kamera dibungkus wadah max-width, bukan kartu lain', /max-w-\[320px\]"/.test(presensi))

// ============================================================================
// 6. TOMBOL & INPUT: TINGGI SENTUH DAN TIDAK MELEBIHI SISI KARTU
// ============================================================================
const semuaTombol = []
for (const berkas of semuaMobileJs) {
  if (!/mobile/.test(berkas)) continue
  const isi = readFileSync(berkas, 'utf8')
  for (const m of isi.matchAll(/<button[\s\S]{0,400}?className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    semuaTombol.push({ berkas: berkas.split(/[\\/]/).pop(), className: m[1] ?? m[2] ?? '' })
  }
}
// Yang dinilai: tombol dengan teks. Tombol ikon (w-11 h-11, rounded-full) dan
// tombol tirai layar (absolute inset-0) sudah punya ukuran sendiri.
const tombolTeks = semuaTombol.filter(
  (t) => !/w-\d+\s+h-\d+|rounded-full|w-11|w-10|w-9|w-8|absolute inset-0/.test(t.className),
)
// Tombol teks boleh salah satu dari: .sp-btn (tinggi 48 + radius 14), tinggi
// eksplisit, padding sendiri, atau mengisi wadah yang sudah dipadding (baris
// menu: padding horizontalnya dibawa oleh `px-4` di induknya).
const tombolTanpaSizing = tombolTeks.filter((t) => {
  const c = t.className
  const adaPaddingSendiri = /(^|\s)(p|px)-/.test(c) && /(^|\s)(p|py)-/.test(c)
  const mengisiWadahBerpadding = /(^|\s)(w-full|flex-1)/.test(c) && /(^|\s)(p|py)-/.test(c)
  return !/\bsp-btn\b/.test(c) && !/min-h-\[/.test(c) && !adaPaddingSendiri && !mengisiWadahBerpadding
})
ujiBenar(
  'Tombol teks mobile memakai .sp-btn, tinggi eksplisit, atau padding sendiri',
  tombolTanpaSizing.length === 0,
  tombolTanpaSizing.length
    ? tombolTanpaSizing.map((t) => `${t.berkas}: ${t.className.trim().slice(0, 70)}`).join(' | ')
    : `${tombolTeks.length} tombol teks`,
)

// ============================================================================
// 7. SEMUA HALAMAN MOBILE MEMAKAI SISTEM YANG SAMA
// ============================================================================
for (const nama of HALAMAN) {
  const src = readFileSync(`src/pages/mobile/${nama}`, 'utf8')
  ujiBenar(`${nama} memakai pembungkus sp-page-container`, src.includes('sp-page-container'))
}

// Jarak antar kartu dalam satu halaman: 16px (gap-4) atau 14px (gap-3.5),
// bukan 8/10px yang bikin kartu terasa rapat. Wrapper konten memakai `px-4`,
// jadi kedua bentuk itu yang dicocokkan — dan hasilnya harus benar-benar
// menemukan satu wrapper, kalau tidak guard ini jadi kosong tanpa suara.
for (const nama of HALAMAN) {
  const src = readFileSync(`src/pages/mobile/${nama}`, 'utf8')
  const wrapper = /className="(?:sp-page-container|px-4) relative z-\[2\] flex flex-col gap-(\d(?:\.5)?)\b/.exec(src)
  ujiBenar(`${nama} punya wrapper konten dengan jarak antar kartu >= 14px`, Boolean(wrapper) && Number(wrapper?.[1]) >= 3.5, `gap-${wrapper?.[1]}`)
}

// Gutter halaman harus sama dengan jarak navigasi ke tepi (16px). Kalau keduanya
// berbeda, kartu terlihat meleset relatif terhadap baris navigasi.
/** Baca nilai deklarasi px, baik literal maupun `var(--token)`. */
function nilaiPx(blokCss, properti) {
  const nilai = new RegExp(`${properti}:\\s*([^;]+);`).exec(blokCss)?.[1]?.trim() ?? ''
  const token = /^var\(\s*(--[\w-]+)\s*\)$/.exec(nilai)
  if (token) {
    return Number.parseFloat(new RegExp(`${token[1]}:\\s*([\\d.]+)px`).exec(css)?.[1] ?? '0')
  }
  return Number.parseFloat(nilai)
}
const gutterHalaman = nilaiPx(/\.sp-page-container\s*{[^}]*}/.exec(css)?.[0] ?? '', 'padding-left')
const gutterNavigasi = nilaiPx(/\.sp-nav-float\s*{[^}]*}/.exec(css)?.[0] ?? '', 'left')
ujiBenar('Gutter halaman 14-16px', gutterHalaman >= 14 && gutterHalaman <= 16, `${gutterHalaman}px`)
ujiBenar(
  'Gutter halaman sama dengan jarak navigasi ke tepi',
  gutterHalaman === gutterNavigasi && gutterNavigasi > 0,
  `halaman ${gutterHalaman}px vs nav ${gutterNavigasi}px`,
)

console.log('UJI SISTEM JARAK MODUL MOBILE')
console.log('='.repeat(110))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(110))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')
