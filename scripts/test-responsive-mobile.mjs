// ============================================================================
// UJI RESPONSIF & KEAMANAN TAMPILAN MODUL MOBILE
//
// Yang diperiksa di sini murni tampilan — tidak ada perubahan pada data, fitur,
// atau aturan bisnis. Fokusnya: tidak ada overflow horizontal, ruang bawah cukup
// untuk bottom navigation, dan tidak ada teks kosong yang bocor ke layar.
//
// "Pengukuran" dilakukan dengan membaca aturan CSS yang benar-benar dipakai
// aplikasi (max-width kolom, lebar nav, jarak bawah) dan menggabungkannya,
// sehingga angka yang dicek adalah angka yang benar-benar ada di stylesheet.
//
// Jalankan: node scripts/test-responsive-mobile.mjs
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(60)} ${String(aktual).padEnd(20)} (harapan: ${diharapkan})`)
}

function ujiBenar(nama, kondisi, detail = '') {
  if (kondisi) lulus += 1
  else gagal += 1
  rincian.push(`${kondisi ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

const LEBAR_LAYAR = [360, 375, 390, 430]

// ============================================================================
// 1. KOLOM APLIKASI & NAVIGASI (dari stylesheet yang benar-benar dipakai)
// ============================================================================
const css = readFileSync('src/index.css', 'utf8')
const layoutSrc = readFileSync('src/components/mobile/MobileLayout.jsx', 'utf8')

// Lebar maksimum kolom aplikasi, diambil dari kelas yang benar-benar dipakai.
const maksKolom = Number(/max-width:\s*(\d+)px/.exec(css.match(/\.sp-mobile-column\s*{[^}]*}/)?.[0] ?? '')?.[1] ?? 0)
const kolomCss = /\.sp-mobile-column\s*{([^}]*)}/.exec(css)?.[1] ?? ''
uji('Lebar maksimum kolom (CSS)', maksKolom, 430)
ujiBenar('Kolom punya width: 100%', /width:\s*100%/.test(kolomCss), kolomCss.replace(/\s+/g, ' ').slice(0, 60))
ujiBenar('Kolom punya min-height: 100dvh', /min-height:\s*100dvh/.test(kolomCss))
ujiBenar('Kolom tidak memakai transform scale', !/scale/.test(kolomCss))
ujiBenar('Kolom tidak memakai zoom', !/zoom/.test(kolomCss))
// max-width/min-height tetap boleh; yang dilarang adalah `width` px tetap.
ujiBenar('Kolom tidak memakai lebar px tetap', !/(?<!max-|min-)width:\s*\d+px/.test(kolomCss))

// --- Bottom navigation: horizontal, mengambang, tidak pernah vertikal -------
const navBlok = /\.sp-nav-float\s*{([^}]*)}/.exec(css)?.[1] ?? ''
const rowBlok = /\.sp-nav-row\s*{([^}]*)}/.exec(css)?.[1] ?? ''
const itemBlok = /\.sp-nav-float-item\s*{([^}]*)}/.exec(css)?.[1] ?? ''

// Ini pagarnya. Tanpa `display:flex` pada baris navigasi, keempat menu jadi
// blok penuh dan turun ke bawah — persis gejala yang dilaporkan.
ujiBenar('Baris nav memakai display: flex', /display:\s*flex/.test(rowBlok))
ujiBenar('Baris nav memakai flex-direction: row', /flex-direction:\s*row/.test(rowBlok))
ujiBenar('Baris nav memakai justify-content: space-around', /justify-content:\s*space-around/.test(rowBlok))
ujiBenar('Baris nav memakai align-items: center', /align-items:\s*center/.test(rowBlok))
ujiBenar('Baris nav TIDAK memakai flex-direction: column', !/flex-direction:\s*column/.test(rowBlok))
ujiBenar('Baris nav TIDAK memakai flex-wrap', !/flex-wrap/.test(rowBlok))
// Item ikut baris (icon di atas label) dan boleh menyusut.
ujiBenar('Item nav memakai flex-direction: column (icon di atas label)', /flex-direction:\s*column/.test(itemBlok))
ujiBenar('Item nav memakai flex: 1 1 0%', /flex:\s*1 1 0%/.test(itemBlok))
ujiBenar('Item nav memakai min-width: 0', /min-width:\s*0/.test(itemBlok))
// Tidak boleh ada grid 1 kolom di area navigasi.
ujiBenar('Navigasi tidak memakai grid', !/display:\s*grid/.test(navBlok + rowBlok))

const navLebar = Number(/width:\s*calc\(100% - (\d+)px\)/.exec(navBlok)?.[1] ?? 0)
const navMaks = Number(/max-width:\s*(\d+)px/.exec(navBlok)?.[1] ?? 0)
const navTinggi = Number(/height:\s*(\d+)px/.exec(navBlok)?.[1] ?? 0)
const navBawah = Number(/bottom:\s*(\d+)px/.exec(navBlok)?.[1] ?? 0)
const navZ = Number(/z-index:\s*(\d+)/.exec(navBlok)?.[1] ?? 0)
const navSpace = Number(/\.sp-nav-space\s*{\s*height:\s*(\d+)px/.exec(css)?.[1] ?? 0)

uji('Nav mengambang 16px dari tepi kiri/kanan', navLebar, 32)
uji('Nav mengambang 16px dari bawah', navBawah, 16)
uji('Tinggi nav', navTinggi, 76)
uji('Lebar nav maksimum', navMaks, 398)
uji('z-index nav', navZ, 50)
ujiBenar('Tinggi nav dalam rentang 70-80px', navTinggi >= 70 && navTinggi <= 80, `${navTinggi}px`)
ujiBenar('Nav mengikuti lebar kolom 430px', navMaks === maksKolom - 32, `${navMaks} = ${maksKolom} - 32`)
ujiBenar(
  'Ruang bawah konten menutupi nav',
  navSpace >= navBawah + navTinggi,
  `space ${navSpace}px vs nav ${navBawah + navTinggi}px`,
)
ujiBenar('Ruang bawah konten >= 100px', navSpace >= 100, `${navSpace}px`)

// Nav mengambang selalu menyisakan margin di kedua sisi.
for (const lebar of LEBAR_LAYAR) {
  const kolom = Math.min(lebar, maksKolom)
  const navDiLayar = Math.min(kolom - navLebar, navMaks)
  ujiBenar(`${lebar}px: nav tidak menyentuh tepi`, navDiLayar < kolom, `nav ${navDiLayar}px dari kolom ${kolom}px`)
  // Kartu dan grid memakai lebar penuh kolom dikurangi padding 16px per sisi.
  const konten = kolom - 32
  ujiBenar(`${lebar}px: konten tidak nol`, konten >= 320, `${konten}px`)
}

// Di bawah 375px shortcut dikecilkan supaya ikon + judul tetap muat.
const adaMediaQueryKecil = /@media \(max-width: 374px\)[\s\S]*?\.sp-shortcut\s*{[\s\S]*?min-height/.test(css)
ujiBenar('Ada penyesuaian untuk layar <= 374px', adaMediaQueryKecil)

// ============================================================================
// 2. TIDAK ADA KELUARAN SAMPING
// ============================================================================
// Aturan anti-luapan sudah ada di .sp-mobile-root, dan grid memakai
// minmax(0, 1fr) supaya kolomnya boleh menyusut, bukan memaksa lebar minimum.
ujiBenar('Akar modul memakai overflow-x: clip', /\.sp-mobile-root\s*{[^}]*overflow-x:\s*clip/.test(css))
ujiBenar('Root dibatasi max-width viewport', /\.sp-mobile-root\s*{[^}]*max-width:\s*100vw/.test(css))
ujiBenar('Kolom memakai isolation', /\.sp-mobile-column\s*{[^}]*isolation:\s*isolate/.test(css))

const shellSrc = readFileSync('src/components/mobile/AppShell.jsx', 'utf8')
ujiBenar('Grid shortcut memakai minmax(0, 1fr)', /repeat\(\$\{columns\}, minmax\(0, 1fr\)\)/.test(shellSrc))

// ============================================================================
// 2b. TIDAK ADA KODE MATI ATAU ELEMEN YANG BERTINDIK
// ============================================================================
// Komponen & kelas CSS yang sudah tidak dipakai harus dibuang, supaya
// stylesheet tidak menyimpan aturan yang tidak akan pernah berlaku.
const semuaJs = [...walk('src')].filter((f) => /\.(js|jsx)$/.test(f))
const EKSPOR_BEAS = ['PageHero', 'StatusChip']
for (const nama of EKSPOR_BEAS) {
  const rujukan = semuaJs.filter((f) => new RegExp(`\\b${nama}\\b`).test(readFileSync(f, 'utf8')))
  ujiBenar(`Komponen mati "${nama}" sudah dibuang`, rujukan.length === 0, `${rujukan.length} rujukan`)
}
const KELAS_BEAS = ['sp-float-top', 'sp-nav-item']
for (const k of KELAS_BEAS) {
  const diCss = css.includes(`.${k} `) || css.includes(`.${k}{`) || css.includes(`.${k}:`)
  const dipakai = semuaJs.filter((f) => readFileSync(f, 'utf8').includes(k))
  ujiBenar(`Class mati ".${k}" sudah dibuang`, !diCss && dipakai.length === 0, `css=${diCss} dipakai=${dipakai.length}`)
}

// Banner pasang aplikasi harus di atas navigasi mengambang. Nav occupying
// 16px + 76px = 92px dari tepi bawah, jadi banner minimal 104px supaya tidak
// pernah menutupi nav. Lebarnya juga harus sama dengan nav.
const installSrc = readFileSync('src/components/mobile/InstallPrompt.jsx', 'utf8')
const bottomBanner = Number(/bottom-\[(\d+)px\]/.exec(installSrc)?.[1] ?? 0)
const minBanner = navBawah + navTinggi + 12
ujiBenar('Banner install di atas nav', bottomBanner >= minBanner, `bottom-${bottomBanner}px, min ${minBanner}px`)
ujiBenar('Banner install selebar nav', /w-\[calc\(100%-\d+px\)\]/.test(installSrc) && new RegExp(`max-w-\\[${navMaks}px\\]`).test(installSrc))

// Daftar utama harus kartu terpisah (sp-list-card), bukan baris pisah garis.
const izinSrc = readFileSync('src/pages/mobile/MobileIzinCutiPage.jsx', 'utf8')
const riwayatSrc = readFileSync('src/pages/mobile/MobileRiwayatPage.jsx', 'utf8')
ujiBenar('Pengajuan memakai kartu terpisah', izinSrc.includes('sp-list-card'))
ujiBenar('Kartu riwayat memakai sp-list-card', riwayatSrc.includes('sp-list-card'))
// `divide-y` masih boleh di dalam kartu yang detailnya dibuka (daftar
// label: nilai), tapi tidak lagi untuk daftar utama.
ujiBenar('<ul> pengajuan tidak memakai divide-y', !/<ul className="[^"]*divide-y/.test(izinSrc))
ujiBenar('<ul> riwayat tidak memakai divide-y', !/<ul className="[^"]*divide-y/.test(riwayatSrc))

// Setiap halaman mobile memakai padHorizonsial 16px, bukan px-3/px-5 yang
// bisa membuat lebar berbeda antar halaman.
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
for (const nama of HALAMAN) {
  const src = readFileSync(`src/pages/mobile/${nama}`, 'utf8')
  ujiBenar(`${nama} memakai wrapper px-4`, /className="px-4[^"]*relative z-\[2\]/.test(src))
  ujiBenar(`${nama} tidak pakai -mt- + z-20 (pola lama)`, !/-mt-\d+\s+relative z-20/.test(src))
}

// ============================================================================
// 3. TAMPILAN NYATA: semua halaman dirender, dicek tidak ada teks rusak
// ============================================================================
const isiSesi = new Map([['simpres.auth.session', JSON.stringify({ v: 1, user: { username: '049005069' } })]])
const storage = {
  getItem: (k) => (isiSesi.has(k) ? isiSesi.get(k) : null),
  setItem: (k, v) => isiSesi.set(k, String(v)),
  removeItem: (k) => isiSesi.delete(k),
}
globalThis.window = {
  sessionStorage: storage,
  localStorage: storage,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  // InstallPrompt (di dalam MobileLayout) membaca navigator.standalone dan
  // matchMedia; tanpa keduanya render layout gagal di Node.
  navigator: { standalone: false, userAgent: 'node', serviceWorker: undefined },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
}

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const muat = (p) => server.ssrLoadModule(p)
const { SimPresProvider } = await muat('/src/store/simPresStore.jsx')
const MobileLayout = (await muat('/src/components/mobile/MobileLayout.jsx')).default
// Beranda & selector dipakai bagian duplikasi identitas di bawah; dimuat di sini
// selagi server masih hidup.
const Beranda = (await muat('/src/pages/mobile/MobileBerandaPage.jsx')).default
const { useSimPres, selectSelfStaff, selectUnitById } = await muat('/src/store/simPresStore.jsx')
const { getEmployeeSalutation, namaTanpaGelar } = await muat('/src/data/sapaanPegawai.js')
const komponen = {
  '/mobile/home': (await muat('/src/pages/mobile/MobileBerandaPage.jsx')).default,
  '/mobile/presensi': (await muat('/src/pages/mobile/MobilePresensiPage.jsx')).default,
  '/mobile/riwayat': (await muat('/src/pages/mobile/MobileRiwayatPage.jsx')).default,
  '/mobile/izin-cuti': (await muat('/src/pages/mobile/MobileIzinCutiPage.jsx')).default,
  '/mobile/kartu-id': (await muat('/src/pages/mobile/MobileKartuIdPage.jsx')).default,
  '/mobile/qr': (await muat('/src/pages/mobile/MobileQrPage.jsx')).default,
  '/mobile/profil': (await muat('/src/pages/mobile/MobileProfilPage.jsx')).default,
  '/mobile/slip': (await muat('/src/pages/mobile/MobileSlipPage.jsx')).default,
}
await server.close()

for (const [path, Komponen] of Object.entries(komponen)) {
  let html = ''
  let ok = true
  try {
    html = renderToString(h(MemoryRouter, { initialEntries: [path] }, h(SimPresProvider, null, h(Komponen))))
  } catch (error) {
    ok = false
    ujiBenar(`${path} render tanpa crash`, false, error?.message)
  }
  if (!ok) continue
  ujiBenar(`${path} render tanpa crash`, true)
  ujiBenar(`${path} tidak kosong`, html.length > 2000, `${html.length} karakter`)
  ujiBenar(`${path} tidak menampilkan "undefined"`, !html.includes('undefined'))
  ujiBenar(`${path} tidak menampilkan "NaN"`, !html.includes('NaN'))
  ujiBenar(`${path} tidak menampilkan "null"`, !html.includes('>null<'))
}

// ============================================================================
// 4. BENTUK DOM NAVIGASI — diperiksa dari hasil render, bukan dari sumber
// ============================================================================
// CSS saja tidak cukup: yang membuat menu turun ke bawah adalah markup nav tanpa
// pembungkus baris. Layout-nya dirender sungguhan lalu strukturnya diperiksa.
let htmlLayout = ''
let layoutOk = true
try {
  htmlLayout = renderToString(
    h(MemoryRouter, { initialEntries: ['/mobile/home'] }, h(SimPresProvider, null, h(MobileLayout))),
  )
} catch (error) {
  layoutOk = false
  ujiBenar('MobileLayout render tanpa crash', false, error?.message)
}

if (layoutOk) {
  ujiBenar('MobileLayout render tanpa crash', true)
  const nav = /<nav[^>]*aria-label="Navigasi utama"[^>]*>([\s\S]*?)<\/nav>/.exec(htmlLayout)
  ujiBenar('Ada elemen <nav>', Boolean(nav))
  const isiNav = nav ? nav[1] : ''
  // Empat item harus berada di dalam SATU pembungkus baris; tanpa itu item
  // menjadi blok penuh dan menumpuk ke bawah.
  ujiBenar('Empat menu dibungkus satu baris (.sp-nav-row)', /<div class="sp-nav-row">/.test(isiNav))
  const diDalamBaris = /<div class="sp-nav-row">([\s\S]*?)<\/div>/.exec(isiNav)?.[1] ?? ''
  const jumlahItem = (diDalamBaris.match(/sp-nav-float-item/g) || []).length
  uji('Jumlah menu di dalam baris', jumlahItem, 4)
  const label = [...diDalamBaris.matchAll(/>(Beranda|Presensi|Riwayat|Profil)</g)].map((m) => m[1])
  uji('Urutan menu', label.join(','), 'Beranda,Presensi,Riwayat,Profil')
  // Tidak ada pembungkus lain yang bisa memecah baris.
  ujiBenar('Semua item langsung anak baris', jumlahItem === 4 && (diDalamBaris.match(/<div/g) || []).length === 0)
  // Menu aktif ditandai aria-current supaya aturan warnanya berlaku.
  ujiBenar('Menu aktif memakai aria-current="page"', /aria-current="page"[^>]*class="sp-nav-float-item/.test(diDalamBaris))
  // Hanya menu aktif yang boleh putih; yang lain memakai abu (on-surface-variant).
  const itemTerpisah = diDalamBaris.split('<a ').slice(1)
  const putih = itemTerpisah.filter((a) => a.includes('text-white'))
  uji('Hanya menu aktif yang berwarna putih', putih.length, 1)
  ujiBenar('Menu aktif: ikon & label putih', /aria-current="page"[\s\S]{0,400}text-white/.test(diDalamBaris))
  ujiBenar('Menu nonaktif memakai teks abu', itemTerpisah.filter((a) => !a.includes('aria-current')).every((a) => a.includes('text-on-surface-variant')))
  // Ruang untuk navigasi tetap ada di area konten.
  ujiBenar('Area konten memakai sp-nav-space', /class="[^"]*sp-nav-space/.test(htmlLayout))
  ujiBenar('Area konten memberi pt-16 untuk bar atas', /sp-mobile-main[^"]*pt-16/.test(htmlLayout))
}

// ============================================================================
// 5. TIDAK ADA KARTU IDENTITAS BERGANDUNG DI BERANDA
// ============================================================================
// Dulunya ada profile header (foto + sapaan + nama + unit) DAN ProfileCard
// tepat di bawahnya, sehingga identitas pegawai tampil dua kali. Halaman ini
// merender Beranda sungguhan lalu menghitung setiap kemunculan.

let staff = null
let unitPegawai = null
function Probe() {
  const ctx = useSimPres()
  staff = selectSelfStaff(ctx.state)
  unitPegawai = selectUnitById(ctx.state, staff.unitId)
  return null
}
renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Probe))))
const staffBeranda = staff
const unitBeranda = unitPegawai

const htmlBeranda = renderToString(
  h(MemoryRouter, { initialEntries: ['/mobile/home'] }, h(SimPresProvider, null, h(Beranda))),
)
const namaLengkap = staffBeranda.name
const sapaanPegawai = getEmployeeSalutation(staffBeranda, unitBeranda)
const hitung = (needle) => (needle ? htmlBeranda.split(needle).length - 1 : 0)

/** Hitung kemunculan sebagai TEKS yang terlihat, bukan atribut. */
function hitungTeks(needle) {
  const tanpaAtribut = htmlBeranda.replace(/\s(?:alt|title)="[^"]*"/g, '')
  return tanpaAtribut.split(needle).length - 1
}

uji('Nama lengkap tampil tepat 1x sebagai teks', hitungTeks(namaLengkap), 1)
uji('Nama depan tidak bocor ke teks lain', hitungTeks(namaTanpaGelar(namaLengkap).split(' ')[0]), 1)
uji('Kata sapaan tampil tepat 1x', hitungTeks(sapaanPegawai), 1)
uji('Sapaan "Halo," hanya satu kali', hitungTeks('Halo,'), 1)
uji('NIY tampil tepat 1x', hitungTeks(staffBeranda.niy), 1)
uji('Unit tampil tepat 1x', hitungTeks(unitBeranda?.nama), 1)
uji('Jabatan tampil tepat 1x', hitungTeks(staffBeranda.role), 1)
uji('Foto pegawai hanya satu', (htmlBeranda.match(/<img/g) || []).length, 1)

// Kartu identitas kedua harus benar-benar tidak ada.
ujiBenar('ProfileCard tidak lagi dipakai', !htmlBeranda.includes('sp-float-card'))
ujiBenar('Kartu identitas menggantung dihapus dari AppShell', !readFileSync('src/components/mobile/AppShell.jsx', 'utf8').includes('ProfileCard'))
// Komentar yang menjelaskan kenapa kartu itu dihapus boleh menyebut namanya,
// jadi yang diperiksa adalah pemakaian di KODE, bukan teks komentar.
const buangKomentar = (isi) => isi
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
const semuaMobileJs = semuaJs.filter((f) => /mobile/.test(f))
const pemakaiProfileCard = semuaMobileJs.filter((f) => /ProfileCard/.test(buangKomentar(readFileSync(f, 'utf8'))))
uji('Tidak ada berkas mobile yang memakai ProfileCard di kode', pemakaiProfileCard.join(','), '')

// Hanya boleh ada SATU komponen identitas yang dipakai di Beranda.
const KOMPONEN_IDENTITAS = ['ProfileCard', 'UserCard', 'GreetingCard', 'IdentitasCard', 'HeaderProfile', 'EmployeeCard']
const berandaKode = buangKomentar(readFileSync('src/pages/mobile/MobileBerandaPage.jsx', 'utf8'))
const dipakai = KOMPONEN_IDENTITAS.filter((n) => new RegExp(`<${n}[\\s/>]`).test(berandaKode))
uji('Beranda tidak memakai kartu identitas terpisah', dipakai.join(','), '')
// Avatar-nya boleh: itu foto, bukan kartu identitas.
ujiBenar('Beranda tetap menampilkan foto pegawai', berandaKode.includes('StaffAvatar'))

// Urutan: profile header dulu, lalu kartu Presensi Hari Ini.
const posNama = htmlBeranda.indexOf(namaLengkap)
const posPresensi = htmlBeranda.indexOf('Presensi Hari Ini')
ujiBenar('Profile header muncul sebelum kartu Presensi Hari Ini', posNama >= 0 && posPresensi > posNama, `nama@${posNama}, presensi@${posPresensi}`)

console.log('UJI RESPONSIF MODUL MOBILE')
console.log('='.repeat(104))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(104))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')