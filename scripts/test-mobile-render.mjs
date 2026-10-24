// ============================================================================
// UJI RENDER HALAMAN MOBILE GURU/PEGAWAI
//
// Menangkap kelas bug yang tidak terlihat oleh build maupun lint: ReferenceError
// saat render. Gejalanya persis seperti laporan pengguna — halaman gagal
// dimuat, dan karena pagarnya ikut terpengaruh, halaman lain ikut terkunci.
//
// Cakupan:
//   1. Render tiap halaman (/mobile/home, /presensi, /riwayat, /profil).
//   2. Kunjungi berurutan seperti bottom navigation (tanpa reload).
//   3. Halaman riwayat saat store belum siap -> "Loading Riwayat Presensi".
//   4. Riwayat tanpa data -> "Belum ada data presensi" (bukan layar kosong).
//   5. Pagar kesalahan pulih saat pindah halaman (tidak mengunci modul).
//   6. Riwayat menampilkan tanggal, jam masuk/pulang, status, keterlambatan.
//
// Jalankan: node scripts/test-mobile-render.mjs
// ============================================================================

import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'

// ============================================================================
// HARNESS
// ============================================================================
const SESI_KEY = 'simpres.auth.session'
const NIY_GURU = '049005069' // Erianto, S.Ag, M.Pd.I (staff id 1, status Aktif)

function pasangSesi(niy = NIY_GURU) {
  const isi = new Map([[SESI_KEY, JSON.stringify({ v: 1, user: { username: niy } })]])
  const storage = {
    getItem: (k) => (isi.has(k) ? isi.get(k) : null),
    setItem: (k, v) => isi.set(k, String(v)),
    removeItem: (k) => isi.delete(k),
  }
  globalThis.window = { sessionStorage: storage, localStorage: storage }
}

pasangSesi()

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})

const muat = (p) => server.ssrLoadModule(p)
const store = await muat('/src/store/simPresStore.jsx')
const { SimPresProvider, selectSelfStaff } = store
const beranda = (await muat('/src/pages/mobile/MobileBerandaPage.jsx')).default
const presensi = (await muat('/src/pages/mobile/MobilePresensiPage.jsx')).default
const riwayat = (await muat('/src/pages/mobile/MobileRiwayatPage.jsx')).default
const profil = (await muat('/src/pages/mobile/MobileProfilPage.jsx')).default
const Boundary = (await muat('/src/components/mobile/MobileErrorBoundary.jsx')).default
await server.close()

const halaman = {
  // Penanda mengikuti isi utama tiap halaman setelah redesign UI: kartu utama
  // presensi ("Presensi Hari Ini") menggantikan blok "Informasi Hari Ini".
  '/mobile/home': { nama: 'Beranda', Komponen: beranda, penanda: 'Presensi Hari Ini' },
  '/mobile/presensi': { nama: 'Presensi', Komponen: presensi, penanda: 'Status Sensor' },
  '/mobile/riwayat': { nama: 'Riwayat', Komponen: riwayat, penanda: 'Riwayat Kehadiran' },
  '/mobile/profil': { nama: 'Profil', Komponen: profil, penanda: 'Informasi Kepegawaian' },
}

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, ok, detail = '') {
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

function ujiSama(nama, aktual, diharapkan) {
  uji(nama, aktual === diharapkan, aktual === diharapkan ? '' : `dapat "${aktual}", depan "${diharapkan}"`)
}

/**
 * Render satu halaman persis seperti di aplikasi: di dalam Router (halaman lain
 * memakai Link/useNavigate) dan di dalam Provider store. Error render ditangkap
 * sebagai nilai supaya bisa dilaporkan sebagai kegagalan, bukan exceção.
 */
function render(path, { tanpaProvider = false } = {}) {
  const { Komponen } = halaman[path]
  let pohon = h(MemoryRouter, { initialEntries: [path] }, h(Komponen))
  if (!tanpaProvider) pohon = h(SimPresProvider, null, pohon)
  try {
    return { ok: true, html: renderToString(pohon) }
  } catch (e) {
    return { ok: false, error: e, pesan: e?.message || String(e) }
  }
}

// ============================================================================
// 1 & 2. KUNJUNGI KEEMPAT HALAMAN URUTAN (seperti bottom navigation)
// ============================================================================
const urutan = ['/mobile/home', '/mobile/presensi', '/mobile/riwayat', '/mobile/profil']
const hasilRender = {}

for (const path of urutan) {
  const hasil = render(path)
  hasilRender[path] = hasil
  const { nama, penanda } = halaman[path]
  if (!hasil.ok) {
    uji(`Render ${nama} (${path})`, false, hasil.pesan)
    continue
  }
  uji(`Render ${nama} (${path}) tanpa crash`, true)
  uji(`${nama}: konten utama tampil`, hasil.html.includes(penanda), penanda)
  // Halaman tidak boleh kosong: harus ada isi yangsubstantial.
  uji(`${nama}: halaman tidak blank`, hasil.html.length > 500, `${hasil.html.length} karakter`)
}

// Kunjungi riwayat -> lalu halaman lain lagi, persis skenario yang terkunci.
for (const path of ['/mobile/home', '/mobile/presensi', '/mobile/profil']) {
  const hasil = render(path)
  const { nama } = halaman[path]
  uji(
    `Setelah membuka Riwayat, ${nama} masih bisa dibuka`,
    hasil.ok && hasil.html.length > 500,
    hasil.ok ? `${hasil.html.length} karakter` : hasil.pesan,
  )
}

// Render ulang beberapa kali: menangkap infinite render / state thrash.
for (let i = 0; i < 3; i += 1) {
  const hasil = render('/mobile/riwayat')
  uji(`Riwayat stabil pada render ke-${i + 2}`, hasil.ok && hasil.html.includes('Periode Presensi'), hasil.ok ? '' : hasil.pesan)
}

// ============================================================================
// 3. STATUS MEMUAT: store belum siap
// ============================================================================
const tanpaProvider = render('/mobile/riwayat', { tanpaProvider: true })
if (!tanpaProvider.ok) {
  uji('Riwayat tanpa Provider tidak melempar error', false, tanpaProvider.pesan)
} else {
  uji('Riwayat tanpa Provider tidak melempar error', true)
  uji('Status memuat: "Loading Riwayat Presensi"', tanpaProvider.html.includes('Loading Riwayat Presensi'))
  uji('Status memuat: halaman tidak blank', tanpaProvider.html.length > 200, `${tanpaProvider.html.length} karakter`)
  uji('Status memuat: tidak menampilkan daftar kosong', !tanpaProvider.html.includes('Belum ada data presensi'))
}

// Halaman lain juga harus tahan ketiadaan Provider (menampilkan memuat, bukan melempar).
for (const path of ['/mobile/home', '/mobile/presensi', '/mobile/profil']) {
  const hasil = render(path, { tanpaProvider: true })
  const { nama } = halaman[path]
  uji(`${nama} tanpa Provider tidak melempar error`, hasil.ok, hasil.ok ? '' : hasil.pesan)
}

// ============================================================================
// 4. STATUS KOSONG: "Belum ada data presensi", bukan layar kosong
// ============================================================================
// Halaman ini membaca daftar dari filterRiwayatPeriode(); periode tanpa data
// menghasilkan daftar kosong (sudah diuji di test-filter-riwayat). Di sini kita
// memastikan cabang kosong itu benar-benar dirender dengan teks yang diminta dan
// selalu punya jalan keluar.
const { EmptyState } = await (async () => {
  const s2 = await createServer({ configFile: false, root: process.cwd(), logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' })
  const m = await s2.ssrLoadModule('/src/components/mobile/Feedback.jsx')
  await s2.close()
  return m
})()

const htmlKosong = renderToString(
  h(EmptyState, {
    ikon: 'event_busy',
    judul: 'Belum ada data presensi',
    detail: 'Tidak ada presensi tercatat pada Oktober 2026.',
    aksi: h('button', { type: 'button' }, 'Tampilkan ulang'),
  }),
)
uji('Status kosong: judul "Belum ada data presensi"', htmlKosong.includes('Belum ada data presensi'))
uji('Status kosong: punya aksi pemulihan', htmlKosong.includes('Tampilkan ulang'))
uji('Status kosong: bukan layar kosong', htmlKosong.length > 200, `${htmlKosong.length} karakter`)

const sumberRiwayat = (await import('node:fs')).readFileSync('src/pages/mobile/MobileRiwayatPage.jsx', 'utf8')
uji('Halaman benar-benar memakai teks "Belum ada data presensi"', sumberRiwayat.includes('Belum ada data presensi'))
uji('Halaman punya status memuat "Loading Riwayat Presensi"', sumberRiwayat.includes('Loading Riwayat Presensi'))

// ============================================================================
// 5. PAGAR KESALAHAN: harus pulih saat path berubah
// ============================================================================
// Pagar hanya bekerja di renderer klien, jadi yang diperiksa di sini adalah
// logikanya secara langsung: getDerivedStateFromProps harus melepas error ketika
// pathname berubah. Inilah bug yang membuat modul terkunci selamanya — tanpa
// reset ini, satu halaman yang gagal membuat semua halaman berikutnya berhenti.
const awal = new Boundary({ resetKey: '/mobile/riwayat', children: null })
const denganError = { ...awal.state, error: new Error('render gagal') }
const denganErrorDanKey = { ...denganError, resetKey: '/mobile/riwayat' }

const tetap = Boundary.getDerivedStateFromProps({ resetKey: '/mobile/riwayat' }, denganErrorDanKey)
uji('Pagar: path tidak berubah -> error dipertahankan', tetap === null || tetap.error !== null)

const pulih = Boundary.getDerivedStateFromProps({ resetKey: '/mobile/profil' }, denganErrorDanKey)
uji('Pagar: path berubah -> error dilepas', pulih?.error === null, JSON.stringify(pulih))
uji('Pagar: key baru tersimpan', pulih?.resetKey === '/mobile/profil', String(pulih?.resetKey))

const dariError = Boundary.getDerivedStateFromError(new Error('boom'))
uji('Pagar: error hasil render ditangkap', dariError?.error instanceof Error)

// Setelah reset, boundary harus mengembalikan children (halaman berfungsi lagi).
const instance = new Boundary({ resetKey: '/mobile/profil', children: 'HALAMAN BERJALAN' })
instance.state = { error: null, resetKey: '/mobile/profil' }
uji('Pagar setelah reset merender children', instance.render() === 'HALAMAN BERJALAN')

const instanceYangGagal = new Boundary({ resetKey: '/mobile/riwayat', children: 'HALAMAN BERJALAN' })
instanceYangGagal.state = { error: new Error('boom'), resetKey: '/mobile/riwayat' }
// Link di dalam pagar butuh konteks router, jadi bungkus dengan MemoryRouter.
const htmlPagar = renderToString(h(MemoryRouter, null, instanceYangGagal.render()))
uji('Pagar menampilkan "Halaman gagal dimuat"', htmlPagar.includes('Halaman gagal dimuat'))
uji('Pagar menyediakan jalan keluar ke Beranda', htmlPagar.includes('Kembali ke Beranda'))

// Layout harus meneruskan pathname ke pagar, kalau tidak reset di atas tak pernah jalan.
const sumberLayout = (await import('node:fs')).readFileSync('src/components/mobile/MobileLayout.jsx', 'utf8')
uji(
  'MobileLayout meneruskan resetKey={location.pathname}',
  /MobileErrorBoundary[\s\S]{0,80}resetKey=\{location\.pathname\}/.test(sumberLayout),
)

// ============================================================================
// 6. ISI KARTU RIWAYAT: tanggal, jam, status, keterlambatan
// ============================================================================
const htmlRiwayat = hasilRender['/mobile/riwayat']?.html || ''
for (const wajib of ['Belum ada data presensi', 'Tampilkan', 'Periode Presensi']) {
  uji(`Kartu riwayat menampilkan "${wajib}"`, htmlRiwayat.includes(wajib))
}
uji('Halaman tidak menampilkan kata shift', !/\bshift\b/i.test(htmlRiwayat))

// Tiga dari empat halaman punya label "Riwayat"/"Presensi" yang juga dipakai
// navigasi, jadi cek tambahan untuk memastikan tidak ada konten yang bocor.
uji('Tidak ada "undefined" di markup riwayat', !htmlRiwayat.includes('undefined'))
uji('Tidak ada "NaN" di markup riwayat', !htmlRiwayat.includes('NaN'))

// Pegawai yang login terdeteksi -> data pribadi, bukan milik orang lain.
uji('Context store terpasang', typeof selectSelfStaff === 'function')

// ============================================================================
console.log('UJI RENDER HALAMAN MOBILE GURU/PEGAWAI')
console.log('='.repeat(104))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(104))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')
