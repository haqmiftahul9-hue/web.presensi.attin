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
    lampiran: 'wajib',
    kuota: 7,
    satuanKuota: 'hari/tahun',
    warna: 'bg-indigo-50 text-indigo-700',
    warnaAvatar: 'bg-indigo-100 text-indigo-900',
  },
  {
    nama: 'Cuti Sakit',
    kelompok: KELOMPOK_IZIN,
    ikon: 'medication',
    ringkas: 'Cuti sakit',
    lampiran: 'disarankan',
    keterangan: 'Izin sakit tidak memotong kuota cuti tahunan',
    warna: 'bg-emerald-50 text-emerald-700',
    warnaAvatar: 'bg-emerald-100 text-emerald-900',
  },
  {
    nama: 'Cuti Menikah',
    kelompok: KELOMPOK_CUTI,
    ikon: 'favorite',
    ringkas: 'Cuti menikah',
    lampiran: 'wajib',
    kuota: 3,
    satuanKuota: 'hari',
    warna: 'bg-rose-50 text-rose-700',
    warnaAvatar: 'bg-rose-100 text-rose-900',
  },
  {
    nama: 'Cuti Melahirkan',
    kelompok: KELOMPOK_CUTI,
    ikon: 'child_care',
    ringkas: 'Cuti melahirkan',
    lampiran: 'wajib',
    kuota: 90,
    satuanKuota: 'hari (3 bulan)',
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
  { nama: 'Izin Sakit', kelompok: KELOMPOK_IZIN, ikon: 'medication', ringkas: 'Izin sakit', lampiran: 'disarankan', keterangan: 'Izin sakit tidak memotong kuota cuti tahunan', warna: 'bg-emerald-50 text-emerald-700', warnaAvatar: 'bg-emerald-100 text-emerald-900' },
  { nama: 'Sakit', kelompok: KELOMPOK_IZIN, ikon: 'medication', ringkas: 'Sakit', lampiran: 'disarankan', keterangan: 'Izin sakit tidak memotong kuota cuti tahunan', warna: 'bg-emerald-50 text-emerald-700', warnaAvatar: 'bg-emerald-100 text-emerald-900' },
  { nama: 'Izin Pribadi', kelompok: KELOMPOK_IZIN, ikon: 'person', ringkas: 'Izin pribadi', lampiran: 'tidak', warna: 'bg-amber-50 text-amber-800', warnaAvatar: 'bg-amber-100 text-amber-900' },
  { nama: 'Cuti Penting', kelompok: KELOMPOK_CUTI, ikon: 'priority_high', ringkas: 'Cuti penting', lampiran: 'disarankan', warna: 'bg-indigo-50 text-indigo-700', warnaAvatar: 'bg-indigo-100 text-indigo-900' },
  { nama: 'Cuti Menikah', kelompok: KELOMPOK_CUTI, ikon: 'favorite', ringkas: 'Cuti menikah', lampiran: 'wajib', kuota: 3, satuanKuota: 'hari', warna: 'bg-rose-50 text-rose-700', warnaAvatar: 'bg-rose-100 text-rose-900' },
  { nama: 'Cuti Bersalin', kelompok: KELOMPOK_CUTI, ikon: 'child_care', ringkas: 'Cuti bersalin', lampiran: 'wajib', kuota: 90, satuanKuota: 'hari (3 bulan)', warna: 'bg-rose-50 text-rose-700', warnaAvatar: 'bg-rose-100 text-rose-900' },
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
const defSakit = PETA.get('cuti sakit') || PETA.get('izin sakit') || PETA.get('sakit')
if (defSakit) {
  PETA.set('sakit', defSakit)
  PETA.set('cuti sakit', defSakit)
  PETA.set('izin sakit', defSakit)
}

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

/** Status pengajuan dalam sistem alur 2 tahap (Kepala Sekolah & Superadmin). */
export const STATUS_PENGAJUAN = ['Menunggu', 'Disetujui', 'Ditolak']

export function isLeavePending(status) {
  const s = String(status || '').toLowerCase()
  return s === 'menunggu' || s.includes('menunggu')
}

export function isLeaveApproved(status) {
  const s = String(status || '').toLowerCase()
  return s === 'disetujui' || s === 'approved'
}

export function isLeaveRejected(status) {
  const s = String(status || '').toLowerCase()
  return s === 'ditolak' || s === 'rejected'
}

export const WARNA_STATUS = {
  Menunggu: 'bg-amber-50 text-amber-800',
  'Menunggu Kepsek': 'bg-amber-50 text-amber-800',
  'Menunggu Superadmin': 'bg-sky-50 text-sky-800',
  Disetujui: 'bg-emerald-50 text-emerald-700',
  Ditolak: 'bg-error-container text-on-error-container',
}

export const WARNA_STATUS_PORTAL = {
  Menunggu: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'Menunggu Kepsek': 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'Menunggu Superadmin': 'bg-sky-50 text-sky-700 border border-sky-200/80',
  Disetujui: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Ditolak: 'bg-red-50 text-red-700 border border-red-200/80',
}

export const WARNA_TITIK_STATUS = {
  Menunggu: 'bg-amber-500',
  'Menunggu Kepsek': 'bg-amber-500',
  'Menunggu Superadmin': 'bg-sky-500',
  Disetujui: 'bg-emerald-500',
  Ditolak: 'bg-red-500',
}

/** Label panjang status untuk layar ("Menunggu Persetujuan"). */
export const LABEL_STATUS_PANJANG = {
  Menunggu: 'Menunggu Persetujuan',
  'Menunggu Kepsek': 'Menunggu Kepsek (Tahap 1)',
  'Menunggu Superadmin': 'Menunggu Superadmin (Tahap 2)',
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

/** Jumlah hari kerja inklusif (Senin - Sabtu); hari Minggu (0) tidak dihitung. Mengembalikan 0 jika hanya hari Minggu. */
export function hitungDurasiHari(mulai, selesai) {
  if (!mulai) return 0
  const akhir = selesai || mulai
  const a = new Date(`${mulai}T00:00:00`)
  const b = new Date(`${akhir}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  let jumlah = 0
  const cur = new Date(a)
  while (cur <= b) {
    if (cur.getDay() !== 0) jumlah += 1
    cur.setDate(cur.getDate() + 1)
  }
  return jumlah
}

/** "1 Hari" / "3 Hari" — format yang sudah dipakai di seluruh tabel. */
export function formatDurasi(mulai, selesai) {
  return `${hitungDurasiHari(mulai, selesai)} Hari`
}

/**
 * Id pengajuan versi aplikasi.
 *
 * Berbeda dengan `id` angka (yang dihitung dari max(id)+1 dan bisa bentrok
 * antar perangkat), refId ini dibuat sekali saat pengajuan dibuat dan dipakai
 * sebagai kunci pencocokan baris pengajuan di Supabase. Dengan begitu approval
 * yang dilakukan Kepala Sekolah di satu perangkat menunjuk baris yang sama
 * dengan berkas yang diunggah Guru di perangkat lain.
 *
 * @returns {string}
 */
export function buatRefIdPengajuan() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `lv-${crypto.randomUUID()}`
    }
  } catch {
    /* crypto.randomUUID tidak tersedia -> pakai fallback di bawah */
  }
  return `lv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Bentukkan baris pengajuan lengkap dari isian form. Dipakai form mobile dan
 * modal portal admin supaya keduanya menyimpan data dengan bentuk yang sama:
 * tanggal ISO tersimpan terpisah (dipakai rekap presensi), `periode` hanya
 * untuk tampilan. */
export function buildPengajuan({ id, staffId, jenis, mulai, selesai, alasan, lampiran, lampiranUkuran, keterangan }) {
  return {
    id,
    refId: buatRefIdPengajuan(),
    staffId,
    jenis: normalisasiJenis(jenis),
    mulai: mulai || null,
    selesai: selesai || mulai || null,
    periode: formatPeriode(mulai, selesai || mulai),
    durasi: formatDurasi(mulai, selesai || mulai),
    durasiHari: hitungDurasiHari(mulai, selesai || mulai),
    durasi_hari: hitungDurasiHari(mulai, selesai || mulai),
    alasan: (alasan || '').trim() || null,
    keterangan: (keterangan || alasan || '').trim() || '',
    lampiran: lampiran || '',
    lampiranUkuran: lampiranUkuran ?? null,
    status: 'Menunggu',
    tahapApproval: 1, // 1: Menunggu Kepsek, 2: Menunggu Superadmin, 3: Selesai
    approvalKepsek: {
      status: 'Menunggu',
      approverName: null,
      approverRole: 'Kepala Sekolah',
      tanggal: null,
      catatan: null,
    },
    approvalSuperadmin: {
      status: 'Menunggu',
      approverName: null,
      approverRole: 'Superadmin',
      tanggal: null,
      catatan: null,
    },
    createdAt: new Date().toISOString(),
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
  const durasi = hitungDurasiHari(mulai, selesai || mulai)
  if (durasi === 0) {
    return 'Tanggal pengajuan jatuh pada hari Minggu (hari libur sekolah). Silakan pilih hari kerja (Senin - Sabtu).'
  }
  if (!String(alasan || '').trim()) return 'Alasan wajib diisi agar pengajuan bisa ditinjau.'
  const aturan = aturanLampiran(jenis)
  if (aturan === 'wajib' && !lampiran) return `${normalisasiJenis(jenis)} wajib melampirkan dokumen pendukung.`
  if (lampiran?.size > MAKS_LAMPIRAN) return 'Ukuran lampiran maksimal 5 MB.'
  return ''
}
/** Kuota (hari) untuk jenis cuti berkuota; null jika tidak berkuota. */
export function kuotaJenis(nama) {
  const d = jenisIzinCuti(nama)
  return d?.kuota ?? null
}

/**
 * Memeriksa apakah izin/cuti sudah disetujui penuh oleh kedua tahap:
 * Kepala Sekolah (Tahap 1) DAN Superadmin (Tahap 2).
 * Kuota izin/cuti HANYA berkurang jika fungsi ini mengembalikan true.
 */
export function isLeaveFullyApproved(leave) {
  if (!leave) return false
  const status = String(leave.status || '').toLowerCase()
  if (status !== 'disetujui' && status !== 'approved') return false

  // Cek persetujuan Kepala Sekolah (Tahap 1)
  const kepsekStatus = String(leave.approvalKepsek?.status || '').toLowerCase()
  const isKepsekApproved = kepsekStatus === 'disetujui' || kepsekStatus === 'approved'

  // Cek persetujuan Superadmin (Tahap 2)
  const superadminStatus = String(leave.approvalSuperadmin?.status || '').toLowerCase()
  const isSuperadminApproved = superadminStatus === 'disetujui' || superadminStatus === 'approved'

  // WAJIB disetujui KEDUA-DUANYA: Kepala Sekolah DAN Superadmin
  return isKepsekApproved && isSuperadminApproved
}

/**
 * Hitung sisa kuota cuti untuk staff berdasarkan daftar leaves yang telah
 * disetujui penuh oleh Kepala Sekolah DAN Superadmin.
 *
 * 1. Tidak menghitung hari Minggu (hanya hari kerja yang mengurangi kuota).
 * 2. Kuota hanya berkurang jika disetujui penuh oleh kedua pihak (Kepsek DAN Superadmin).
 * 3. Sakit (Cuti Sakit / Izin Sakit) adalah izin pribadi karena alasan sakit dan TIDAK memotong cuti tahunan.
 */
export function hitungSisaKuota(staffId, jenis, leaves = []) {
  const kuota = kuotaJenis(jenis)
  if (kuota === null) return null
  const targetJenis = normalisasiJenis(jenis)

  const terpakai = (leaves || [])
    .filter((l) => {
      // 1. Harus milik staff yang bersangkutan
      const sid = l.staffId ?? l.staff_id
      if (sid !== staffId) return false

      // 2. Jenis cuti harus cocok persis
      const lJenis = normalisasiJenis(l.jenis)
      if (lJenis !== targetJenis) return false

      // 3. Sakit tidak memotong Cuti Tahunan (proteksi ganda)
      if (targetJenis === 'Cuti Tahunan') {
        const lower = String(l.jenis || '').toLowerCase()
        if (lower.includes('sakit')) return false
      }

      // 4. Syarat mutlak: WAJIB disetujui penuh oleh Kepala Sekolah DAN Superadmin
      return isLeaveFullyApproved(l)
    })
    .reduce((sum, l) => {
      // Hitung durasi hari kerja (tanpa hari Minggu)
      const d = Number(l.durasiHari ?? l.durasi_hari)
      const durasi = !Number.isNaN(d) && d > 0 ? d : hitungDurasiHari(l.mulai ?? l.tanggal_mulai, l.selesai ?? l.tanggal_selesai)
      return sum + durasi
    }, 0)

  return Math.max(0, kuota - terpakai)
}
