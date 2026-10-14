// ============================================================================
// UJI KARTU ID + QR PRESENSI (MOBILE GURU)
//
// Yang dijaga di sini:
//   1. Kartu ID mobile memakai komponen & data yang SAMA dengan Superadmin.
//   2. QR pada kartu dan QR pada halaman "QR Presensi" identik — tidak ada
//      dua kode yang berbeda untuk satu pegawai.
//   3. Kartu memuat seluruh data yang diminta (foto, nama, gelar, jabatan,
//      NIY/NIP, unit, logo yayasan, barcode, QR).
//   4. Tombol Download Kartu ID ada dan memakai utilitas PDF CR80.
//   5. Halaman QR Presensi terpisah, menjelaskan kegunaannya, dan tidak
//      membuat payload-nya sendiri.
//
// Jalankan: node scripts/test-kartu-qr.mjs
// ============================================================================

import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  employeeQrPayload, employeeQrInfo, cardQrValue, cardBarcodeValue,
  CARD_QR_PREFIX, CARD_QR_PREFIX_LABEL, CARD_SIZE_MM, PRINT_LAYOUTS, printLayoutByValue,
} from '../src/data/employeeCard.js'

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(58)} ${String(aktual).padEnd(26)} (harapan: ${diharapkan})`)
}

function ujiBenar(nama, kondisi, detail = '') {
  if (kondisi) lulus += 1
  else gagal += 1
  rincian.push(`${kondisi ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

// ============================================================================
// 1. PAYLOAD QR — SATU-SUMBER-KEBENARAN
// ============================================================================
const CONTOH = [
  { id: 1, niy: '049005069', nip: '198501012005011001', nama: 'Erianto, S.Ag, M.Pd.I' },
  { id: 4, niy: '049001054', nip: '198702022006012002', nama: 'Wisna Yunita, S.Pd' },
  { id: 9, niy: '', nip: '198003032001031003', nama: 'Tanpa NIY' },
  { id: 12, niy: '', nip: '', nama: 'Tanpa NIY dan NIP' },
]

uji('Prefix QR', CARD_QR_PREFIX, 'SIMPRESPEG-')
uji('Label prefix QR', CARD_QR_PREFIX_LABEL, 'SIMPRESPEG')
uji('Payload pakai NIY', employeeQrPayload(CONTOH[0]), 'SIMPRESPEG-049005069')
uji('Payload pakai NIY (guru kedua)', employeeQrPayload(CONTOH[1]), 'SIMPRESPEG-049001054')
uji('Cadangan ke NIP saat NIY kosong', employeeQrPayload(CONTOH[2]), 'SIMPRESPEG-198003032001031003')
uji('Cadangan ke id saat NIY & NIP kosong', employeeQrPayload(CONTOH[3]), 'SIMPRESPEG-12')
uji('Pegawai null -> payload kosong', employeeQrPayload(null), '')

// employeeQrInfo memecah payload untuk ditampilkan, tanpa mengubah isinya.
const info = employeeQrInfo(CONTOH[0])
uji('Info: nilai = payload', info.value, employeeQrPayload(CONTOH[0]))
uji('Info: identitas tanpa prefix', info.identitas, '049005069')
uji('Info: sumber NIY', info.sumber, 'NIY')
uji('Info: sumber NIP saat NIY kosong', employeeQrInfo(CONTOH[2]).sumber, 'NIP')
uji('Info: sumber id saat keduanya kosong', employeeQrInfo(CONTOH[3]).sumber, 'ID pegawai')

// Alias lama harus persis sama, bukan implementasi terpisah.
for (const c of CONTOH) {
  uji(`cardQrValue = employeeQrPayload (${c.nama})`, cardQrValue(c), employeeQrPayload(c))
}

// Barcode 1D memakai identitas yang sama dengan isi QR.
uji('Barcode = NIY', cardBarcodeValue(CONTOH[0]), '049005069')
uji('Barcode = NIP saat NIY kosong', cardBarcodeValue(CONTOH[2]), '198003032001031003')
ujiBenar('Identitas QR sama dengan barcode', employeeQrInfo(CONTOH[0]).identitas === cardBarcodeValue(CONTOH[0]))

// ============================================================================
// 2. UKURAN KARTU CR80
// ============================================================================
uji('Lebar kartu CR80 (mm)', CARD_SIZE_MM.width, 85.6)
uji('Tinggi kartu CR80 (mm)', CARD_SIZE_MM.height, 53.98)
uji('Layout CR80 tersedia', printLayoutByValue('cr80').pageFormat, 'card')
uji('Layout CR80 satu kartu per halaman', printLayoutByValue('cr80').columns * printLayoutByValue('cr80').rows, 1)
uji('Jumlah layout cetak', PRINT_LAYOUTS.length, 3)

// ============================================================================
// 3. RENDER HALAMAN MOBILE
// ============================================================================
function pasangSesi(niy) {
  const isi = new Map([['simpres.auth.session', JSON.stringify({ v: 1, user: { username: niy } })]])
  const storage = {
    getItem: (k) => (isi.has(k) ? isi.get(k) : null),
    setItem: (k, v) => isi.set(k, String(v)),
    removeItem: (k) => isi.delete(k),
  }
  // jspdf (dipakai utilitas ekspor PDF) membaca atob/btoa dari `window`.
  // Karena shim ini menggantikan window, kedua fungsi itu ikut dipasang.
  globalThis.window = {
    sessionStorage: storage,
    localStorage: storage,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  }
}
pasangSesi('049005069')

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const { SimPresProvider, useSimPres, selectSelfStaff, selectCardRows } = store
const KartuId = (await server.ssrLoadModule('/src/pages/mobile/MobileKartuIdPage.jsx')).default
const HalamanQr = (await server.ssrLoadModule('/src/pages/mobile/MobileQrPage.jsx')).default
const { EmployeeIdCard, EmployeeIdCardPrint } = await server.ssrLoadModule('/src/components/cards/EmployeeIdCard.jsx')
const CetakKartuIdPage = (await server.ssrLoadModule('/src/pages/CetakKartuIdPage.jsx')).default
await server.close()

let ctx = null
function Tangkap() {
  ctx = useSimPres()
  return null
}
renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Tangkap))))

const state = ctx.state
const staff = selectSelfStaff(state)
uji('Pegawai login terdeteksi', staff.niy, '049005069')

// --- Kartu ID -------------------------------------------------------------
const htmlKartu = renderToString(h(MemoryRouter, { initialEntries: ['/mobile/kartu-id'] }, h(SimPresProvider, null, h(KartuId))))
const htmlQr = renderToString(h(MemoryRouter, { initialEntries: ['/mobile/qr'] }, h(SimPresProvider, null, h(HalamanQr))))

ujiBenar('Halaman Kartu ID: judul kartu', htmlKartu.includes('Kartu ID Pegawai'))
ujiBenar('Halaman Kartu ID: ada pratinjau', htmlKartu.includes('Pratinjau Kartu'))
ujiBenar('Halaman Kartu ID: rasio CR80', htmlKartu.includes('85.6'))
ujiBenar('Halaman Kartu ID: ukuran CR80 tertulis', htmlKartu.includes('85.6 × 53.98 mm'))
ujiBenar('Halaman Kartu ID: tombol Download', htmlKartu.includes('Download Kartu ID'))
ujiBenar('Halaman Kartu ID: tombol ke QR Presensi', htmlKartu.includes('QR Presensi'))

// --- QR Presensi ----------------------------------------------------------
ujiBenar('Halaman QR: judul', htmlQr.includes('QR Presensi'))
ujiBenar('Halaman QR: ada SVG QR', htmlQr.includes('<svg') && htmlQr.includes('role="img"'))
ujiBenar('Halaman QR: kegunaan scan presensi', htmlQr.includes('Scan Presensi'))
ujiBenar('Halaman QR: kegunaan identifikasi', htmlQr.includes('Identifikasi Pegawai'))
ujiBenar('Halaman QR: menunjuk ke Kartu ID', htmlQr.includes('Lihat Kartu ID'))
ujiBenar('Halaman QR: barcode cadangan', htmlQr.includes('Barcode'))

// ============================================================================
// 4. SYARAT UTAMA: QR KARTU == QR PRESENSI
// ============================================================================
// QRCodeSvg menulis <title>{value}</title>, jadi nilai QR bisa dibaca langsung
// dari markup — tanpa perlu menebak dari teks UI.
function nilaiQrDalamMarkup(html) {
  const cocok = html.match(/<title>SIMPRESPEG-([^<]*)<\/title>/)
  return cocok ? `SIMPRESPEG-${cocok[1]}` : null
}

const qrDiKartu = nilaiQrDalamMarkup(htmlKartu)
const qrDiHalamanQr = nilaiQrDalamMarkup(htmlQr)

uji('Nilai QR terbaca dari markup Kartu ID', qrDiKartu, employeeQrPayload(staff))
uji('Nilai QR terbaca dari markup QR Presensi', qrDiHalamanQr, employeeQrPayload(staff))
uji('QR kartu = QR presensi', qrDiKartu, qrDiHalamanQr)
uji('Payload unik pegawai ini', qrDiKartu, 'SIMPRESPEG-049005069')

// Halaman QR menampilkan payload penuh sebagai teks, jadi pengguna bisa
// mencocokkannya dengan kartu.
ujiBenar('Halaman QR: payload tertulis', htmlQr.includes('SIMPRESPEG-049005069'))

// ============================================================================
// 5. KARTU MOBILE = KARTU SUPERADMIN
// ============================================================================
// Baris yang dipakai kartu mobile harus persis sama dengan selectCardRows(),
// yaitu baris yang dipakai halaman Cetak Kartu ID Superadmin.
const baris = selectCardRows(state, [staff])[0]
uji('Baris kartu: QR dari fungsi yang sama', baris.qr, employeeQrPayload(staff))
uji('Baris kartu: barcode dari fungsi yang sama', baris.barcode, cardBarcodeValue(staff))
ujiBenar('Baris kartu punya data terisi', Boolean(baris.card?.id))
ujiBenar('Baris kartu: masa berlaku ada', Boolean(baris.card?.expired_date))

// Wajah kartu yang sama dipakai preview, cetak, dan ekspor PDF.
const htmlWajah = renderToString(
  h(EmployeeIdCardPrint, { row: baris, settings: state.settings, units: state.units }),
)
const htmlWajahLayar = renderToString(
  h(EmployeeIdCard, { row: baris, settings: state.settings, units: state.units, selected: false, onToggle: () => {}, selectable: false }),
)
uji('QR pada wajah kartu = payload yang sama', nilaiQrDalamMarkup(htmlWajah), employeeQrPayload(staff))
uji('QR pada wajah kartu (mode layar) sama', nilaiQrDalamMarkup(htmlWajahLayar), employeeQrPayload(staff))

// Data yang harus muncul di kartu.
for (const [label, needle] of [
  ['nama resmi', staff.name],
  ['NIY', staff.niy],
  ['barcode', baris.barcode],
  ['nama yayasan', state.settings?.namaYayasan || 'Yayasan Pendidikan'],
  ['nama unit', baris.unit],
]) {
  ujiBenar(`Kartu memuat ${label}`, htmlWajah.includes(needle), needle)
}
// NIP hanya tampil bila ada; untuk pegawai ini NIP terisi.
if (staff.nip) ujiBenar('Kartu memuat NIP', htmlWajah.includes(staff.nip), staff.nip)
// Sapaan (Umi/Ustadz/Ustadzah) tampil sebagai nama dagang di atas nama resmi.
ujiBenar('Kartu memakai sapaan', htmlWajah.includes('Ustadz Erianto'))
// Jabatan tampil terpisah.
ujiBenar('Kartu memuat jabatan', htmlWajah.includes(staff.role), staff.role)

// ============================================================================
// 6. TIDAK ADA PAYLOAD QR YANG DIBUAT ULANG DI HALAMAN
// ============================================================================
// Kalau salah satu halaman merangkai prefix sendiri, kode bisa menyimpang
// dari kartu. Semua harus lewat employeeQrPayload().
const halamanQrSrc = readFileSync('src/pages/mobile/MobileQrPage.jsx', 'utf8')
const kartuSrc = readFileSync('src/pages/mobile/MobileKartuIdPage.jsx', 'utf8')
const employeeCardSrc = readFileSync('src/data/employeeCard.js', 'utf8')
const cetakSrc = readFileSync('src/pages/CetakKartuIdPage.jsx', 'utf8')

for (const [nama, src] of [['Halaman QR', halamanQrSrc], ['Halaman Kartu', kartuSrc], ['Halaman Cetak Superadmin', cetakSrc]]) {
  ujiBenar(`${nama} tidak merangkai prefix QR sendiri`, !/SIMPRESPEG-/.test(src))
  ujiBenar(`${nama} tidak menggabungkan prefix dengan sendirinya`, !/\$\{CARD_QR_PREFIX\}/.test(src))
}
// employeeCard.js punya satu-satunya perangkai; halaman Cetak Superadmin
// memakai selectCardRows(), yang memanggil fungsi itu di dalamnya. Inilah titik
// integrasi yang membuat kode di kartu cetak dan di mobile tidak mungkin beda.
ujiBenar('Halaman Cetak Superadmin memakai selectCardRows', /selectCardRows\(state,/.test(cetakSrc))
ujiBenar('selectCardRows menghasilkan QR dari fungsi terpusat', baris.qr === employeeQrPayload(staff))
ujiBenar('employeeCard.js punya satu-satunya perangkai', (employeeCardSrc.match(/\$\{CARD_QR_PREFIX\}\$\{/g) || []).length === 2)

// ============================================================================
// 7. DUA HALAMAN TERPISAH + AKSES GURU
// ============================================================================
const appSrc = readFileSync('src/App.jsx', 'utf8')
ujiBenar('Rute /mobile/kartu-id terdaftar', appSrc.includes('path="/mobile/kartu-id"'))
ujiBenar('Rute /mobile/qr terdaftar', appSrc.includes('path="/mobile/qr"'))
ujiBenar('Kartu ID dan QR adalah dua route berbeda', appSrc.includes('/mobile/kartu-id') && appSrc.includes('/mobile/qr'))

const storeSrc = readFileSync('src/store/simPresStore.jsx', 'utf8')
ujiBenar('Izin akses kartuIdMobile ada', storeSrc.includes("kartuIdMobile: ['view', 'add']"))
ujiBenar('Izin akses qrPresensiMobile ada', storeSrc.includes("qrPresensiMobile: ['view']"))
ujiBenar('Rute kartu & QR di daftar homes Guru', /'\/mobile\/kartu-id', '\/mobile\/qr'\]/.test(storeSrc))

// Menu cepat di Beranda memuat keduanya.
const berandaSrc = readFileSync('src/pages/mobile/MobileBerandaPage.jsx', 'utf8')
ujiBenar('Beranda punya menu Kartu ID', berandaSrc.includes("to: '/mobile/kartu-id'"))
ujiBenar('Beranda punya menu QR Presensi', berandaSrc.includes("to: '/mobile/qr'"))

// Profil sudah tidak lagi menampilkan QR seadanya.
const profilSrc = readFileSync('src/pages/mobile/MobileProfilPage.jsx', 'utf8')
ujiBenar('Profil tidak lagi merender QR langsung', !/QRCodeSvg/.test(profilSrc))
ujiBenar('Profil mengarahkan ke Kartu ID', profilSrc.includes("navigate('/mobile/kartu-id')"))
ujiBenar('Profil mengarahkan ke QR Presensi', profilSrc.includes("navigate('/mobile/qr')"))

// Ekspor PDF: halaman Kartu ID memakai utilitas CR80 yang sama dengan Superadmin.
const cardPrintSrc = readFileSync('src/utils/cardPrint.js', 'utf8')
ujiBenar('cardPrint mengekspor CardsToPdf', cardPrintSrc.includes('export async function exportCardsToPdf'))
ujiBenar('Halaman Kartu ID memakai exportCardsToPdf', kartuSrc.includes('exportCardsToPdf'))
ujiBenar('Halaman Kartu ID memakai layout cr80', kartuSrc.includes("layout: 'cr80'"))

console.log('UJI KARTU ID + QR PRESENSI (MOBILE)')
console.log('='.repeat(116))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(116))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')