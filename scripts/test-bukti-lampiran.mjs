// ============================================================================
// UJI BUKTI LAMPIRAN SURAT IZIN/CUTI (MOBILE + PORTAL, KEPALA SEKOLAH,
// ADMIN UNIT, DAN SUPERADMIN)
// ----------------------------------------------------------------------------
// Cakupan:
//   1. Pembacaan lampiran: URL berkas, nama berkas, dan deteksi lampiran.
//   2. Pengajuan baru selalu punya refId (kunci pencocokan antar perangkat).
//   3. Pemetaan pengajuan <-> baris public.leaves (termasuk lampiran_url).
//   4. Gabungan data server dengan data lokal (approval perangkat lain).
//   5. Antrean sinkronisasi saat pengajuan dibuat / disetujui.
//   6. Tampilan: pratinjau dokumen memakai berkas yang benar-benar diunggah,
//      bukan pratinjau mock, dan tombol "Lihat Bukti" tersedia di rincian.
//
// Jalankan: node scripts/test-bukti-lampiran.mjs
// ============================================================================

import assert from 'node:assert/strict'
import { createTestServer, loadRender } from './_test-server.mjs'

// ---- Penyimpanan palsu supaya reducer bisa menulis & membaca localStorage.
const memory = new Map()
const storageApi = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
}
globalThis.window = { localStorage: storageApi, sessionStorage: storageApi }

let lulus = 0
let gagal = 0

async function uji(nama, fn) {
  try {
    await fn()
    lulus += 1
    console.log(`LULUS  ${nama}`)
  } catch (err) {
    gagal += 1
    console.error(`GAGAL  ${nama}\n       ${err.message}`)
  }
}

const server = await createTestServer()
const { renderToString, createElement } = await loadRender(server)

const lampiranService = await server.ssrLoadModule('/src/services/leaveAttachmentService.js')
const { getAttachmentUrl, getAttachmentName, hasAttachment } = lampiranService

const leaveService = await server.ssrLoadModule('/src/services/leaveService.js')
const { leaveKeBaris, barisKeLeave, refIdLeave } = leaveService

const jenisIzinCuti = await server.ssrLoadModule('/src/data/jenisIzinCuti.js')
const { buildPengajuan } = jenisIzinCuti

const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const { simPresReducer, initialState, gabungLeaveRemote, antreanLeaveSyncAmbil } = store

const DocumentViewerModal = (await server.ssrLoadModule('/src/components/DocumentViewerModal.jsx')).default
const LeaveDetailModal = (await server.ssrLoadModule('/src/components/LeaveDetailModal.jsx')).default

const URL_SURAT = 'https://proyek.supabase.co/storage/v1/object/public/leave-attachments/sd/2026-01/2_surat_dokter.pdf'

// ============================================================================
// 1. PEMBACAAN LAMPIRAN
// ============================================================================
await uji('URL lampiran terbaca dari lampiranUrl', () => {
  assert.equal(getAttachmentUrl({ lampiranUrl: URL_SURAT }), URL_SURAT)
})

await uji('URL lampiran terbaca dari lampiran_url (bentuk snake_case)', () => {
  assert.equal(getAttachmentUrl({ lampiran_url: URL_SURAT }), URL_SURAT)
})

await uji('Nama berkas saja bukan URL yang bisa dibuka', () => {
  assert.equal(getAttachmentUrl({ lampiran: 'surat_pengajuan.pdf' }), '')
})

await uji('Nama berkas diambil dari lampiranNama', () => {
  assert.equal(getAttachmentName({ lampiranNama: 'surat_dokter.pdf' }), 'surat_dokter.pdf')
})

await uji('Nama berkas diturunkan dari URL bila tidak ada nama', () => {
  assert.equal(getAttachmentName({ lampiranUrl: URL_SURAT }), '2_surat_dokter.pdf')
})

await uji('Pengajuan tanpa lampiran terdeteksi sebagai tanpa lampiran', () => {
  assert.equal(hasAttachment({}), false)
  assert.equal(hasAttachment({ lampiran: 'surat.pdf' }), true)
  assert.equal(hasAttachment({ lampiranUrl: URL_SURAT }), true)
})

// ============================================================================
// 2. REFID PENGAJUAN (KUNCI PENCOCOKAN ANTAR PERANGKAT)
// ============================================================================
await uji('Pengajuan baru selalu punya refId', () => {
  const a = buildPengajuan({ id: 1, staffId: 2, jenis: 'Cuti Tahunan', mulai: '2026-09-01', selesai: '2026-09-01', alasan: 'Uji' })
  const b = buildPengajuan({ id: 2, staffId: 2, jenis: 'Cuti Tahunan', mulai: '2026-09-01', selesai: '2026-09-01', alasan: 'Uji' })
  assert.ok(a.refId, 'refId harus ada')
  assert.notEqual(a.refId, b.refId, 'refId harus unik antar pengajuan')
})

await uji('Pengajuan lama tanpa refId mendapat refId deterministik', () => {
  const lama = { id: 7, staffId: 3, jenis: 'Sakit', createdAt: '2026-09-10T08:00:00.000Z' }
  assert.equal(refIdLeave(lama), refIdLeave({ ...lama }))
  assert.ok(refIdLeave(lama).startsWith('lama-'))
})

// ============================================================================
// 3. PEMETAAN PENGAJUAN <-> BARIS public.leaves
// ============================================================================
await uji('Pengajuan dipetakan ke baris DB lengkap dengan lampiran', () => {
  const leave = {
    id: 12,
    refId: 'lv-abc',
    staffId: 4,
    jenis: 'Cuti Melahirkan',
    mulai: '2026-10-01',
    selesai: '2026-10-14',
    durasiHari: 10,
    periode: '01 Okt 2026 - 14 Okt 2026',
    alasan: 'Persalinan',
    status: 'Menunggu Kepsek',
    tahapApproval: 1,
    lampiran: 'surat_dokter.pdf',
    lampiranNama: 'surat_dokter.pdf',
    lampiranUrl: URL_SURAT,
    lampiranUkuran: 204800,
    lampiranTipe: 'application/pdf',
  }
  const baris = leaveKeBaris(leave, { staff: { niy: '049001054' }, unitId: 'sd' })

  assert.equal(baris.ref_id, 'lv-abc')
  assert.equal(baris.staff_niy, '049001054')
  assert.equal(baris.unit_id, 'sd')
  assert.equal(baris.lampiran_url, URL_SURAT)
  assert.equal(baris.lampiran_nama, 'surat_dokter.pdf')
  assert.equal(baris.lampiran_ukuran, 204800)
  assert.equal(baris.lampiran_tipe, 'application/pdf')
  assert.equal(baris.status, 'Menunggu Kepsek')
  assert.equal(baris.tanggal_mulai, '2026-10-01')
})

await uji('Baris DB dipetakan kembali ke pengajuan beserta URL lampiran', () => {
  const baris = {
    ref_id: 'lv-abc',
    staff_id: 4,
    staff_niy: '049001054',
    unit_id: 'sd',
    jenis: 'Cuti Melahirkan',
    tanggal_mulai: '2026-10-01',
    tanggal_selesai: '2026-10-14',
    durasi_hari: 10,
    periode: '01 Okt 2026 - 14 Okt 2026',
    alasan: 'Persalinan',
    lampiran_url: URL_SURAT,
    lampiran_nama: 'surat_dokter.pdf',
    lampiran_tipe: 'application/pdf',
    lampiran_ukuran: 204800,
    status: 'Menunggu Kepsek',
    tahap_approval: 1,
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-21T10:00:00.000Z',
  }
  const leave = barisKeLeave(baris, { staffIdByNiy: { '049001054': 4 } })

  assert.equal(leave.refId, 'lv-abc')
  assert.equal(leave.staffId, 4, 'staffId dipetakan lewat NIY')
  assert.equal(leave.lampiranUrl, URL_SURAT, 'URL lampiran harus ikut terbawa')
  assert.equal(leave.lampiranNama, 'surat_dokter.pdf')
  assert.equal(leave.lampiranUkuran, 204800)
  assert.equal(leave.status, 'Menunggu Kepsek')
  assert.equal(leave.durasiHari, 10)
})

// ============================================================================
// 4. GABUNG DATA SERVER DENGAN DATA LOKAL
// ============================================================================
await uji('Pengajuan dari server yang belum ada lokal ditambahkan', () => {
  const lokal = [{ id: 1, refId: 'lv-1', status: 'Menunggu' }]
  const remote = [{ id: 90, refId: 'lv-90', status: 'Disetujui', updatedAt: '2026-09-21T10:00:00.000Z', lampiranUrl: URL_SURAT }]
  const hasil = gabungLeaveRemote(lokal, remote)

  assert.equal(hasil.length, 2)
  const baru = hasil.find((l) => l.refId === 'lv-90')
  assert.ok(baru, 'pengajuan remote harus masuk')
  assert.equal(baru.lampiranUrl, URL_SURAT)
  assert.ok(baru.id !== 1, 'id lokal baru harus berbeda dari id yang ada')
})

await uji('Persetujuan di perangkat lain menimpa data lokal yang lebih lama', () => {
  const lokal = [{ id: 1, refId: 'lv-1', status: 'Menunggu Superadmin', updatedAt: '2026-09-20T10:00:00.000Z' }]
  const remote = [{ id: 1, refId: 'lv-1', status: 'Disetujui', updatedAt: '2026-09-21T10:00:00.000Z' }]
  const hasil = gabungLeaveRemote(lokal, remote)

  assert.equal(hasil.length, 1)
  assert.equal(hasil[0].status, 'Disetujui')
  assert.equal(hasil[0].id, 1, 'id lokal harus dipertahankan')
})

await uji('Data lokal yang lebih baru tidak ditimpa data lama dari server', () => {
  const lokal = [{ id: 1, refId: 'lv-1', status: 'Ditolak', updatedAt: '2026-09-22T10:00:00.000Z' }]
  const remote = [{ id: 1, refId: 'lv-1', status: 'Menunggu', updatedAt: '2026-09-21T10:00:00.000Z' }]
  const hasil = gabungLeaveRemote(lokal, remote)

  assert.equal(hasil[0].status, 'Ditolak')
})

await uji('Baris lama di server (tanpa refId) tidak menggandakan data lokal', () => {
  const lokal = [{
    id: 1,
    refId: 'lv-1',
    staffId: 2,
    jenis: 'Sakit',
    mulai: '2026-09-16',
    status: 'Menunggu Superadmin',
    updatedAt: '2026-09-18T10:00:00.000Z',
  }]
  const remote = [{
    refId: '',
    staffId: 2,
    jenis: 'Sakit',
    mulai: '2026-09-16',
    status: 'Menunggu',
    updatedAt: '2026-09-21T10:00:00.000Z',
    lampiranUrl: URL_SURAT,
    lampiranNama: 'surat.pdf',
  }]
  const hasil = gabungLeaveRemote(lokal, remote)

  assert.equal(hasil.length, 1, 'baris lama tidak boleh menggandakan pengajuan lokal')
  assert.equal(hasil[0].status, 'Menunggu Superadmin', 'status lokal yang lebih lengkap harus dipertahankan')
  assert.equal(hasil[0].lampiranUrl, URL_SURAT, 'lampiran dari server tetap ditambahkan')
})

await uji('Baris lama di server yang belum ada lokal tetap masuk daftar', () => {
  const lokal = [{ id: 1, refId: 'lv-1', staffId: 2, jenis: 'Sakit', mulai: '2026-09-16', status: 'Menunggu' }]
  const remote = [{
    refId: '',
    staffId: 9,
    jenis: 'Izin Pribadi',
    mulai: '2026-09-20',
    status: 'Menunggu',
    updatedAt: '2026-09-21T10:00:00.000Z',
    lampiranUrl: URL_SURAT,
  }]
  const hasil = gabungLeaveRemote(lokal, remote)

  assert.equal(hasil.length, 2)
  const baru = hasil.find((l) => l.staffId === 9)
  assert.ok(baru, 'pengajuan dari server harus masuk')
  assert.ok(baru.refId, 'pengajuan dari server harus punya refId agar tidak terduplikasi')
})

// ============================================================================
// 5. ANTREAN SINKRONISASI DI STORE
// ============================================================================
await uji('Pengajuan baru masuk antrean kirim ke Supabase', () => {
  antreanLeaveSyncAmbil() // bersihkan sisa
  let state = initialState
  state = simPresReducer(state, {
    type: 'ADD_LEAVE',
    payload: { id: 999, refId: 'lv-999', staffId: 2, jenis: 'Sakit', status: 'Menunggu', lampiranUrl: URL_SURAT, lampiranNama: 'surat.pdf' },
  })
  const antrean = antreanLeaveSyncAmbil()
  assert.equal(antrean.length, 1)
  assert.equal(antrean[0].lampiranUrl, URL_SURAT, 'URL lampiran harus ikut dikirim')
})

await uji('Persetujuan pengajuan masuk antrean kirim ke Supabase', () => {
  antreanLeaveSyncAmbil()
  let state = initialState
  state = simPresReducer(state, {
    type: 'ADD_LEAVE',
    payload: { id: 998, refId: 'lv-998', staffId: 2, jenis: 'Sakit', status: 'Menunggu' },
  })
  antreanLeaveSyncAmbil()
  state = simPresReducer(state, {
    type: 'UPDATE_LEAVE_STATUS',
    id: 998,
    status: 'Disetujui',
    approvalKepsek: { status: 'Disetujui' },
  })
  const antrean = antreanLeaveSyncAmbil()
  assert.equal(antrean.length, 1)
  assert.equal(antrean[0].status, 'Disetujui')
})

await uji('Pengajuan dari server masuk ke daftar lokal beserta lampirannya', () => {
  let state = initialState
  state = simPresReducer(state, {
    type: 'HYDRATE_LEAVES_REMOTE',
    payload: [{
      refId: 'lv-remote-1',
      staffId: 2,
      unitId: 'sd',
      jenis: 'Sakit',
      status: 'Menunggu Kepsek',
      lampiranUrl: URL_SURAT,
      lampiranNama: 'surat.pdf',
      updatedAt: '2026-09-21T10:00:00.000Z',
      createdAt: '2026-09-20T10:00:00.000Z',
    }],
  })
  const ada = state.leaves.find((l) => l.refId === 'lv-remote-1')
  assert.ok(ada, 'pengajuan remote harus masuk ke state')
  assert.equal(ada.lampiranUrl, URL_SURAT)
})

// ============================================================================
// 6. TAMPILAN DOKUMEN
// ============================================================================
await uji('Pratinjau dokumen memakai berkas yang diunggah, bukan mock', () => {
  const html = renderToString(createElement(DocumentViewerModal, {
    isOpen: true,
    onClose: () => {},
    leave: { name: 'Guru Uji', jenis: 'Sakit', periode: '01 Sep 2026', lampiranUrl: URL_SURAT, lampiranNama: 'surat.pdf' },
  }))
  assert.ok(html.includes(URL_SURAT), 'URL berkas asli harus dirender')
  assert.ok(!html.includes('data:image/svg+xml'), 'pratinjau mock tidak boleh dipakai saat berkas ada')
})

await uji('Rincian pengajuan menyediakan tombol Lihat Bukti', () => {
  const html = renderToString(createElement(LeaveDetailModal, {
    isOpen: true,
    onClose: () => {},
    leave: { name: 'Guru Uji', jenis: 'Sakit', periode: '01 Sep 2026', status: 'Menunggu Kepsek', lampiranUrl: URL_SURAT, lampiranNama: 'surat.pdf' },
  }))
  assert.ok(html.includes('Lihat Bukti'), 'tombol Lihat Bukti harus ada di rincian')
  assert.ok(html.includes('Lampiran'), 'tab lampiran harus ada')
})

// ============================================================================
// 7. HALAMAN PERSETUJUAN MOBILE (Kepala Sekolah / Admin Unit / Superadmin)
// ============================================================================
const { MemoryRouter } = await loadRender(server)
const MobilePersetujuanIzinPage = (await server.ssrLoadModule('/src/pages/mobile/MobilePersetujuanIzinPage.jsx')).default

await uji('Halaman persetujuan mobile menampilkan tombol Lihat Bukti', async () => {
  // Sesi Superadmin: role yang paling banyak halamannya (lihat + approval).
  memory.set('simpres.auth.session', JSON.stringify({ v: 1, user: { username: 'superadmin' } }))

  const html = renderToString(createElement(
    MemoryRouter,
    { initialEntries: ['/mobile/persetujuan-izin'] },
    createElement(store.SimPresProvider, null, createElement(MobilePersetujuanIzinPage)),
  ))

  assert.ok(html.includes('Persetujuan Izin'), 'halaman persetujuan harus ter-render')
  assert.ok(html.includes('Lihat Bukti'), 'tombol Lihat Bukti harus tersedia untuk approver')
})

await server.close()

console.log('='.repeat(80))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO BUKTI LAMPIRAN LULUS')
