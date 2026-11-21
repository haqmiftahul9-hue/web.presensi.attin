/**
 * Formatter periode terpusat untuk halaman "Rekap & Laporan".
 *
 * Satu sumber kebenaran untuk keterangan periode yang dipakai konsisten oleh:
 *   1. UI filter & tabel di web
 *   2. Cetak langsung (window.print)
 *   3. Unduhan PDF (jsPDF)
 *   4. Unduhan Excel (SheetJS)
 *
 * Tidak boleh lagi muncul teks generik seperti "Bulan Ini" / "Hari Ini" pada
 * header laporan maupun kolom tabel. Setiap periode harus menampilkan waktu
 * yang spesifik.
 *
 * Contoh keluaran:
 *   Harian    -> header: "Harian - Sabtu, 21 November 2026"
 *                ringkas: "Sabtu, 21 Nov 2026"
 *   Mingguan  -> header: "Mingguan - 16 November 2026 s.d. 22 November 2026"
 *                ringkas: "16 Nov - 22 Nov 2026"
 *   Bulanan   -> header: "Bulanan - November 2026"
 *                ringkas: "November 2026"
 *   Tahunan   -> header: "Tahunan - Tahun 2026"
 *                ringkas: "Tahun 2026"
 *   Custom    -> header: "01 November 2026 s.d. 21 November 2026"
 *                ringkas: "01 Nov - 21 Nov 2026"
 */

export const BULAN_PENUH = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export const HARI_PENUH = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const JENIS_PERIODE = {
  HARIAN: 'Harian',
  MINGGUAN: 'Mingguan',
  BULANAN: 'Bulanan',
  TAHUNAN: 'Tahunan',
  CUSTOM: 'Custom Tanggal',
}

/**
 * Normalisasi berbagai variasi penulisan jenis periode menjadi token baku.
 */
export function normalisasiJenisPeriode(jenis) {
  const key = String(jenis || '').trim().toLowerCase()
  if (key === 'harian' || key === 'daily' || key === 'per hari') return JENIS_PERIODE.HARIAN
  if (key === 'mingguan' || key === 'weekly' || key === 'per minggu') return JENIS_PERIODE.MINGGUAN
  if (key === 'bulanan' || key === 'monthly' || key === 'per bulan') return JENIS_PERIODE.BULANAN
  if (key === 'tahunan' || key === 'yearly' || key === 'annual' || key === 'per tahun') return JENIS_PERIODE.TAHUNAN
  if (key === 'custom' || key === 'custom tanggal' || key === 'rentang tanggal' || key === 'rentang') return JENIS_PERIODE.CUSTOM
  return JENIS_PERIODE.BULANAN
}

/**
 * Parse tanggal menjadi objek Date waktu lokal.
 * String format "YYYY-MM-DD" di-parse manual agar tidak bergeser zona waktu.
 */
export function parseTanggal(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** "21 November 2026" (hari diisi nol dua digit: "01 November 2026") */
export function formatTanggalPanjang(value) {
  const d = parseTanggal(value)
  if (!d) return '-'
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_PENUH[d.getMonth()]} ${d.getFullYear()}`
}

/** "21 Nov 2026" (hari diisi nol dua digit: "01 Nov 2026") */
export function formatTanggalPendek(value) {
  const d = parseTanggal(value)
  if (!d) return '-'
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`
}

/** "01 Nov" — tanpa tahun, untuk pembuka rentang tanggal */
export function formatTanggalPendekTanpaTahun(value) {
  const d = parseTanggal(value)
  if (!d) return '-'
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN_SINGKAT[d.getMonth()]}`
}

/** "Sabtu, 21 November 2026" */
export function formatHariTanggalPanjang(value) {
  const d = parseTanggal(value)
  if (!d) return '-'
  return `${HARI_PENUH[d.getDay()]}, ${formatTanggalPanjang(d)}`
}

/** "Sabtu, 21 Nov 2026" */
export function formatHariTanggalPendek(value) {
  const d = parseTanggal(value)
  if (!d) return '-'
  return `${HARI_PENUH[d.getDay()]}, ${formatTanggalPendek(d)}`
}

/** "November 2026" */
export function formatBulanTahun(bulan, tahun) {
  const idx = Number(bulan)
  if (!Number.isInteger(idx) || idx < 0 || idx > 11) return '-'
  return `${BULAN_PENUH[idx]} ${tahun}`
}

function slugTanggal(d) {
  return `${String(d.getDate()).padStart(2, '0')}_${BULAN_PENUH[d.getMonth()]}_${d.getFullYear()}`
}

/**
 * Rentang hari Senin - Minggu untuk tanggal acuan.
 */
export function rentangMinggu(value) {
  const d = parseTanggal(value) || new Date()
  const offset = (d.getDay() + 6) % 7 // 0 = Senin
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  return { start, end }
}

/**
 * Resolve bulan & tahun dari berbagai bentuk input:
 *   - "2026-11"  -> November 2026
 *   - 10         -> index bulan 0-11
 *   - Date       -> bulan & tahun dari objek Date
 *   - null       -> bulan/tahun dari tanggal acuan
 */
function resolveBulanTahun(bulan, tahun, acuan) {
  let bulanIdx = null
  let tahunOtomatis = null

  if (bulan instanceof Date && !Number.isNaN(bulan.getTime())) {
    bulanIdx = bulan.getMonth()
    tahunOtomatis = bulan.getFullYear()
  } else if (typeof bulan === 'string') {
    const match = bulan.match(/^(\d{4})-(\d{1,2})$/)
    if (match) {
      bulanIdx = Number(match[2]) - 1
      tahunOtomatis = Number(match[1])
    }
  } else if (typeof bulan === 'number' && Number.isFinite(bulan)) {
    bulanIdx = bulan
  }

  if (bulanIdx === null) bulanIdx = acuan.getMonth()
  if (bulanIdx < 0 || bulanIdx > 11) bulanIdx = acuan.getMonth()

  const tahunFinal = tahun !== null && tahun !== undefined && tahun !== ''
    ? Number(tahun)
    : (tahunOtomatis ?? acuan.getFullYear())

  return { bulanIdx, tahun: Number.isFinite(tahunFinal) ? tahunFinal : acuan.getFullYear() }
}

/**
 * Formatter utama. Mengembalikan seluruh bentuk label periode sekaligus
 * supaya tidak ada lagi penulisan "Bulan Ini" dsb. di halaman mana pun.
 *
 * @param {object} options
 * @param {string} options.jenis        'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan' | 'Custom Tanggal'
 * @param {Date|string} options.tanggal  tanggal acuan (untuk Harian/Mingguan)
 * @param {number|string|Date} options.bulan  bulan (index 0-11, 'YYYY-MM', atau Date)
 * @param {number|string} options.tahun   tahun
 * @param {string} options.customStart   tanggal mulai rentang custom
 * @param {string} options.customEnd     tanggal selesai rentang custom
 * @param {Date} options.now             tanggal acuan default
 */
export function getPeriodeInfo(options = {}) {
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now : new Date()
  const jenis = normalisasiJenisPeriode(options.jenis)

  // ---------- Custom Tanggal ----------
  if (jenis === JENIS_PERIODE.CUSTOM) {
    const start = parseTanggal(options.customStart)
    const end = parseTanggal(options.customEnd)
    if (start && end) {
      const detail = `${formatTanggalPanjang(start)} s.d. ${formatTanggalPanjang(end)}`
      const ringkas = `${formatTanggalPendekTanpaTahun(start)} - ${formatTanggalPendek(end)}`
      return {
        jenis,
        detail,
        header: detail,
        ringkas,
        slug: `Custom_${slugTanggal(start)}_sd_${slugTanggal(end)}`,
        tanggal: start,
        bulan: start.getMonth(),
        tahun: start.getFullYear(),
        start,
        end,
      }
    }
    return {
      jenis,
      detail: 'Custom Tanggal',
      header: 'Custom Tanggal',
      ringkas: 'Custom Tanggal',
      slug: 'Custom_Tanggal',
      tanggal: null,
      bulan: null,
      tahun: null,
      start: null,
      end: null,
    }
  }

  // ---------- Harian ----------
  if (jenis === JENIS_PERIODE.HARIAN) {
    const t = parseTanggal(options.tanggal) || now
    const detail = formatHariTanggalPanjang(t)
    return {
      jenis,
      detail,
      header: `${jenis} - ${detail}`,
      ringkas: formatHariTanggalPendek(t),
      slug: `Harian_${slugTanggal(t)}`,
      tanggal: t,
      bulan: t.getMonth(),
      tahun: t.getFullYear(),
      start: t,
      end: t,
    }
  }

  // ---------- Mingguan ----------
  if (jenis === JENIS_PERIODE.MINGGUAN) {
    const t = parseTanggal(options.tanggal) || now
    const { start, end } = rentangMinggu(t)
    const detail = `${formatTanggalPanjang(start)} s.d. ${formatTanggalPanjang(end)}`
    return {
      jenis,
      detail,
      header: `${jenis} - ${detail}`,
      ringkas: `${formatTanggalPendekTanpaTahun(start)} - ${formatTanggalPendek(end)}`,
      slug: `Mingguan_${slugTanggal(start)}_sd_${slugTanggal(end)}`,
      tanggal: t,
      bulan: t.getMonth(),
      tahun: t.getFullYear(),
      start,
      end,
    }
  }

  // ---------- Bulanan ----------
  if (jenis === JENIS_PERIODE.BULANAN) {
    const acuan = parseTanggal(options.tanggal) || now
    const { bulanIdx, tahun } = resolveBulanTahun(options.bulan, options.tahun, acuan)
    const detail = formatBulanTahun(bulanIdx, tahun)
    return {
      jenis,
      detail,
      header: `${jenis} - ${detail}`,
      ringkas: detail,
      slug: `Bulanan_${BULAN_PENUH[bulanIdx]}_${tahun}`,
      tanggal: new Date(tahun, bulanIdx, 1),
      bulan: bulanIdx,
      tahun,
      start: new Date(tahun, bulanIdx, 1),
      end: new Date(tahun, bulanIdx + 1, 0),
    }
  }

  // ---------- Tahunan ----------
  const acuan = parseTanggal(options.tanggal) || now
  const tahun = options.tahun !== null && options.tahun !== undefined && options.tahun !== ''
    ? Number(options.tahun)
    : acuan.getFullYear()
  const tahunFinal = Number.isFinite(tahun) ? tahun : acuan.getFullYear()
  const detail = `Tahun ${tahunFinal}`
  return {
    jenis,
    detail,
    header: `${jenis} - ${detail}`,
    ringkas: detail,
    slug: `Tahunan_${tahunFinal}`,
    tanggal: new Date(tahunFinal, 0, 1),
    bulan: null,
    tahun: tahunFinal,
    start: new Date(tahunFinal, 0, 1),
    end: new Date(tahunFinal, 11, 31),
  }
}

/** Label panjang untuk header laporan. */
export function getPeriodeHeader(options = {}) {
  return getPeriodeInfo(options).header
}

/** Label ringkas untuk kolom tabel ("Periode Rekap"). */
export function getPeriodeRingkas(options = {}) {
  return getPeriodeInfo(options).ringkas
}

/** Slug aman untuk nama file unduhan. */
export function getPeriodeSlug(options = {}) {
  return getPeriodeInfo(options).slug
}
