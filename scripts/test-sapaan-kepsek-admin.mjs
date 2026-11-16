// ============================================================================
// UJI SAPAAN & NAMA BERGELAR UNTUK KEPALA SEKOLAH & ADMIN UNIT DI MOBILE
// ============================================================================

import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  getUnitShortName,
  getLeaderRoleGreeting,
  formatNamaGelar,
  getLeaderDisplayName,
} from '../src/data/sapaanPegawai.js'

let lulus = 0
let gagal = 0

function assert(nama, kondisi, detail = '') {
  if (kondisi) {
    lulus += 1
    console.log(`✅ LULUS: ${nama}`)
  } else {
    gagal += 1
    console.error(`❌ GAGAL: ${nama} — ${detail}`)
  }
}

console.log('--- 1. Testing Helper Functions ---')
assert('getUnitShortName for SD', getUnitShortName({ id: 'sd', nama: 'SDIT Attin Sumbar' }) === 'SDIT')
assert('getUnitShortName for SMP', getUnitShortName({ id: 'smp', nama: 'SMPIT Attin Sumbar' }) === 'SMPIT')
assert('getUnitShortName for SMA', getUnitShortName({ id: 'sma', nama: 'SMAIT Attin Sumbar' }) === 'SMAIT')
assert('getUnitShortName for TK', getUnitShortName({ id: 'tk', nama: 'TKIT Attin Sumbar' }) === 'TKIT')

assert('getLeaderRoleGreeting for Kepsek SD', getLeaderRoleGreeting('Kepala Sekolah', { id: 'sd' }) === 'Kepala Sekolah SDIT')
assert('getLeaderRoleGreeting for Admin SD', getLeaderRoleGreeting('Admin Unit', { id: 'sd' }) === 'Admin SDIT')

assert('formatNamaGelar without duplicate', formatNamaGelar({ name: 'Drs. H. Ahmad Fauzi, M.Pd', gelar: 'M.Pd' }) === 'Drs. H. Ahmad Fauzi, M.Pd')
assert('formatNamaGelar append gelar', formatNamaGelar({ name: 'Ahmad Fauzi', gelar: 'M.Pd' }) === 'Ahmad Fauzi, M.Pd')

console.log('\n--- 2. Testing SSR Render Beranda Mobile for Kepsek & Admin ---')
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const { SimPresProvider } = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const Beranda = (await server.ssrLoadModule('/src/pages/mobile/MobileBerandaPage.jsx')).default
await server.close()

function pasangSesiUser(userObj) {
  const isi = new Map([['simpres.auth.session', JSON.stringify({ v: 1, user: userObj })]])
  const storage = {
    getItem: (k) => (isi.has(k) ? isi.get(k) : null),
    setItem: (k, v) => isi.set(k, String(v)),
    removeItem: (k) => isi.delete(k),
  }
  globalThis.window = { sessionStorage: storage, localStorage: storage }
}

// Test A: Kepala Sekolah SDIT
pasangSesiUser({ username: 'kepalasd', niy: '019001013', role: 'Kepala Sekolah', unitId: 'sd' })
let html = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Beranda))))
let text = html.replace(/<!--[\s\S]*?-->/g, '')

assert('Beranda Kepsek SDIT: Terdapat sapaan Halo,', text.includes('Halo,'))
assert('Beranda Kepsek SDIT: Terdapat sapaan Kepala Sekolah SDIT', text.includes('Kepala Sekolah SDIT'))
assert('Beranda Kepsek SDIT: Di bawah sapaan terdapat nama kepala sekolah beserta gelar (Drs. H. Ahmad Fauzi, M.Pd)', text.includes('Drs. H. Ahmad Fauzi, M.Pd'))
assert('Beranda Kepsek SDIT: Terdapat badge peran Kepala Sekolah', text.includes('Kepala Sekolah'))

// Test B: Admin Unit SDIT
pasangSesiUser({ username: 'adminsd1', niy: '019001008', role: 'Admin Unit', unitId: 'sd' })
html = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Beranda))))
text = html.replace(/<!--[\s\S]*?-->/g, '')

assert('Beranda Admin SDIT: Terdapat sapaan Halo,', text.includes('Halo,'))
assert('Beranda Admin SDIT: Terdapat sapaan Admin SDIT', text.includes('Admin SDIT'))
assert('Beranda Admin SDIT: Di bawah sapaan terdapat nama admin beserta gelar (Fajar Pratama, S.Kom)', text.includes('Fajar Pratama, S.Kom'))
assert('Beranda Admin SDIT: Terdapat badge peran Admin Unit', text.includes('Admin Unit'))

// Test C: Kepala Sekolah SMPIT
pasangSesiUser({ username: 'kepalasmp', niy: '019001014', role: 'Kepala Sekolah', unitId: 'smp' })
html = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Beranda))))
text = html.replace(/<!--[\s\S]*?-->/g, '')

assert('Beranda Kepsek SMPIT: Terdapat sapaan Kepala Sekolah SMPIT', text.includes('Kepala Sekolah SMPIT'))
assert('Beranda Kepsek SMPIT: Terdapat nama Dra. Hj. Nurhasanah, M.Pd', text.includes('Dra. Hj. Nurhasanah, M.Pd'))

// Test D: Guru biasa tetap memakai sapaan santun (Ustadz/Ustadzah/Umi)
pasangSesiUser({ username: '049005069', niy: '049005069', role: 'Guru', unitId: 'smp' })
html = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Beranda))))
text = html.replace(/<!--[\s\S]*?-->/g, '')

assert('Beranda Guru: Menampilkan sapaan santun Halo, Ustadz', text.includes('Halo, Ustadz'))
assert('Beranda Guru: Menampilkan nama lengkap Erianto, S.Ag, M.Pd.I', text.includes('Erianto, S.Ag, M.Pd.I'))

console.log('\n============================================================')
console.log(`Total pengujian: ${lulus + gagal} | Lulus: ${lulus} | Gagal: ${gagal}`)
if (gagal > 0) process.exit(1)
console.log('SEMUA PENGUJIAN SAPAAN KEPALA SEKOLAH & ADMIN LULUS 100%')
