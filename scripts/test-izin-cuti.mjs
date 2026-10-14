// ============================================================================
// UJI PENGAJUAN IZIN/CUTI — MOBILE GURU + INTEGRASI ADMIN
//
// Cakupan:
//   1. Daftar jenis izin/cuti terpusat: 5 jenis baru + jenis lama tetap hidup.
//   2. Cuti Melahirkan: tanggal, alasan, dan lampiran wajib.
//   3. Pengajuan guru tersimpan ke tabel `leaves` yang sama dengan portal.
//   4. Pengajuan terlihat oleh selector yang dipakai halaman admin + rekap.
//   5. Pengajuan tercatat di log aktivitas.
//   6. Rentang cuti melahirkan yang melewati bulan dihitung benar.
//
// Jalankan: node scripts/test-izin-cuti.mjs
// ============================================================================

import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  JENIS_UTAMA, JENIS_FORM, SEMUA_JENIS, jenisIzinCuti, kelompokIzinCuti,
  aturanLampiran, normalisasiJenis, ikonJenis, warnaJenis,
  buildPengajuan, formatPeriode, formatDurasi, hitungDurasiHari, tanggalPendekID,
  STATUS_PENGAJUAN, LABEL_STATUS_PANJANG, validasiFormPengajuan, MAKS_LAMPIRAN,
} from '../src/data/jenisIzinCuti.js'
import { hariDariPeriode, izinPerTanggal, labelIzin, rekapRentang } from '../src/data/presensiMobile.js'

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

const NAMA_WAJIB = ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Izin Pribadi', 'Izin Dinas']

// ============================================================================
// 1. DAFTAR JENIS IZIN/CUTI
// ============================================================================
for (const nama of NAMA_WAJIB) {
  uji(`Jenis tersedia: ${nama}`, jenisIzinCuti(nama)?.nama, nama)
  ujiBenar(`${nama} ada di form pengajuan`, JENIS_FORM.includes(nama))
}

uji('Cuti Tahunan -> kelompok Cuti', kelompokIzinCuti('Cuti Tahunan'), 'Cuti')
uji('Cuti Sakit -> kelompok Cuti', kelompokIzinCuti('Cuti Sakit'), 'Cuti')
uji('Cuti Melahirkan -> kelompok Cuti', kelompokIzinCuti('Cuti Melahirkan'), 'Cuti')
uji('Izin Pribadi -> kelompok Izin', kelompokIzinCuti('Izin Pribadi'), 'Izin')
uji('Izin Dinas -> kelompok Izin', kelompokIzinCuti('Izin Dinas'), 'Izin')

for (const nama of ['Sakit', 'Cuti Penting', 'Cuti Menikah', 'Cuti Bersalin', 'Tugas Luar']) {
  ujiBenar(`Jenis lama "${nama}" tetap dikenali`, jenisIzinCuti(nama) !== null)
}
uji('Jenis lama "Sakit" dihitung cuti', kelompokIzinCuti('Sakit'), 'Cuti')
uji('Jenis lama "Cuti Menikah" dihitung cuti', kelompokIzinCuti('Cuti Menikah'), 'Cuti')
uji('Jenis lama "Tugas Luar" dihitung izin', kelompokIzinCuti('Tugas Luar'), 'Izin')

uji('Normalisasi huruf besar', normalisasiJenis('cuti melahirkan'), 'Cuti Melahirkan')
uji('Normalisasi nama tak dikenal dipertahankan', normalisasiJenis('Cuti Istirahat'), 'Cuti Istirahat')
uji('Normalisasi kosong -> default', normalisasiJenis(''), 'Izin Pribadi')

// Aturan lampiran: wajib hanya untuk Cuti Melahirkan.
uji('Cuti Melahirkan wajib lampiran', aturanLampiran('Cuti Melahirkan'), 'wajib')
uji('Cuti Sakit lampiran disarankan', aturanLampiran('Cuti Sakit'), 'disarankan')
uji('Cuti Tahunan tanpa lampiran', aturanLampiran('Cuti Tahunan'), 'tidak')
uji('Izin Pribadi tanpa lampiran', aturanLampiran('Izin Pribadi'), 'tidak')
uji('Izin Dinas lampiran disarankan', aturanLampiran('Izin Dinas'), 'disarankan')

ujiBenar('Semua jenis utama punya ikon', JENIS_UTAMA.every((j) => !!ikonJenis(j.nama)))
ujiBenar('Semua jenis punya kelas warna', SEMUA_JENIS.every((j) => /^bg-/.test(warnaJenis(j.nama))))
ujiBenar('Semua jenis punya kelompok', JENIS_UTAMA.every((j) => ['Cuti', 'Izin'].includes(j.kelompok)))

// ============================================================================
// 2. STATUS PENGAJUAN
// ============================================================================
uji('Tiga status pengajuan', STATUS_PENGAJUAN.join(','), 'Menunggu,Disetujui,Ditolak')
uji('Label panjang status menunggu', LABEL_STATUS_PANJANG.Menunggu, 'Menunggu Persetujuan')
uji('Label panjang status disetujui', LABEL_STATUS_PANJANG.Disetujui, 'Disetujui')
uji('Label panjang status ditolak', LABEL_STATUS_PANJANG.Ditolak, 'Ditolak')

// ============================================================================
// 3. FORMAT TANGGAL, DURASI, DAN BENTUK PENGAJUAN
// ============================================================================
uji('Tanggal pendek ISO', tanggalPendekID('2026-10-01'), '01 Okt 2026')
uji('Periode satu hari', formatPeriode('2026-10-01', '2026-10-01'), '01 Okt 2026')
uji('Periode rentang', formatPeriode('2026-10-01', '2026-10-15'), '01 Okt 2026 - 15 Okt 2026')
uji('Durasi satu hari', hitungDurasiHari('2026-10-01', '2026-10-01'), 1)
uji('Durasi rentang 15 hari', hitungDurasiHari('2026-10-01', '2026-10-15'), 15)
uji('Durasi lintas bulan', hitungDurasiHari('2026-10-20', '2026-11-05'), 17)
uji('Format durasi', formatDurasi('2026-10-01', '2026-10-03'), '3 Hari')

const cutiMelahirkan = buildPengajuan({
  id: 99,
  staffId: 4,
  jenis: 'Cuti Melahirkan',
  mulai: '2026-11-02',
  selesai: '2027-02-01',
  alasan: '  Persalinan sesuai surat keterangan RS  ',
  lampiran: 'Surat_Keterangan_RS.pdf',
  lampiranUkuran: 245760,
})

uji('Pengajuan: jenis ternormalisasi', cutiMelahirkan.jenis, 'Cuti Melahirkan')
uji('Pengajuan: tanggal mulai tersimpan ISO', cutiMelahirkan.mulai, '2026-11-02')
uji('Pengajuan: tanggal selesai tersimpan ISO', cutiMelahirkan.selesai, '2027-02-01')
uji('Pengajuan: periode untuk tampilan', cutiMelahirkan.periode, '02 Nov 2026 - 01 Feb 2027')
uji('Pengajuan: durasi dihitung', cutiMelahirkan.durasi, '92 Hari')
uji('Pengajuan: alasan dibersihkan', cutiMelahirkan.alasan, 'Persalinan sesuai surat keterangan RS')
uji('Pengajuan: alasan jadi keterangan', cutiMelahirkan.keterangan, 'Persalinan sesuai surat keterangan RS')
uji('Pengajuan: nama lampiran tersimpan', cutiMelahirkan.lampiran, 'Surat_Keterangan_RS.pdf')
uji('Pengajuan: ukuran lampiran tersimpan', cutiMelahirkan.lampiranUkuran, 245760)
uji('Pengajuan: status awal Menunggu', cutiMelahirkan.status, 'Menunggu')

const izinPribadi = buildPengajuan({
  id: 100,
  staffId: 4,
  jenis: 'Izin Pribadi',
  mulai: '2026-10-05',
  selesai: '2026-10-05',
  alasan: 'Keperluan keluarga',
})
uji('Izin pribadi boleh tanpa lampiran', izinPribadi.lampiran, '')
uji('Izin pribadi durasi 1 hari', izinPribadi.durasi, '1 Hari')

// ============================================================================
// 4. RENTANG MELINTAS BULAN UNTUK REKAP
// ============================================================================
const hariMelahirkan = hariDariPeriode(cutiMelahirkan)
uji('Cuti melahirkan: jumlah hari', hariMelahirkan.length, 92)
uji('Cuti melahirkan: hari pertama', hariMelahirkan[0], '2026-11-02')
uji('Cuti melahirkan: hari terakhir', hariMelahirkan[hariMelahirkan.length - 1], '2027-02-01')
ujiBenar(
  'Cuti melahirkan: melewati Desember dan Januari',
  hariMelahirkan.includes('2026-12-25') && hariMelahirkan.includes('2027-01-01'),
)

// Pengajuan lama (tanpa tanggal ISO) tetap terbaca dari teks periode.
const pengajuanLama = { jenis: 'Sakit', periode: '16-18 Sep 2026', status: 'Disetujui' }
uji('Pengajuan lama: jumlah hari dari teks', hariDariPeriode(pengajuanLama).length, 3)
uji('Pengajuan lama: tanggal pertama', hariDariPeriode(pengajuanLama)[0], '2026-09-16')

// Rekap memakai kelompok dari daftar terpusat. Hanya pengajuan Disetujui yang
// relieving hari kerja, jadi keduanya disetujui dulu di sini.
const cutiDisetujui = { ...cutiMelahirkan, status: 'Disetujui' }
const izinDisetujui = { ...izinPribadi, status: 'Disetujui' }
const peta = izinPerTanggal([cutiDisetujui, izinDisetujui])
uji('Rekap: hari cuti melahirkan = Cuti', labelIzin(peta.get('2026-11-02').jenis), 'Cuti')
uji('Rekap: hari izin pribadi = Izin', labelIzin(peta.get('2026-10-05').jenis), 'Izin')

const rekapNov = rekapRentang({
  riwayat: [],
  izinTanggal: peta,
  dari: '2026-11-01',
  sampai: '2026-11-30',
  totalHariKerja: 30,
})
uji('Rekap November: hari cuti', rekapNov.cuti, 29)
uji('Rekap November: hari kerja terhitung', rekapNov.hariKerja, 29)

// Hanya pengajuan Disetujui yang relieving hari kerja.
uji(
  'Pengajuan Menunggu tidak relieving hari kerja',
  izinPerTanggal([{ ...izinPribadi, status: 'Menunggu' }]).size,
  0,
)

// ============================================================================
// 5. INTEGRASI ADMIN — pengajuan guru masuk ke tabel yang sama
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
pasangSesi('049001054') // Wisna Yunita, S.Pd — guru SD

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const store = await server.ssrLoadModule('/src/store/simPresStore.jsx')
const {
  SimPresProvider, useSimPres, simPresReducer, addActivityLog,
  selectSelfStaff, selectSelfLeaves, selectLeavesEnriched,
  selectIzinCutiSummary, selectLeavesByStatus, selectScopedLeaves,
} = store
const HalamanIzinCuti = (await server.ssrLoadModule('/src/pages/mobile/MobileIzinCutiPage.jsx')).default
const { FormPengajuan } = await server.ssrLoadModule('/src/pages/mobile/MobileIzinCutiPage.jsx')
await server.close()

// Provider tidak menerima initialState, jadi state & dispatch diambil lewat
// komponen kecil yang dirender sekali di bawah Provider.
let ctx = null
function TangkapContext() {
  ctx = useSimPres()
  return null
}
renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(TangkapContext))))

ujiBenar('State store terbaca lewat Provider', ctx != null)
const stateAwal = ctx.state
const dispatch = ctx.dispatch
const staff = selectSelfStaff(stateAwal)
uji('Pegawai yang login terdeteksi', staff?.name, 'Wisna Yunita, S.Pd')

const sebelum = selectSelfLeaves(stateAwal)
const ringkasanSebelum = selectIzinCutiSummary(stateAwal)
const jumlahLogSebelum = stateAwal.logs.length

// Guru mengirim pengajuan lewat reducer yang sama dengan form mobile.
const pengajuan = buildPengajuan({
  id: Math.max(...stateAwal.leaves.map((l) => l.id)) + 1,
  staffId: staff.id,
  jenis: 'Cuti Melahirkan',
  mulai: '2026-11-02',
  selesai: '2027-02-01',
  alasan: 'Persalinan sesuai surat keterangan RS',
  lampiran: 'Surat_Keterangan_RS.pdf',
  lampiranUkuran: 245760,
})
const sesudah = simPresReducer(stateAwal, { type: 'ADD_LEAVE', payload: pengajuan })

// a. Pengajuan tersimpan.
const daftarSesudah = selectSelfLeaves(sesudah)
uji('Pengajuan guru tersimpan', daftarSesudah.length, sebelum.length + 1)
const tersimpan = daftarSesudah.find((l) => l.id === pengajuan.id)
ujiBenar('Baris pengajuan tersimpan utuh', Boolean(tersimpan))
uji('Jenis tersimpan utuh', tersimpan.jenis, 'Cuti Melahirkan')
uji('Status awal Menunggu', tersimpan.status, 'Menunggu')
uji('Lampiran tersimpan', tersimpan.lampiran, 'Surat_Keterangan_RS.pdf')
uji('Tanggal mulai tersimpan', tersimpan.mulai, '2026-11-02')

// b. Terlihat oleh selector yang dipakai portal admin.
const enriched = selectLeavesEnriched(sesudah)
const untukAdmin = enriched.find((l) => l.id === pengajuan.id)
ujiBenar('Muncul di selectLeavesEnriched', Boolean(untukAdmin))
uji('Nama pemohon ikut terbaca', untukAdmin.name, 'Wisna Yunita, S.Pd')
uji('Unit pemohon ikut terbaca', typeof untukAdmin.unitName, 'string')
uji('Jenis utuh di tabel admin', untukAdmin.jenis, 'Cuti Melahirkan')

const disetujuiAdmin = selectLeavesByStatus(sesudah, 'Disetujui')
uji('Belum ada pengajuan disetujui', disetujuiAdmin.length, 0)
uji('Semua pengajuan pada status Menunggu', selectLeavesByStatus(sesudah, 'Menunggu').length, selectScopedLeaves(sesudah).length)

// c. Ringkasan admin ikut bertambah.
const ringkasanSesudah = selectIzinCutiSummary(sesudah)
uji('Ringkasan menunggu +1', ringkasanSesudah.menunggu, ringkasanSebelum.menunggu + 1)
uji('Ringkasan total +1', ringkasanSesudah.total, ringkasanSebelum.total + 1)

// d. Guru hanya melihat miliknya sendiri.
const milikOrangLain = sesudah.leaves.filter((l) => l.staffId !== staff.id).length
ujiBenar('Ada pengajuan pegawai lain di tabel', milikOrangLain > 0, `${milikOrangLain} baris`)
ujiBenar('Daftar guru hanya berisi miliknya', daftarSesudah.every((l) => l.staffId === staff.id))

// e. Persetujuan_admin mengubah status dan relieving hari kerja.
const disetujuiState = simPresReducer(sesudah, { type: 'UPDATE_LEAVE_STATUS', id: pengajuan.id, status: 'Disetujui' })
const barisDisetujui = selectSelfLeaves(disetujuiState).find((l) => l.id === pengajuan.id)
uji('Status menjadi Disetujui', barisDisetujui.status, 'Disetujui')
ujiBenar(
  'Setelah disetujui relieving rekap presensi',
  izinPerTanggal([barisDisetujui]).has('2026-11-02'),
)

// f. Log aktivitas mencatat pengajuan.
let denganLog = sesudah
addActivityLog(
  (action) => { denganLog = simPresReducer(denganLog, action) },
  sesudah,
  'Pengajuan',
  `Cuti/Izin • ${staff.name}`,
  `${staff.name} mengajukan Cuti Melahirkan (92 Hari): Persalinan sesuai surat keterangan RS`,
  null,
  null,
  staff.unitId,
)
const logBaru = denganLog.logs[0]
ujiBenar('Log aktivitas tercatat', Boolean(logBaru))
uji('Jumlah log bertambah', denganLog.logs.length, jumlahLogSebelum + 1)
uji('Log: aksi Pengajuan', logBaru.action, 'Pengajuan')
uji('Log: target memuat nama', logBaru.target.includes(staff.name), true)
uji('Log: deskripsi memuat jenis', logBaru.desc.includes('Cuti Melahirkan'), true)

// ============================================================================
// 6. HALAMAN MOBILE — tombol besar, jenis baru, field lengkap
// ============================================================================
const html = renderToString(h(MemoryRouter, null, h(SimPresProvider, null, h(HalamanIzinCuti))))

ujiBenar('Tombol utama "Buat Pengajuan" tampil', html.includes('Buat Pengajuan'))
ujiBenar('Tombol utama w-full (full width)', /w-full[^"]*"/.test(html))
ujiBenar('Tombol utama punya border tebal', /border-\[3px\]/.test(html))
ujiBenar('Tombol utama punya ukuran min tinggi', /min-h-\[60px\]/.test(html))
ujiBenar('Tombol utama memakai warna kontras (bg-secondary)', /bg-secondary[^"]*border-on-secondary/.test(html))
ujiBenar('Status "Menunggu Persetujuan" tampil', html.includes('Menunggu Persetujuan'))
ujiBenar('Tombol utama tidak lagi menampilkan "Batalkan"', !html.includes('Batalkan'))
ujiBenar('Tidak ada kata Bapak/Bu/Ibu', !/(^|[^A-Za-z])(Bapak|Bu|Ibu)([^A-Za-z]|$)/.test(html))
ujiBenar('Tidak ada teks undefined', !html.includes('undefined'))
ujiBenar('Tidak ada teks NaN', !html.includes('NaN'))

// Form dirender terpisah supaya isi field bisa diperiksa tanpa menunggu tombol
// ditekan (renderToString tidak bisa berinteraksi).
const formProps = {
  jenis: 'Cuti Melahirkan',
  mulai: '2026-11-02',
  selesai: '2027-02-01',
  alasan: 'Persalinan sesuai surat keterangan RS',
  lampiran: null,
  galat: '',
  mengirim: false,
  durasi: hitungDurasiHari('2026-11-02', '2027-02-01'),
  inputLampiran: null,
  onUbahJenis: () => {},
  onUbahMulai: () => {},
  onUbahSelesai: () => {},
  onUbahAlasan: () => {},
  onUbahBerkas: () => {},
  onHapusLampiran: () => {},
  onBatal: () => {},
  onKirim: () => {},
}
const htmlForm = renderToString(h(FormPengajuan, formProps))
// React menyisipkan komentar pemisah antar-teks, jadi "92 hari" tampil sebagai
// "92<!-- --> hari". Komentar dibuang sebelum dicocokkan.
const teksForm = htmlForm.replace(/<!--[\s\S]*?-->/g, '')

ujiBenar('Form menampilkan durasi 92 hari', teksForm.includes('92 hari'), 'cari "92 hari"')

for (const nama of NAMA_WAJIB) {
  ujiBenar(`Form menampilkan jenis "${nama}"`, htmlForm.includes(nama))
}
ujiBenar('Form menampilkan field Tanggal mulai', htmlForm.includes('Tanggal mulai'))
ujiBenar('Form menampilkan field Tanggal selesai', htmlForm.includes('Tanggal selesai'))
ujiBenar('Form menampilkan field Alasan', htmlForm.includes('Alasan'))
ujiBenar('Form menampilkan field Lampiran dokumen', htmlForm.includes('Lampiran dokumen'))
ujiBenar('Form punya input berkas', htmlForm.includes('type="file"'))
ujiBenar('Cuti Melahirkan menandai "Lampiran wajib"', htmlForm.includes('Lampiran wajib'))
ujiBenar('Form menampilkan tombol Kirim Pengajuan', htmlForm.includes('Kirim Pengajuan'))
ujiBenar('Form menampilkan tombol Batalkan', htmlForm.includes('Batalkan'))

// Jenis izin pribadi tidak ikut menandai lampiran wajib.
const htmlFormIzin = renderToString(h(FormPengajuan, { ...formProps, jenis: 'Izin Pribadi' }))
// Chip jenis selalu menandai mana yang butuh lampiran, apa pun jenis terpilih.
const hitungChip = (html, teks) => html.split(teks).length - 1
uji('Label "Lampiran wajib" muncul tepat 1x (chip Cuti Melahirkan)', hitungChip(htmlForm, 'Lampiran wajib'), 1)
uji('Label "Lampiran wajib" tetap 1x saat jenis lain dipilih', hitungChip(htmlFormIzin, 'Lampiran wajib'), 1)

// Pesan galat tampil apa adanya.
const htmlFormGalat = renderToString(h(FormPengajuan, { ...formProps, galat: 'Alasan wajib diisi' }))
ujiBenar('Pesan galat tampil di form', htmlFormGalat.includes('Alasan wajib diisi'))
ujiBenar('Pesan galat diberi peran alert', htmlFormGalat.includes('role="alert"'))

// Validasi form (fungsi terpusat, sama untuk mobile dan portal admin).
const DASAR = { jenis: 'Izin Pribadi', mulai: '2026-11-02', selesai: '2026-11-02' }
uji(
  'Validasi: tanpa jenis ditolak',
  validasiFormPengajuan({ ...DASAR, jenis: '' }),
  'Jenis pengajuan wajib dipilih.',
)
uji(
  'Validasi: tanpa tanggal mulai ditolak',
  validasiFormPengajuan({ jenis: 'Izin Pribadi', mulai: '', selesai: '' }),
  'Tanggal mulai wajib diisi.',
)
uji(
  'Validasi: Cuti Melahirkan tanpa alasan ditolak',
  validasiFormPengajuan({ ...DASAR, jenis: 'Cuti Melahirkan', alasan: '', lampiran: null }),
  'Alasan wajib diisi agar pengajuan bisa ditinjau.',
)
uji(
  'Validasi: Cuti Melahirkan tanpa lampiran ditolak',
  validasiFormPengajuan({ ...DASAR, jenis: 'Cuti Melahirkan', alasan: 'Persalinan', lampiran: null }),
  'Cuti Melahirkan wajib melampirkan dokumen pendukung.',
)
uji(
  'Validasi: Cuti Melahirkan lengkap diterima',
  validasiFormPengajuan({ ...DASAR, jenis: 'Cuti Melahirkan', alasan: 'Persalinan', lampiran: { name: 'RS.pdf', size: 1000 } }),
  '',
)
uji(
  'Validasi: Izin Pribadi tanpa lampiran diterima',
  validasiFormPengajuan({ ...DASAR, jenis: 'Izin Pribadi', alasan: 'Keperluan keluarga', lampiran: null }),
  '',
)
uji(
  'Validasi: tanggal selesai sebelum mulai ditolak',
  validasiFormPengajuan({ jenis: 'Izin Pribadi', alasan: 'x', mulai: '2026-10-10', selesai: '2026-10-01' }),
  'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
)
uji(
  'Validasi: lampiran lebih dari 5 MB ditolak',
  validasiFormPengajuan({ ...DASAR, jenis: 'Izin Dinas', alasan: 'Dinas luar', lampiran: { name: 'besar.pdf', size: MAKS_LAMPIRAN + 1 } }),
  'Ukuran lampiran maksimal 5 MB.',
)
uji('Batas lampiran 5 MB', MAKS_LAMPIRAN, 5 * 1024 * 1024)

// ============================================================================
// 7. TIDAK ADA DAFTAR JENIS LOKAL YANG MENYIMPANG
// ============================================================================
const adminPage = readFileSync('src/pages/PengajuanIzinCutiPage.jsx', 'utf8')
const adminModal = readFileSync('src/components/LeaveRequestModal.jsx', 'utf8')
const detailModal = readFileSync('src/components/LeaveDetailModal.jsx', 'utf8')
const mobilePage = readFileSync('src/pages/mobile/MobileIzinCutiPage.jsx', 'utf8')
const semuaBerkas = [adminPage, adminModal, detailModal, mobilePage]

ujiBenar('Halaman admin memakai daftar terpusat', /JENIS_UTAMA|SEMUA_JENIS/.test(adminPage))
ujiBenar('Modal admin memakai daftar terpusat', /JENIS_FORM/.test(adminModal))
ujiBenar('Modal detail memakai warna terpusat', /SEMUA_JENIS/.test(detailModal))
ujiBenar('Halaman mobile memakai daftar terpusat', /JENIS_FORM/.test(mobilePage))
ujiBenar('Modal admin memakai pembentuk yang sama', /buildPengajuan/.test(adminModal))
ujiBenar('Halaman mobile memakai pembentuk yang sama', /buildPengajuan/.test(mobilePage))
ujiBenar('Modal admin tidak lagi memotong jenis', !/jenis:\s*jenis\.split/.test(adminModal))
ujiBenar('Modal admin menyimpan alasan', /alasan:/.test(adminModal))

// Nama jenis yang dulu hanya ada di daftar lokal sudah dihapus dari semua file.
for (const nama of ['Cuti Bersalin/Melahirkan', 'Izin Keperluan Pribadi', 'Cuti Bersalin/Melahirkan']) {
  ujiBenar(
    `Daftar lokal "${nama}" sudah dihapus`,
    !semuaBerkas.some((f) => f.includes(`'${nama}'`)),
  )
}

console.log('UJI PENGAJUAN IZIN/CUTI (MOBILE + ADMIN)')
console.log('='.repeat(116))
for (const baris of rincian) console.log(baris)
console.log('='.repeat(116))
console.log(`Total: ${lulus + gagal}  |  Lulus: ${lulus}  |  Gagal: ${gagal}`)

if (gagal > 0) {
  console.error('\nPENGUJIAN GAGAL')
  process.exit(1)
}
console.log('\nSELURUH SKENARIO LULUS')