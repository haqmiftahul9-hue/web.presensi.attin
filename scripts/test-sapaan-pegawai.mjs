// ============================================================================
// UJI SAPAAN PEGAWAI (getEmployeeGreeting)
//
// Menjamin dua hal:
//   1. Aturan sapaan benar: unit TK -> Umi, selain itu gender -> Ustadz/Ustadzah.
//   2. Tidak ada halaman yang mengarang sapaan sendiri (Bapak/Ibu) atau menulis
//      kata sapaan secara hardcode di luar modul terpusat.
//
// Jalankan: node scripts/test-sapaan-pegawai.mjs
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  getEmployeeGreeting,
  getEmployeeSalutation,
  getEmployeeFormalName,
  isTKUnit,
  normalisasiGender,
  namaTanpaGelar,
  SAPAAN_TK,
  SAPAAN_LAKI,
  SAPAAN_PEREMPUAN,
} from '../src/data/sapaanPegawai.js'

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(62)} ${String(aktual).padEnd(26)} (harapan: ${diharapkan})`)
}

/** Uji kondisi benar/salah (bukan perbandingan nilai). */
function ujiBenar(nama, kondisi, detail = '') {
  if (kondisi) lulus += 1
  else gagal += 1
  rincian.push(`${kondisi ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

// ============================================================================
// 1. CONTOH DARI SPESIFIKASI
// ============================================================================
uji('Laki-laki (non-TK) -> Ustadz', getEmployeeGreeting({ name: 'Ahmad Fauzi', jenisKelamin: 'Laki-laki', unitId: 'smp' }), 'Ustadz Ahmad Fauzi')
uji('Perempuan (non-TK) -> Ustadzah', getEmployeeGreeting({ name: 'Siti Rahma', jenisKelamin: 'Perempuan', unitId: 'sd' }), 'Ustadzah Siti Rahma')
uji('Unit TKIT -> Umi', getEmployeeGreeting({ name: 'Aisyah', jenisKelamin: 'Perempuan', unitId: 'tk' }), 'Umi Aisyah')

// ============================================================================
// 2. ATURAN PER UNIT
// ============================================================================
for (const [unitId, gender, diharapkan, alasan] of [
  ['smp', 'Laki-laki', 'Ustadz Bens', 'SMP laki-laki'],
  ['sd', 'Laki-laki', 'Ustadz Bens', 'SD laki-laki'],
  ['sma', 'Laki-laki', 'Ustadz Bens', 'SMA laki-laki'],
  ['tk', 'Laki-laki', 'Umi Bens', 'TK laki-laki (gender diabaikan)'],
  ['smp', 'Perempuan', 'Ustadzah Sari', 'SMP perempuan'],
  ['sd', 'Perempuan', 'Ustadzah Sari', 'SD perempuan'],
  ['sma', 'Perempuan', 'Ustadzah Sari', 'SMA perempuan'],
  ['tk', 'Perempuan', 'Umi Sari', 'TK perempuan'],
]) {
  uji(`${alasan} -> ${diharapkan}`, getEmployeeGreeting({ name: gender === 'Perempuan' ? 'Sari' : 'Bens', jenisKelamin: gender, unitId }), diharapkan)
}

// Unit tanpa id (unit belum ditugaskan) diperlakukan sebagai non-TK.
uji('Unit tidak diketahui -> ikut gender', getEmployeeGreeting({ name: 'Bens', jenisKelamin: 'Laki-laki' }), 'Ustadz Bens')
uji('Unit tidak diketahui, perempuan -> Ustadzah', getEmployeeGreeting({ name: 'Sari', jenisKelamin: 'Perempuan' }), 'Ustadzah Sari')

// Deteksi unit TK menerima beberapa|id umum.
uji('Unit "tkit" dikenali sebagai TK', isTKUnit({ unitId: 'tkit' }), true)
uji('Unit "tk-2" dikenali sebagai TK', isTKUnit({ unitId: 'tk-2' }), true)
uji('Unit "sma" bukan TK', isTKUnit({ unitId: 'sma' }), false)
uji('Tanpa id, kode unit "UNT-TK-01" dikenali', isTKUnit({}, { kode: 'UNT-TK-01', nama: 'TKIT Attin Sumbar' }), true)
uji('Tanpa id, unit SD bukan TK', isTKUnit({}, { kode: 'UNT-SD-02', nama: 'SDIT Attin Sumbar' }), false)

// ============================================================================
// 3. GENDER TIDAK DILEWATI: TIDAK MENEBAK
// ============================================================================
uji('Gender kosong -> nama saja (L)', getEmployeeGreeting({ name: 'Bens', jenisKelamin: '', unitId: 'smp' }), 'Bens')
uji('Gender kosong -> nama saja (P)', getEmployeeGreeting({ name: 'Sari', jenisKelamin: null, unitId: 'sd' }), 'Sari')
uji('Gender tidak dikenal -> nama saja', getEmployeeGreeting({ name: 'Rina', jenisKelamin: 'Tidak diisi', unitId: 'sd' }), 'Rina')
uji('Gender kosong di TK tetap Umi', getEmployeeGreeting({ name: 'Aisyah', jenisKelamin: '', unitId: 'tk' }), 'Umi Aisyah')
uji('Sapaan kosong saat gender kosong', getEmployeeSalutation({ jenisKelamin: '', unitId: 'sd' }), '')

// Normalisasi berbagai penulisan gender dari impor.
uji('Normalisasi "L"', normalisasiGender('L'), 'L')
uji('Normalisasi "Lk"', normalisasiGender('Lk'), 'L')
uji('Normalisasi "Pria"', normalisasiGender('Pria'), 'L')
uji('Normalisasi "P"', normalisasiGender('P'), 'P')
uji('Normalisasi "Wanita"', normalisasiGender('Wanita'), 'P')
uji('Normalisasi "laki-laki"', normalisasiGender('Laki-laki'), 'L')
uji('Normalisasi tidak dikenal -> kosong', normalisasiGender('X'), '')
uji('Pegawai tanpa field gender -> kosong', normalisasiGender(undefined), '')

// ============================================================================
// 4. GELAR DAN NAMA RESMI
// ============================================================================
uji('Gelar dibuang dari sapaan', getEmployeeGreeting({ name: 'Erianto, S.Ag, M.Pd.I', jenisKelamin: 'Laki-laki', unitId: 'smp' }), 'Ustadz Erianto')
uji('Nama tanpa gelar (fungsi dasar)', namaTanpaGelar('Hendra Kurniawan, S.Pd.I'), 'Hendra Kurniawan')
uji('Sapaan dengan gelar saat diminta', getEmployeeGreeting({ name: 'Aisyah, S.Pd', jenisKelamin: 'Perempuan', unitId: 'tk' }, { useTitle: true }), 'Umi Aisyah, S.Pd')
uji('Nama resmi tetap memakai gelar', getEmployeeFormalName({ name: 'Erianto, S.Ag, M.Pd.I' }), 'Erianto, S.Ag, M.Pd.I')
uji('Nama resmi tanpa data -> Pengguna', getEmployeeFormalName({}), 'Pengguna')
uji('Pegawai null tidak membuat crash', getEmployeeGreeting(null), '')
uji('Konstanta kata sapaan', [SAPAAN_TK, SAPAAN_LAKI, SAPAAN_PEREMPUAN].join('/'), 'Umi/Ustadz/Ustadzah')

// ============================================================================
// 5. TIDAK ADA HARDCODE: SAPAAN DI HALAMAN
// ============================================================================
function kumpulkanFile(dir, acc = []) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) kumpulkanFile(p, acc)
    else if (/\.(js|jsx)$/.test(nama)) acc.push(p)
  }
  return acc
}

const MODUL_SAPAAN = 'sapaanPegawai.js'
const halaman = kumpulkanFile('src').filter((f) => !f.endsWith(MODUL_SAPAAN))

// Komentar sah yang menjelaskan aturan sapaan tidak boleh dianggap pelanggaran,
// jadi komentar dibuang sebelum pindaian.
function buangKomentar(isi) {
  return isi
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
}

const hardcode = []
for (const file of halaman) {
  const isi = buangKomentar(readFileSync(file, 'utf8'))
  isi.split('\n').forEach((baris, i) => {
    if (/^\s*\*?\s*(\/\*|\*)/.test(baris)) return
    // Kata sapaan lama tidak boleh muncul sebagai teks UI di mana pun.
    if (/(^|[^A-Za-z])(Bapak|Bu|Ibu)([^A-Za-z]|$)/.test(baris)) {
      hardcode.push(`${file}:${i + 1}  ${baris.trim()}`)
    }
    // Kata sapaan baru hanya boleh muncul sebagai hasil fungsi, bukan literal.
    if (/(^|[^A-Za-z])(Umi|Ustadz|Ustadzah)([^A-Za-z]|$)/.test(baris)) {
      hardcode.push(`${file}:${i + 1}  kata sapaan ditulis langsung: ${baris.trim()}`)
    }
  })
}
ujiBenar('Tidak ada kata sapaan hardcode di luar modul', hardcode.length === 0, hardcode.join(' | '))

// Halaman yang menampilkan sapaan wajib memanggil fungsi terpusat.
const PEMAKAI = [
  'src/pages/mobile/MobileBerandaPage.jsx',
  'src/pages/mobile/MobilePresensiPage.jsx',
  'src/pages/mobile/MobileProfilPage.jsx',
  'src/components/cards/EmployeeIdCard.jsx',
  'src/components/StaffTable.jsx',
  'src/data/employeeCard.js',
]
const tanpaFungsi = PEMAKAI.filter((file) => !/getEmployeeGreeting|getEmployeeSalutation|getEmployeeFormalName/.test(readFileSync(file, 'utf8')))
ujiBenar('Semua halaman memakai fungsi sapaan terpusat', tanpaFungsi.length === 0, tanpaFungsi.join(' | '))

// Fungsi lama sapaan() harus hilang supaya tidak ada dua sumber kebenaran.
const isiPresensiMobile = readFileSync('src/data/presensiMobile.js', 'utf8')
ujiBenar('Fungsi sapaan() lama di presensiMobile sudah dihapus', !/export function sapaan\(/.test(isiPresensiMobile))
ujiBenar('presensiMobile mengekspor ulang modul terpusat', /from '\.\/sapaanPegawai\.js'/.test(isiPresensiMobile))

// ============================================================================
// 6. SEMUA PEGAWAI HASIL SEED PUNYA SAPAAN
// ============================================================================
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const { STAFF, UNITS, buildFullStaff } = await server.ssrLoadModule('/src/data/seed.js')
await server.close()

const semuaPegawai = buildFullStaff()

// Daftar yang benar-benar dipakai aplikasi adalah buildFullStaff(), dan
// jumlahnya harus sama dengan jumlah UNIT (22+65+48+54).
uji('Jumlah pegawai = jumlah UNIT', semuaPegawai.length, UNITS.reduce((n, u) => n + u.total, 0))

const unitById = new Map(UNITS.map((u) => [u.id, u]))
const tanpaSapaan = semuaPegawai.filter((s) => !getEmployeeSalutation(s, unitById.get(s.unitId)))
ujiBenar(
  'Semua pegawai punya kata sapaan',
  tanpaSapaan.length === 0,
  `${tanpaSapaan.length} tanpa sapaan: ${tanpaSapaan.slice(0, 5).map((s) => s.name).join(', ')}`,
)

const tkStaff = semuaPegawai.filter((s) => s.unitId === 'tk')
ujiBenar(
  'Semua pegawai unit TK memakai "Umi"',
  tkStaff.length > 0 && tkStaff.every((s) => getEmployeeSalutation(s).startsWith(SAPAAN_TK)),
  `${tkStaff.length} pegawai TK`,
)
const nonTk = semuaPegawai.filter((s) => s.unitId !== 'tk')
ujiBenar('Tidak ada pegawai non-TK memakai "Umi"', nonTk.every((s) => getEmployeeSalutation(s) !== SAPAAN_TK))
ujiBenar('Tidak ada pegawai non-TK tanpa sapaan', nonTk.every((s) => getEmployeeSalutation(s) !== ''), `${nonTk.length} pegawai non-TK`)

// Distribusi sapaan harus mengikuti gender, bukan acak.
const lakiLaki = nonTk.filter((s) => normalisasiGender(s.jenisKelamin) === 'L')
const perempuan = nonTk.filter((s) => normalisasiGender(s.jenisKelamin) === 'P')
ujiBenar('Semua.non-TK laki-laki memakai "Ustadz"', lakiLaki.every((s) => getEmployeeSalutation(s) === SAPAAN_LAKI), `${lakiLaki.length} pegawai`)
ujiBenar('Semua non-TK perempuan memakai "Ustadzah"', perempuan.every((s) => getEmployeeSalutation(s) === SAPAAN_PEREMPUAN), `${perempuan.length} pegawai`)
ujiBenar('Jumlah gender tercakup seluruh non-TK', lakiLaki.length + perempuan.length === nonTk.length, `${lakiLaki.length} + ${perempuan.length} vs ${nonTk.length}`)

// Contoh nyata dari data seed.
const erianto = semuaPegawai.find((s) => s.unitId === 'smp' && s.jenisKelamin === 'Laki-laki')
uji('Contoh nyata: guru SMP laki-laki', getEmployeeGreeting(erianto), `Ustadz ${namaTanpaGelar(erianto.name)}`)
const guruTK = semuaPegawai.find((s) => s.unitId === 'tk')
uji('Contoh nyata: guru TK', getEmployeeGreeting(guruTK), `Umi ${namaTanpaGelar(guruTK.name)}`)
const guruTKPerempuan = semuaPegawai.find((s) => s.unitId === 'tk' && s.jenisKelamin === 'Perempuan')
uji('Contoh nyata: guru TK perempuan tetap Umi', getEmployeeSalutation(guruTKPerempuan), SAPAAN_TK)

// Baris contoh di STAFF juga harus ikut aturan yang sama.
ujiBenar('Baris STAFF manual juga punya sapaan', STAFF.every((s) => getEmployeeSalutation(s, unitById.get(s.unitId)) !== ''))

// ============================================================================
// 7. SAPAAN MUNCUL DI HASIL RENDER (dashboard, profil, kartu ID)
// ============================================================================
function pasangSesi(niy) {
  const isi = new Map([['simpres.auth.session', JSON.stringify({ v: 1, user: { username: niy } })]])
  const storage = {
    getItem: (k) => (isi.has(k) ? isi.get(k) : null),
    setItem: (k, v) => isi.set(k, String(v)),
    removeItem: (k) => isi.delete(k),
  }
  globalThis.window = { sessionStorage: storage, localStorage: storage }
}
pasangSesi(erianto.niy)

const server2 = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const { SimPresProvider } = await server2.ssrLoadModule('/src/store/simPresStore.jsx')
const Beranda = (await server2.ssrLoadModule('/src/pages/mobile/MobileBerandaPage.jsx')).default
const Profil = (await server2.ssrLoadModule('/src/pages/mobile/MobileProfilPage.jsx')).default
const Presensi = (await server2.ssrLoadModule('/src/pages/mobile/MobilePresensiPage.jsx')).default
const { EmployeeIdCard } = await server2.ssrLoadModule('/src/components/cards/EmployeeIdCard.jsx')
const { mergeCardWithStaff } = await server2.ssrLoadModule('/src/data/employeeCard.js')
await server2.close()

const namaDepan = namaTanpaGelar(erianto.name)
const htmlBeranda = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Beranda))))
// React menyisipkan komentar pemisah antar-teks ("Halo,<!-- --> Ustadz"),
// jadi komentar dibuang sebelum kalimat dicocokkan.
const teksBeranda = htmlBeranda.replace(/<!--[\s\S]*?-->/g, '')
// Beranda memisahkan kata sapaan dari nama ("Halo, Ustadz" + nama lengkap),
// supaya nama pegawai tidak muncul dua kali. Karena itu sapaannya dicek
// sebagai kata tersendiri, bukan sebagai gabungan dengan nama.
ujiBenar('Beranda menampilkan kata sapaan', teksBeranda.includes('Halo, Ustadz'))
ujiBenar('Beranda menampilkan nama lengkap', teksBeranda.includes(erianto.name))
ujiBenar('Beranda tidak lagi menampilkan Bapak/Ibu', !/(^|[^A-Za-z])(Bapak|Bu|Ibu)([^A-Za-z]|$)/.test(htmlBeranda))

const htmlProfil = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Profil))))
ujiBenar('Profil menampilkan sapaan', htmlProfil.includes(`Ustadz ${namaDepan}`))
ujiBenar('Profil tetap menampilkan nama resmi', htmlProfil.includes(erianto.name))

const htmlPresensi = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Presensi))))
ujiBenar('Halaman presensi menampilkan sapaan', htmlPresensi.includes(`Ustadz ${namaDepan}`))

// Kartu ID memakai baris gabungan dari mergeCardWithStaff.
const barisKartu = mergeCardWithStaff(null, erianto)
uji('Kartu ID membawa sapaan pada barisnya', barisKartu.greeting, `Ustadz ${namaDepan}`)
const htmlKartu = renderToString(
  h(EmployeeIdCard, { row: barisKartu, settings: { namaYayasan: 'Yayasan' }, units: UNITS, selectable: false }),
)
ujiBenar('Kartu ID menampilkan sapaan', htmlKartu.includes(`Ustadz ${namaDepan}`))
ujiBenar('Kartu ID tetap mencetak nama resmi', htmlKartu.includes(erianto.name))

console.log('UJI SAPAAN PEGAWAI')
console.log('='.repeat(116))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(116))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')