// ============================================================================
// ATURAN JAM KERJA GLOBAL + PENENTUAN STATUS PRESENSI
//
// Ini adalah SATU-SUMBER-KEBENARAN aturan presensi SimPres. Konsep shift
// (Shift Pagi/Siang/Sore, jadwal shift per unit, toleransi shift) sudah
// dihapus: presensi cukup dijawab oleh tanggal -> hari -> jam kerja.
//
//   `calculateAttendanceStatus(tanggal, jamMasuk)` adalah satu-satunya tempat
//   yang memutuskan "Tepat Waktu" atau "Terlambat" sekaligus menghitung
//   keterlambatan menitnya. Halaman mobile, monitoring, rekap, dashboard, dan
//   laporan PDF semuanya memanggil fungsi ini, sehingga tidak mungkin lagi ada
//   dua angka keterlambatan yang berbeda untuk presensi yang sama.
//
// ATURAN JAM KERJA GLOBAL (WIB)
//   Senin - Kamis : jam masuk 07:10, jam pulang 16:00
//   Jumat         : jam masuk 07:10, jam pulang bebas (tanpa batas minimal)
//   Sabtu         : jam masuk 07:30, jam pulang 13:00
//   Minggu        : bukan hari kerja
//
// Keterlambatan dihitung sebagai selisih menit antara jam masuk aktual dan batas
// jam masuk hari itu: masuk <= batas = Tepat Waktu, masuk > batas = Terlambat.
// ============================================================================

export const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export const ZONA_WAKTU_DEFAULT = 'WIB'

// Batas jam masuk & jam pulang per hari kerja.
export const JAM_MASUK_SENIN_KAMIS = '07:10'
export const JAM_PULANG_SENIN_KAMIS = '16:00'
export const JAM_MASUK_JUMAT = '07:10'
export const JAM_PULANG_JUMAT = null
export const JAM_MASUK_SABTU = '07:30'
export const JAM_PULANG_SABTU = '13:00'

// Label status yang dipakai seluruh aplikasi.
export const STATUS_TEPAT_WAKTU = 'Tepat Waktu'
export const STATUS_TERLAMBAT = 'Terlambat'
export const STATUS_BELUM_PRESENSI = 'Belum Presensi'
export const STATUS_HARI_LIBUR = 'Hari Libur'

function aturanHari(hariIndex) {
  if (hariIndex === 1 || hariIndex === 2 || hariIndex === 3 || hariIndex === 4) {
    return { jamMasuk: JAM_MASUK_SENIN_KAMIS, jamPulang: JAM_PULANG_SENIN_KAMIS }
  }
  if (hariIndex === 5) return { jamMasuk: JAM_MASUK_JUMAT, jamPulang: JAM_PULANG_JUMAT }
  if (hariIndex === 6) return { jamMasuk: JAM_MASUK_SABTU, jamPulang: JAM_PULANG_SABTU }
  return { jamMasuk: null, jamPulang: null }
}

// "07:10" / "07:10:33" -> 430. Format tak lazym menghasilkan null (bukan 0)
// supaya pemanggil memakai nilai default-nya sendiri, bukan diam-diam mengarang
// tengah malam.
export function jamKeMenit(jam) {
  const parts = /^(\d{1,2}):(\d{2})/.exec(String(jam || '').trim())
  if (!parts) return null
  const jamAngka = Number(parts[1])
  const menitAngka = Number(parts[2])
  if (jamAngka > 23 || menitAngka > 59) return null
  return jamAngka * 60 + menitAngka
}

// Kebalikan dari jamKeMenit: 435 -> "07:15".
export function menitKeJam(menit) {
  const total = Number(menit)
  if (!Number.isFinite(total) || total < 0) return null
  const jam = Math.floor(total / 60) % 24
  const sisa = total % 60
  return `${String(jam).padStart(2, '0')}:${String(sisa).padStart(2, '0')}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Tanggal ISO ("YYYY-MM-DD") dari Date, string ISO, atau string "YYYY-MM-DD". */
export function tanggalISO(tanggal = new Date()) {
  if (!tanggal) return null
  if (tanggal instanceof Date) {
    return `${tanggal.getFullYear()}-${pad(tanggal.getMonth() + 1)}-${pad(tanggal.getDate())}`
  }
  const teks = String(tanggal).trim()
  return /^\d{4}-\d{2}-\d{2}/.test(teks) ? teks.slice(0, 10) : null
}

/** Urutan hari (0=Minggu ... 6=Sabtu) dari Date / "YYYY-MM-DD" / "HH:MM" penuh. */
export function hariIndexTanggal(tanggal = new Date()) {
  if (tanggal instanceof Date) return tanggal.getDay()
  const iso = tanggalISO(tanggal)
  if (!iso) return null
  const [tahun, bulan, hari] = iso.split('-').map(Number)
  if (!tahun || !bulan || !hari) return null
  return new Date(tahun, bulan - 1, hari).getDay()
}

export function namaHariTanggal(tanggal = new Date()) {
  const index = hariIndexTanggal(tanggal)
  return index == null ? '-' : HARI_ID[index]
}

export function isHariKerja(tanggal = new Date()) {
  return jamKerjaRules(tanggal).hariKerja
}

// "07:10 - 16:00", "07:10 - bebas", atau "-" pada hari non-kerja.
export function labelJamKerja({ jamMasuk, jamPulang }) {
  if (!jamMasuk) return '-'
  return jamPulang ? `${jamMasuk} - ${jamPulang}` : `${jamMasuk} - bebas`
}

/**
 * Aturan jam kerja untuk satu tanggal. Seluruh aplikasi membaca jam masuk,
 * jam pulang, dan batas presensi dari sini — tidak ada lagi override per unit
 * atau per shift.
 */
export function jamKerjaRules(tanggal = new Date()) {
  const hariIndex = hariIndexTanggal(tanggal)
  const hari = hariIndex == null ? '-' : HARI_ID[hariIndex]
  const { jamMasuk, jamPulang } = hariIndex == null ? { jamMasuk: null, jamPulang: null } : aturanHari(hariIndex)
  const hariKerja = Boolean(jamMasuk)
  return {
    tanggal: tanggalISO(tanggal),
    hari,
    hariIndex,
    hariKerja,
    jamMasuk,
    jamPulang,
    jamKerja: labelJamKerja({ jamMasuk, jamPulang }),
    batasMasuk: jamMasuk,
    batasMasukMenit: jamKeMenit(jamMasuk),
    batasPulangMenit: jamKeMenit(jamPulang),
    // Jumat tidak punya batas minimal jam pulang, jadi komponen ini null.
    pulangBebas: hariKerja && jamPulang == null,
  }
}

/** Menit keterlambatan = jam masuk aktual dikurangi batas jam masuk hari itu. */
export function hitungLateMinutes(jamMasuk, batasMasuk) {
  const menitMasuk = jamKeMenit(jamMasuk)
  const menitBatas = jamKeMenit(batasMasuk)
  if (menitMasuk == null || menitBatas == null) return 0
  return Math.max(0, menitMasuk - menitBatas)
}

/**
 * FUNGSI PENENTUAN STATUS PRESENSI — dipakai semua halaman.
 *
 * Input : tanggal (Date atau "YYYY-MM-DD") dan jam masuk ("HH:MM[:SS]" / null)
 * Output: status hadir, terlambat/tidak, dan jumlah keterlambatan menitnya.
 *
 * Contoh: tanggal Senin, jam masuk 07:25, batas 07:10 -> status "Terlambat",
 * lateMinutes 15. Jam masuk 07:10 tepat pada batasnya -> "Tepat Waktu".
 */
export function calculateAttendanceStatus(tanggal = new Date(), jamMasuk = null, opsi = {}) {
  const rules = jamKerjaRules(tanggal)
  const jamMasukAktual = jamMasuk ? String(jamMasuk) : null
  const menitMasuk = jamMasukAktual ? jamKeMenit(jamMasukAktual) : null
  const jamPulangAktual = opsi.jamPulang ? String(opsi.jamPulang) : null
  const menitPulang = jamPulangAktual ? jamKeMenit(jamPulangAktual) : null

  const dasar = {
    ...rules,
    jamMasukAktual,
    jamPulangAktual,
    masuk: menitMasuk == null ? null : menitKeJam(menitMasuk),
    pulang: menitPulang == null ? null : menitKeJam(menitPulang),
    lateMinutes: 0,
    terlambat: false,
  }

  if (!rules.hariKerja) {
    return {
      ...dasar,
      status: STATUS_HARI_LIBUR,
      label: 'Hari libur',
      keterangan: `${rules.hari} bukan hari kerja SimPres.`,
    }
  }

  if (menitMasuk == null) {
    return {
      ...dasar,
      status: STATUS_BELUM_PRESENSI,
      label: 'Belum presensi',
      keterangan: `Batas presensi ${rules.jamMasuk}.`,
    }
  }

  const lateMinutes = hitungLateMinutes(jamMasukAktual, rules.jamMasuk)
  const terlambat = lateMinutes > 0
  return {
    ...dasar,
    lateMinutes,
    terlambat,
    status: terlambat ? STATUS_TERLAMBAT : STATUS_TEPAT_WAKTU,
    label: terlambat ? `${STATUS_TERLAMBAT} ${lateMinutes} menit` : STATUS_TEPAT_WAKTU,
    keterangan: terlambat
      ? `Masuk ${dasar.masuk}, batas ${rules.jamMasuk}. Terlambat ${lateMinutes} menit.`
      : `Masuk ${dasar.masuk}, batas ${rules.jamMasuk}.`,
  }
}

/**
 * Status absen pulang untuk satu tanggal. Jumat tidak punya batas minimal jam
 * pulang, jadi pulang kapan pun setelah presensi masuk tetap valid.
 */
export function calculateCheckoutStatus(tanggal = new Date(), jamPulang = null) {
  const rules = jamKerjaRules(tanggal)
  const menitPulang = jamPulang ? jamKeMenit(jamPulang) : null
  if (!rules.hariKerja) {
    return { ...rules, valid: false, label: 'Hari libur', keterangan: `${rules.hari} bukan hari kerja.` }
  }
  if (menitPulang == null) {
    return { ...rules, valid: false, label: 'Belum absen pulang', keterangan: `Jam pulang ${rules.jamPulang ?? 'bebas'}.` }
  }
  if (rules.pulangBebas) {
    return {
      ...rules,
      valid: true,
      label: 'Absen pulang valid',
      keterangan: `Jumat tidak memiliki batas minimal jam pulang. Pulang ${menitKeJam(menitPulang)} tetap valid.`,
    }
  }
  const terlambatPulang = Math.max(0, menitPulang - rules.batasPulangMenit)
  const lebihAwal = Math.max(0, rules.batasPulangMenit - menitPulang)
  return {
    ...rules,
    valid: true,
    terlambatPulang,
    lebihAwal,
    label: terlambatPulang > 0
      ? `Pulang lewat ${terlambatPulang} menit`
      : lebihAwal > 0
        ? `Pulang lebih awal ${lebihAwal} menit`
        : 'Tepat Waktu',
    keterangan: `Jam pulang ${rules.jamPulang}, tercatat ${menitKeJam(menitPulang)}.`,
  }
}

/**
 * Jendela presensi sebuah hari: terlalu awal, dalam jendela, atau sudah lewat
 * jam pulang.\name shift tidak lagi dipakai — batasnya mengikuti jam kerja
 * global hari tersebut.
 */
export function jendelaPresensi(menitSekarang, rules) {
  const mulai = jamKeMenit(rules?.jamMasuk)
  const tutup = jamKeMenit(rules?.jamPulang)
  const mulaiPresensi = mulai == null ? 0 : Math.max(0, mulai - 60)
  return {
    terlaluAwal: menitSekarang < mulaiPresensi,
    dalamJendela: tutup == null || (menitSekarang >= mulaiPresensi && menitSekarang <= tutup),
    lewatJamPulang: tutup != null && menitSekarang > tutup,
    mulai: mulaiPresensi,
    tutup: tutup == null ? null : tutup,
  }
}

/** Ringkasan aturan jam kerja global untuk semua hari, dipakai Pengaturan. */
export function daftarJamKerja() {
  return [1, 2, 3, 4, 5, 6].map((index) => {
    const rules = jamKerjaRules(new Date(2026, 0, 4 + index)) // 4 Jan 2026 = Minggu
    return {
      hari: HARI_ID[index],
      hariKerja: rules.hariKerja,
      jamMasuk: rules.jamMasuk,
      jamPulang: rules.jamPulang,
      jamKerja: rules.jamKerja,
    }
  })
}
