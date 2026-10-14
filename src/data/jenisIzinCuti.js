// ============================================================================
// DAFTAR JENIS IZIN/CUTI — SATU-SUMBER-KEBENARAN
//
// Sebelum modul ini ada, pilihan jenis izin/cuti ditulis ulang di empat tempat
// dengan FOUR daftar yang berbeda: "Sakit" vs "Sakit (Surat Dokter)",
// "Cuti Menikah" vs "Cuti Bersalin/Melahirkan", dst. Akibatnya pengajuan yang
// dibuat guru sering jatuh ke warna dan filter generik di portal admin, dan
// "Cuti MelahiLaOlahirkan" bisa terdaftar sebagai izin biasa.
//
// Semua halaman — form mobile, modal portal admin, filter, rekap, log — membaca
// daftar dari sini, sehingga satu jenis selalu punya nama, kelompok (Izin atau
// Cuti), ikon, dan aturan lampiran yang sama.
//
// TENTANG LAMPIRAN
//   `lampiran: 'wajib'`    pengajuan tidak terkirim tanpa dokumen.
//   `lampiran: 'disarankan'`form tetap bisa terkirim, tapi ada peringatan.
//
// TENTANG JENIS LAMA
//   Data sebelum modul ini sudah memakai nama lain ("Sakit", "Cuti Menikah",
//   "Cuti Bersalin", "Cuti Penting", "Tugas Luar"). Semuanya tetap dikenali
//   lewat `jenisIzinCuti()` supaya pengajuan lama tidak jadi tidak dikenal
//   setelah pembaruan — dan tetap bisa disetujui Headquarters.
// ============================================================================

export const KELOMPOK_CUTI = 'Cuti'
export const KELOMPOK_IZIN = 'Izin'

/** Lima jenis utama yang dipakai form pengajuan. */
export const JENIS_UTAMA = [
  {
    nama: 'Cuti Tahunan',
    kelompok: KELOMPOK_CUTI,
    ikon: 'luggage',
    ringkas: 'Cuti tahunan',
    lampiran: 'tidak',
    warna: 'bg-indigo-50 text-indigo-700',
    warnaAvatar: 'bg-indigo-100 text-indigo-900',
  },
  {
    nama: 'Cuti Sakit',
    kelompok: KELOMPOK_CUTI,
    ikon: 'medication',
    ringkas: 'Cuti sakit',
    lampiran: 'disarankan',
    warna: 'bg-emerald-50 text-emerald-700',
    warnaAvatar: 'bg-emerald-100 text-emerald-900',
  },
  {
    nama: 'Cuti Melahirkan',
    kelompok: KELOMPOK_CUTI,
    ikon: 'child_care',
    ringkas: 'Cuti melahirkan',
    // Dokumen (surat keterangan dokter / RS) adalah bukti, jadi wajib.
    lampiran: 'wajib',
    warna: 'bg-rose-50 text-rose-700',
    warnaAvatar: 'bg-rose-100 text-rose-900',
  },
  {
    nama: 'Izin Pribadi',
    kelompok: KELOMPOK_IZIN,
    ikon: 'person',
    ringkas: 'Izin pribadi',
    lampiran: 'tidak',
    warna: 'bg-amber-50 text-amber-800',
    warnaAvatar: 'bg-amber-100 text-amber-900',
  },
  {
    nama: 'Izin Dinas',
    kelompok: KELOMPOK_IZIN,
    ikon: 'travel_explore',
    ringkas: 'Izin dinas',
    lampiran: 'disarankan',
    warna: 'bg-sky-50 text-sky-700',
    warnaAvatar: 'bg-sky-100 text-sky-900',
  },
]

/** Nama lama yang masih muncul pada data tersimpan sebelum modul ini. */
export const JENIS_LAMPAU = [
  { nama: 'Sakit', kelompok: KELOMPOK_CUTI, ikon: 'medication', ringkas: 'Sakit', lampiran: 'disarankan', warna: 'bg-emerald-50 text-emerald-700', warnaAvatar: 'bg-emerald-100 text-emerald-900' },
  { nama: 'Izin Pribadi', kelompok: KELOMPOK_IZIN, ikon: 'person', ringkas: 'Izin pribadi', lampiran: 'tidak', warna: 'bg-amber-50 text-amber-800', warnaAvatar: 'bg-amber-100 text-amber-900' },
  { nama: 'Cuti Penting', kelompok: KELOMPOK_CUTI, ikon: 'priority_high', ringkas: 'Cuti penting', lampiran: 'disarankan', warna: 'bg-indigo-50 text-indigo-700', warnaAvatar: 'bg-indigo-100 text-indigo-900' },
  { nama: 'Cuti Menikah', kelompok: KELOMPOK_CUTI, ikon: 'favorite', ringkas: 'Cuti menikah', lampiran: 'disarankan', warna: 'bg-rose-50 text-rose-700', warnaAvatar: 'bg-rose-100 text-rose-900' },
  { nama: 'Cuti Bersalin', kelompok: KELOMPOK_CUTI, ikon: 'child_care', ringkas: 'Cuti bersalin', lampiran: 'wajib', warna: 'bg-rose-50 text-rose-700', warnaAvatar: 'bg-rose-100 text-rose-900' },
  { nama: 'Tugas Luar', kelompok: KELOMPOK_IZIN, ikon: 'hiking', ringkas: 'Tugas luar', lampiran: 'tidak', warna: 'bg-secondary-fixed text-on-secondary-fixed', warnaAvatar: 'bg-secondary-fixed text-on-secondary-fixed' },
]

/** Semua jenis yang dikenali: utama dulu, lalu nama lama. */
export const SEMUA_JENIS = [...JENIS_UTAMA, ...JENIS_LAMPAU]

/** Nama jenis untuk form pengajuan (jenis utama + Tugas Luar). */
export const JENIS_FORM = [
  ...JENIS_UTAMA.map((j) => j.nama),
  'Tugas Luar',
]

const PETA = new Map(SEMUA_JENIS.map((j) => [j.nama.toLowerCase(), j]))

/** Normalisasi nama jenis agar lookup tahan spasi/kapital berbeda. */
function kunci(nama) {
  return String(nama || '').trim().toLowerCase()
}

/**
 * Data satu jenis, atau null kalau namanya tidak dikenal.
 * `Cuti Alsan Penting` dan `cuti alsan penting` menghasilkan objek yang sama.
 */
export function jenisIzinCuti(nama) {
  return PETA.get(kunci(nama)) || null
}

/** Nama baku dari input bebas (dipakai saat menyimpan pengajuan). */
export function normalisasiJenis(nama) {
  const ditemukan = jenisIzinCuti(nama)
  if (ditemukan) return ditemukan.nama
  const teks = String(nama || '').trim()
  return teks || 'Izin Pribadi'
}

/**
 * Kelompok jenis: 'Cuti' atau 'Izin'. Ini yang dipakai rekap presensi untuk
 * menghitung hari izin dan hari cuti secara terpisah.
 *
 * Fallback untuk nama yang tidak ada di daftar: apa pun yang diawali "Cuti"
 * tetap dihitung cuti, selain itu izin. "Sakit" ikut dihitung cuti karena itu
 * cuti medis, bukan izin.
 */
export function kelompokIzinCuti(nama) {
  const ditemukan = jenisIzinCuti(nama)
  if (ditemukan) return ditemukan.kelompok
  const teks = kunci(nama)
  if (!teks) return ''
  if (teks === 'sakit') return KELOMPOK_CUTI
  if (teks.startsWith('cuti')) return KELOMPOK_CUTI
  return KELOMPOK_IZIN
}

/** 'wajib' | 'disarankan' | 'tidak' untuk sebuah jenis. */
export function aturanLampiran(nama) {
  return jenisIzinCuti(nama)?.lampiran || 'tidak'
}

/** Nama ikon Material untuk sebuah jenis. */
export function ikonJenis(nama) {
  return jenisIzinCuti(nama)?.ikon || 'event_note'
}

/** Kelas warna badge jenis; selalu mengembalikan kelas yang valid. */
export function warnaJenis(nama) {
  return jenisIzinCuti(nama)?.warna || 'bg-surface-container text-on-surface-variant'
}

export function warnaAvatarJenis(nama) {
  return jenisIzinCuti(nama)?.warnaAvatar || 'bg-surface-container text-on-surface'
}

/** Label status pengajuan, dipakai kartu mobile dan tabel portal. */
export const STATUS_PENGAJUAN = ['Menunggu', 'Disetujui', 'Ditolak']

export const WARNA_STATUS = {
  Menunggu: 'bg-amber-50 text-amber-800',
  Disetujui: 'bg-emerald-50 text-emerald-700',
  Ditolak: 'bg-error-container text-on-error-container',
}

export const WARNA_STATUS_PORTAL = {
  Menunggu: 'bg-amber-50 text-amber-700',
  Disetujui: 'bg-emerald-50 text-emerald-700',
  Ditolak: 'bg-red-50 text-red-700',
}

export const WARNA_TITIK_STATUS = {
  Menunggu: 'bg-amber-500',
  Disetujui: 'bg-emerald-500',
  Ditolak: 'bg-red-500',
}

/** Label panjang status untuk layar ("Menunggu Persetujuan"). */
export const LABEL_STATUS_PANJANG = {
  Menunggu: 'Menunggu Persetujuan',
  Disetujui: 'Disetujui',
  Ditolak: 'Ditolak',
}

// ===== TANGGAL PENGAJUAN =====================================================
//
// Satu format periode untuk semua tempat, supaya kolom "periode" di kartu
// mobile, tabel portal, dan rekap selalu identik.

const BULAN_PENDEK_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** "2026-10-01" -> "01 Okt 2026". */
export function tanggalPendekID(iso) {
  const [tahun, bulan, tanggal] = String(iso || '').slice(0, 10).split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return '-'
  return `${String(tanggal).padStart(2, '0')} ${BULAN_PENDEK_ID[bulan - 1]} ${tahun}`
}

/** "01 Okt 2026" atau "01 Okt 2026 - 15 Okt 2026". */
export function formatPeriode(mulai, selesai) {
  if (!mulai) return '-'
  if (!selesai || mulai === selesai) return tanggalPendekID(mulai)
  return `${tanggalPendekID(mulai)} - ${tanggalPendekID(selesai)}`
}

/** Jumlah hari inklusif; dipakai untuk kolom durasi. */
export function hitungDurasiHari(mulai, selesai) {
  if (!mulai) return 1
  const akhir = selesai || mulai
  const a = new Date(`${mulai}T00:00:00`)
  const b = new Date(`${akhir}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1
  const selisih = Math.round((b - a) / 86400000) + 1
  return Math.max(1, selisih)
}

/** "1 Hari" / "3 Hari" — format yang sudah dipakai di seluruh tabel. */
export function formatDurasi(mulai, selesai) {
  return `${hitungDurasiHari(mulai, selesai)} Hari`
}

/** Bentukkan baris pengajuan lengkap dari isian form. Dipakai form mobile dan
 * modal portal admin supaya keduanya menyimpan data dengan bentuk yang sama:
 * tanggal ISO tersimpan terpisah (dipakai rekap presensi), `periode` hanya
 * untuk tampilan. */
export function buildPengajuan({ id, staffId, jenis, mulai, selesai, alasan, lampiran, lampiranUkuran, keterangan }) {
  return {
    id,
    staffId,
    jenis: normalisasiJenis(jenis),
    mulai: mulai || null,
    selesai: selesai || mulai || null,
    periode: formatPeriode(mulai, selesai || mulai),
    durasi: formatDurasi(mulai, selesai || mulai),
    alasan: (alasan || '').trim() || null,
    keterangan: (keterangan || alasan || '').trim() || '',
    lampiran: lampiran || '',
    lampiranUkuran: lampiranUkuran ?? null,
    status: 'Menunggu',
  }
}

// ===== VALIDASI FORM =========================================================
//
// Diletakkan di modul data, bukan di dalam komponen: aturan ini sama untuk
// form mobile dan modal portal admin, dan harus bisa diuji tanpa merender.

/** Ukuran lampiran maksimal: 5 MB. */
export const MAKS_LAMPIRAN = 5 * 1024 * 1024

/**
 * Periksa isian form pengajuan.
 * Mengembalikan string kosong bila sah, atau pesan galat untuk ditampilkan.
 */
export function validasiFormPengajuan({ jenis, mulai, selesai, alasan, lampiran } = {}) {
  if (!jenis) return 'Jenis pengajuan wajib dipilih.'
  if (!mulai) return 'Tanggal mulai wajib diisi.'
  if (selesai && selesai < mulai) return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
  if (!String(alasan || '').trim()) return 'Alasan wajib diisi agar pengajuan bisa ditinjau.'
  const aturan = aturanLampiran(jenis)
  if (aturan === 'wajib' && !lampiran) return `${normalisasiJenis(jenis)} wajib melampirkan dokumen pendukung.`
  if (lampiran?.size > MAKS_LAMPIRAN) return 'Ukuran lampiran maksimal 5 MB.'
  return ''
}