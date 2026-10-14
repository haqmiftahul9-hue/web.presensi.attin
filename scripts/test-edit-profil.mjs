// ============================================================================
// UJI EDIT DATA PRIBADI GURU <-> DATA MASTER SUPERADMIN
//
// Menutup:
//   1. Guru boleh mengubah 7 field yang ditentukan, tidak boleh mengubah
//      field terkunci — termasuk saat field terkunci dikirim diam-diam.
//   2. Perubahan guru langsung terlihat di data master (selector Superadmin).
//   3. Perubahan Superadmin (nama, foto, jabatan, unit) langsung terlihat di
//      data mobile guru — dua arah.
//   4. Setiap perubahan menulis log: siapa, kapan, sebelum, sesudah.
//   5. Validasi isian profil.
//
// Jalankan: node scripts/test-edit-profil.mjs
// ============================================================================

import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  FIELD_PROFIL, FIELD_TERKUNCI, FIELD_FOTO, KUNCI_BOLEH_EDIT,
  ambilPerubahanProfil, ringkasPerubahanProfil, validasiProfil,
  isianAwalProfil, MAKS_FOTO_BYTES, TIPE_FOTO_DITERIMA,
} from '../src/data/profilGuru.js'
import { cardPhotoOf } from '../src/data/employeeCard.js'

let lulus = 0
let gagal = 0
const rincian = []

function uji(nama, aktual, diharapkan) {
  const ok = aktual === diharapkan
  if (ok) lulus += 1
  else gagal += 1
  rincian.push(`${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(56)} ${String(aktual).padEnd(24)} (harapan: ${diharapkan})`)
}

function ujiBenar(nama, kondisi, detail = '') {
  if (kondisi) lulus += 1
  else gagal += 1
  rincian.push(`${kondisi ? 'LULUS' : 'GAGAL'}  ${nama}${detail ? ` — ${detail}` : ''}`)
}

// ============================================================================
// 1. DAFTAR FIELD
// ============================================================================
const WAJIB_BOLEH_EDIT = ['name', 'kontak', 'email', 'alamat', 'tempatLahir', 'tanggalLahir']
for (const key of WAJIB_BOLEH_EDIT) {
  ujiBenar(`Boleh diedit: ${key}`, KUNCI_BOLEH_EDIT.includes(key))
  ujiBenar(`Ada label untuk ${key}`, FIELD_PROFIL.some((f) => f.key === key))
}
ujiBenar('Foto boleh diedit', KUNCI_BOLEH_EDIT.includes('foto'))
uji('Foto punya label', FIELD_FOTO.label, 'Foto')

for (const key of ['niy', 'nip', 'role', 'unitId', 'statusPegawai']) {
  ujiBenar(`Terkunci: ${key}`, FIELD_TERKUNCI.some((f) => f.key === key))
  ujiBenar(`${key} tidak boleh diedit guru`, !KUNCI_BOLEH_EDIT.includes(key))
}
uji('Jumlah field terkunci', FIELD_TERKUNCI.length, 7)
const dobel = KUNCI_BOLEH_EDIT.filter((k) => FIELD_TERKUNCI.some((f) => f.key === k))
uji('Tidak ada field dobel', dobel.join(','), '')

// ============================================================================
// 2. PERHITUNGAN PERUBAHAN (fungsi murni)
// ============================================================================
const PEGAWAI = {
  id: 1,
  niy: '049005069',
  nip: '198501012005011001',
  name: 'Erianto, S.Ag, M.Pd.I',
  role: 'Guru PAI',
  unitId: 'smp',
  status: 'Aktif',
  statusPegawai: 'PNS',
  jenisKelamin: 'Laki-laki',
  kontak: '081234567890',
  email: 'erianto@simpres.sch.id',
  alamat: 'Jl. Cendekia No. 45, Jakarta Selatan',
  tempatLahir: 'Jakarta',
  tanggalLahir: '1985-01-01',
  foto: 'https://contoh.sch.id/foto.jpg',
}

const gantiHp = ambilPerubahanProfil(PEGAWAI, { kontak: '081298765432' })
uji('Patch hanya berisi kontak', Object.keys(gantiHp.patch).join(','), 'kontak')
uji('Perubahan: label', gantiHp.perubahan[0].label, 'Nomor HP')
uji('Perubahan: nilai sebelum', gantiHp.perubahan[0].sebelum, '081234567890')
uji('Perubahan: nilai sesudah', gantiHp.perubahan[0].sesudah, '081298765432')
uji('Ringkasan perubahan', ringkasPerubahanProfil(gantiHp.perubahan), 'Nomor HP: 081234567890 → 081298765432')

const sama = ambilPerubahanProfil(PEGAWAI, { kontak: '081234567890' })
uji('Nilai tidak berubah -> patch kosong', Object.keys(sama.patch).length, 0)
uji('Nilai tidak berubah -> ringkasan default', ringkasPerubahanProfil(sama.perubahan), 'Tidak ada data yang berubah')

const banyak = ambilPerubahanProfil(PEGAWAI, {
  name: 'Erianto Adi, S.Ag, M.Pd.I',
  email: 'erianto.adi@simpres.sch.id',
  tempatLahir: 'Bandung',
})
uji('Tiga field terpakai', banyak.perubahan.length, 3)
uji('Urutan mengikuti daftar field', banyak.perubahan.map((p) => p.field).join(','), 'name,email,tempatLahir')
uji('Label nama', banyak.perubahan.find((p) => p.field === 'name').label, 'Nama Lengkap')

// PAGR: field terkunci yang dikirim ikut harus dibuang.
const bobol = ambilPerubahanProfil(PEGAWAI, {
  kontak: '081298765432',
  niy: '999999999',
  nip: '199999999999999999',
  role: 'Kepala Unit',
  unitId: 'sd',
  status: 'Nonaktif',
  statusPegawai: 'Honorer',
  jenisKelamin: 'Perempuan',
})
uji('Patch tidak memuat field terkunci', Object.keys(bobol.patch).join(','), 'kontak')
uji('Jumlah field ditolak', bobol.ditolak.length, 7)
uji('Detail field ditolak', bobol.ditolak.map((d) => d.field).join(','), 'niy,nip,role,unitId,status,statusPegawai,jenisKelamin')

const kosongkan = ambilPerubahanProfil(PEGAWAI, { alamat: '' })
uji('Mengosongkan alamat tercatat', kosongkan.perubahan[0].sesudah, '')
uji('Ringkasan menampilkan "(kosong)"', ringkasPerubahanProfil(kosongkan.perubahan), 'Alamat: Jl. Cendekia No. 45, Jakarta Selatan → (kosong)')

const gantiFoto = ambilPerubahanProfil(PEGAWAI, { foto: 'data:image/png;base64,AAA' })
uji('Foto masuk patch', gantiFoto.patch.foto, 'data:image/png;base64,AAA')
uji('Label foto', gantiFoto.perubahan[0].label, 'Foto')

// PAGR KUNCI UTAMA: setiap kunci form harus benar-benar ada di data master.
// Kalau ada typo (mis. "nama" vs "name"), perubahan akan diam-diam membuat
// field baru dan tidak pernah sampai ke portal Superadmin.
const takDikenal = KUNCI_BOLEH_EDIT.filter((k) => !(k in PEGAWAI))
uji('Semua kunci boleh-edit ada di data master', takDikenal.join(','), '')
const terkunciTakAda = FIELD_TERKUNCI.filter((f) => !(f.key in PEGAWAI))
uji('Semua kunci terkunci ada di data master', terkunciTakAda.map((f) => f.key).join(','), '')

// ============================================================================
// 3. VALIDASI ISIAN
// ============================================================================
ujiBenar('Nama kosong ditolak', Boolean(validasiProfil({ nama: '' }).nama))
uji('Nama terisi diterima', validasiProfil({ nama: 'Ahmad Fauzi' }).nama, undefined)
ujiBenar('Nama terlalu panjang ditolak', Boolean(validasiProfil({ nama: 'a'.repeat(121) }).nama))
ujiBenar('Email tidak valid ditolak', Boolean(validasiProfil({ nama: 'A', email: 'bukan-email' }).email))
uji('Email valid diterima', validasiProfil({ nama: 'A', email: 'a@b.co' }).email, undefined)
ujiBenar('HP huruf ditolak', Boolean(validasiProfil({ nama: 'A', kontak: '0812abc' }).kontak))
uji('HP kosong diterima (opsional)', validasiProfil({ nama: 'A', kontak: '' }).kontak, undefined)
ujiBenar('Tanggal lahir format salah ditolak', Boolean(validasiProfil({ nama: 'A', tanggalLahir: '01-01-1985' }).tanggalLahir))
ujiBenar('Tanggal lahir tak masuk akal ditolak', Boolean(validasiProfil({ nama: 'A', tanggalLahir: '1800-01-01' }).tanggalLahir))
uji('Tanggal lahir wajar diterima', validasiProfil({ nama: 'A', tanggalLahir: '1985-01-01' }).tanggalLahir, undefined)
uji('Isian awal memuat 6 field', Object.keys(isianAwalProfil(PEGAWAI)).length, 6)
uji('Isian awal sesuai data master', isianAwalProfil(PEGAWAI).kontak, '081234567890')
uji('Batas foto 2 MB', MAKS_FOTO_BYTES, 2 * 1024 * 1024)
uji('Tipe foto diterima', TIPE_FOTO_DITERIMA.join(','), 'image/jpeg,image/png,image/webp')

// ============================================================================
// 4. INTEGRASI STORE — dua arah guru <-> superadmin
// ============================================================================
const NIY_GURU = '049005069'
const isiSesi = new Map([['simpres.auth.session', JSON.stringify({ v: 1, user: { username: NIY_GURU } })]])
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
}

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const {
  SimPresProvider, useSimPres, simPresReducer,
  selectSelfStaff, selectStaffById, selectFilteredStaff, selectCardRows,
} = store
await server.close()

let ctx = null
function Tangkap() {
  ctx = useSimPres()
  return null
}
renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(Tangkap))))

const state0 = ctx.state
const staff0 = selectSelfStaff(state0)
const idGuru = staff0.id
uji('Guru login terdeteksi', staff0.niy, NIY_GURU)
const jumlahLogAwal = state0.logs.length

// --- 4a. GURU MENGUBAH NOMOR HP & EMAIL ------------------------------------
const setelahHp = simPresReducer(state0, {
  type: 'UPDATE_STAFF_PROFILE',
  payload: { kontak: '081298765432', email: 'erianto.adi@simpres.sch.id' },
})
const guruHp = selectSelfStaff(setelahHp)
uji('a. Mobile: kontak berubah', guruHp.kontak, '081298765432')
uji('a. Mobile: email berubah', guruHp.email, 'erianto.adi@simpres.sch.id')
uji('a. Mobile: nama tidak ikut berubah', guruHp.name, staff0.name)

// Sisi Superadmin membaca data yang sama lewat selector halaman Data Guru.
const barisAdmin = selectFilteredStaff(setelahHp).find((s) => s.id === idGuru)
uji('b. Superadmin melihat kontak baru', barisAdmin.kontak, '081298765432')
uji('b. Superadmin melihat email baru', barisAdmin.email, 'erianto.adi@simpres.sch.id')
uji('b. Data master satu baris', selectStaffById(setelahHp, idGuru).kontak, '081298765432')
uji('b. Jumlah pegawai tidak bertambah', setelahHp.staff.length, state0.staff.length)

// --- 4b. GURU MENCUBA MENGUBAH FIELD TERKUNCI -----------------------------
const coba = simPresReducer(setelahHp, {
  type: 'UPDATE_STAFF_PROFILE',
  payload: {
    name: 'Nama Versi Baru',
    niy: '999999999',
    nip: '199999999999999999',
    role: 'Kepala Unit',
    unitId: 'sd',
    status: 'Nonaktif',
    statusPegawai: 'Honorer',
    jenisKelamin: 'Perempuan',
  },
})
const g2 = selectStaffById(coba, idGuru)
uji('c. Nama tetap boleh berubah', g2.name, 'Nama Versi Baru')
uji('c. NIY tidak berubah', g2.niy, staff0.niy)
uji('c. NIP tidak berubah', g2.nip, staff0.nip)
uji('c. Jabatan tidak berubah', g2.role, staff0.role)
uji('c. Unit tidak berubah', g2.unitId, staff0.unitId)
uji('c. Status keaktifan tidak berubah', g2.status, staff0.status)
uji('c. Status kepegawaian tidak berubah', g2.statusPegawai, staff0.statusPegawai)
uji('c. Jenis kelamin tidak berubah', g2.jenisKelamin, staff0.jenisKelamin)

const tanpaPerubahan = simPresReducer(setelahHp, { type: 'UPDATE_STAFF_PROFILE', payload: {} })
uji('c. Payload kosong tidak mengubah state', tanpaPerubahan, setelahHp)

// Tanpa sesi login, aksi tidak boleh menulis apa pun. selectSelfStaff
// mengembalikan null karena tidak ada currentUser, jadi datanya dibaca langsung.
const tanpaSesi = simPresReducer({ ...setelahHp, currentUser: null }, {
  type: 'UPDATE_STAFF_PROFILE',
  payload: { kontak: '0000' },
})
uji('c. Tanpa sesi: selectSelfStaff null', selectSelfStaff(tanpaSesi), null)
uji('c. Tanpa sesi data tidak berubah', selectStaffById(tanpaSesi, idGuru).kontak, '081298765432')

// --- 4c. GURU MENGUBAH FOTO & NAMA ----------------------------------------
const FOTO_BARU = 'data:image/png;base64,iVBORw0KGgo='
const setelahFoto = simPresReducer(setelahHp, {
  type: 'UPDATE_STAFF_PROFILE',
  payload: { foto: FOTO_BARU, name: 'Erianto Adi, S.Ag, M.Pd.I' },
})
const guruFoto = selectSelfStaff(setelahFoto)
uji('d. Foto berubah di mobile', guruFoto.foto, FOTO_BARU)
uji('d. Nama berubah di mobile', guruFoto.name, 'Erianto Adi, S.Ag, M.Pd.I')
uji('d. Superadmin melihat foto baru', selectStaffById(setelahFoto, idGuru).foto, FOTO_BARU)

const barisKartu = selectCardRows(setelahFoto, [guruFoto])[0]
uji('d. Kartu ID memakai nama baru', barisKartu.staff.name, 'Erianto Adi, S.Ag, M.Pd.I')
uji('d. Kartu ID memakai foto baru', cardPhotoOf(barisKartu.staff), FOTO_BARU)
uji('d. QR kartu tetap terikat NIY', barisKartu.qr, `SIMPRESPEG-${staff0.niy}`)

// --- 4d. SUPERADMIN MENGUBAH -> MOBILE IKUT BERUBAH ------------------------
const adminUbah = simPresReducer(setelahFoto, {
  type: 'UPDATE_STAFF',
  payload: {
    id: idGuru,
    name: 'Erianto Admin, S.Ag',
    role: 'Guru Al-Qur an',
    unitId: 'sma',
    foto: 'https://admin.sch.id/foto.jpg',
  },
})
const guruAdmin = selectSelfStaff(adminUbah)
uji('e. Superadmin ubah nama -> mobile ikut', guruAdmin.name, 'Erianto Admin, S.Ag')
uji('e. Superadmin ubah jabatan -> mobile ikut', guruAdmin.role, 'Guru Al-Qur an')
uji('e. Superadmin ubah unit -> mobile ikut', guruAdmin.unitId, 'sma')
uji('e. Superadmin ubah foto -> mobile ikut', guruAdmin.foto, 'https://admin.sch.id/foto.jpg')
const unitBaru = adminUbah.units.find((u) => u.id === 'sma')
uji('e. Nama unit terbaca dari data master', unitBaru.nama, 'SMAIT Attin Sumbar')

// --- 4e. LOG AKTIVITAS -----------------------------------------------------
// Dua aksi profil sudah dijalankan di atas (ganti HP+email, lalu foto+nama),
// jadi log bertambah dua.
uji('f. Jumlah log bertambah', setelahFoto.logs.length, jumlahLogAwal + 2)
const logHp = setelahHp.logs[0]
const logFoto = setelahFoto.logs[0]

uji('f. Log: aksi', logFoto.action, 'Ubah Profil')
uji('f. Log: target memuat nama', logFoto.target.includes(staff0.name), true)
ujiBenar('f. Log: ada waktu', typeof logFoto.time === 'string' && logFoto.time.length > 0)
ujiBenar('f. Log: ada pelaku', typeof logFoto.actor === 'string' && logFoto.actor.length > 0)

uji('f. Log HP: perubahan tersimpan terstruktur', Array.isArray(logHp.perubahan), true)
uji('f. Log HP: jumlah perubahan', logHp.perubahan.length, 2)
const perubahanHp = logHp.perubahan.find((p) => p.field === 'kontak')
uji('f. Log HP: data sebelum tersimpan', perubahanHp?.sebelum, staff0.kontak)
uji('f. Log HP: data sesudah tersimpan', perubahanHp?.sesudah, '081298765432')
uji('f. Log HP: deskripsi menyebut nilai lama', logHp.desc.includes(staff0.kontak), true)
uji('f. Log HP: deskripsi menyebut nilai baru', logHp.desc.includes('081298765432'), true)
uji('f. Log HP: menyebut pelaku', logHp.actor.length > 0, true)

const perubahanFoto = logFoto.perubahan.map((p) => p.field).join(',')
uji('f. Log foto: field yang berubah', perubahanFoto, 'name,foto')

const logBobol = coba.logs[0]
uji('f. Log: field terkunci yang ditolak tercatat', logBobol.fieldDitolak.join(','), 'niy,nip,role,unitId,status,statusPegawai,jenisKelamin')
uji('f. Log: hanya nama yang tercatat', logBobol.perubahan.length, 1)

console.log('UJI EDIT DATA PRIBADI GURU <-> SUPERADMIN')
console.log('='.repeat(118))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(118))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')