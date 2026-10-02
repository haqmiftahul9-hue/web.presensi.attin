// Mengunduh file font woff2 (latin) dari Google Fonts agar aplikasi tidak lagi
// bergantung pada fonts.googleapis.com. Hasil disimpan ke public/fonts/ dan
// dideklarasikan sebagai @font-face di src/index.css.
import { mkdirSync, writeFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const OUT = 'public/fonts'
mkdirSync(OUT, { recursive: true })

async function css(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`CSS ${r.status}: ${url}`)
  return r.text()
}

/** Ambil URL woff2 untuk subset latin + latin-ext beserta weight-nya. */
function parseFontFaces(cssText) {
  const hasil = []
  const blok = cssText.split('@font-face').slice(1)
  for (const b of blok) {
    const family = /font-family:\s*'([^']+)'/.exec(b)?.[1]
    const weight = /font-weight:\s*(\d+)/.exec(b)?.[1]
    const url = /url\((https:[^)]+\.woff2)\)/.exec(b)?.[1]
    const unicode = /unicode-range:\s*([^;]+);/.exec(b)?.[1]
    if (!family || !url) continue
    if (!unicode || !/U\+0000-00FF/.test(unicode)) continue // hanya latin dasar
    hasil.push({ family, weight: weight || '400', url, unicode })
  }
  return hasil
}

const SUMBER = [
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'PlusJakartaSans', url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap' },
]

const faces = []
for (const s of SUMBER) {
  const teks = await css(s.url)
  const daftar = parseFontFaces(teks)
  for (const f of daftar) {
    const file = `${f.family.replace(/\s+/g, '')}-${f.weight}.woff2`
    const buf = Buffer.from(await (await fetch(f.url, { headers: { 'User-Agent': UA } })).arrayBuffer())
    writeFileSync(`${OUT}/${file}`, buf)
    console.log(`${file} ${(buf.length / 1024).toFixed(1)} KB`)
    faces.push({ family: f.family, weight: f.weight, file })
  }
}

console.log('\n@font-face yang perlu ditambahkan:')
for (const f of faces) {
  console.log(`  ${f.family} ${f.weight} -> /fonts/${f.file}`)
}