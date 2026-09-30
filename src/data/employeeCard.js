// Model tabel employee_card.
//
// Pemisahan ini disengaja: data pegawai (nama, jabatan, unit, foto, NIY)
// TIDAK pernah disalin ke sini. Kartu hanya menyimpan metadata penerbitan
// yang tidak ada di data pegawai — QR, barcode, masa berlaku, dan riwayat
// cetak. Semua isi kartu lain di-render langsung dari state.staff, sehingga
// begitu ada edit di Data Guru/Pegawai, kartu di halaman Cetak Kartu ID ikut
// berubah tanpa ada langkah sinkronisasi manual.
//
// Bentuk baris (siap dipindah ke backend tanpa perubahan pemanggil):
//   id              kode kartu (CARD-{employee_id})
//   employee_id     relasi ke staff.id
//   qr_code         payload QR, format SIMPRESPEG-{NIY}
//   barcode         payload barcode 1D, format NIY (fallback NIP/id)
//   issued_date     tanggal terbit (YYYY-MM-DD)
//   expired_date    masa berlaku (YYYY-MM-DD)
//   printed_count   berapa kali kartu dicetak
//   last_printed_at waktu cetak terakhir (ISO string)

export const CARD_QR_PREFIX = 'SIMPRESPEG-'
export const CARD_QR_PREFIX_LABEL = 'SIMPRESPEG'

// Ukuran kartu PVC CR80 (ID-1) — standar printer kartu & referensi kiosk.
export const CARD_SIZE_MM = { width: 85.6, height: 53.98 }

// Geometri kartu dalam satuan "em".
//
// 1 em = lebar kartu / emPerWidth = 85.6 / 39.3 = 2.178 mm. Semua ukuran
// (font, tinggi barcode, sisi QR) ditulis sebagai kelipatan em supaya satu
// komponen bisa dipakai dua kali tanpa perubahan prop: di layar mengikuti
// lebar kolom grid, di cetak mengikuti ukuran kertas CR80 yang asli.
//
// Angka di sini dipakai bersama oleh kartu di DOM (EmployeeIdCard) dan gambar
// vektor di PDF (utils/cardPrint.js), sehingga hasil "Unduh PDF" dan hasil
// "Cetak Terpilih" tidak mungkin berbeda proporsi.
//
// Syarat dimensi fisik yang dijaga:
  // QR  10.2 em = 22.2 mm  (minimal untuk pemindaian cepat dari kartu saku)
  // Bar  3.3 em  = 7.2 mm  (tinggi minimum Code 128 yang aman dipindai)
export const EM_PER_WIDTH = 39.3
export const MM_PER_EM = CARD_SIZE_MM.width / EM_PER_WIDTH

export function emToMm(em) {
  return em * MM_PER_EM
}

export function mmToEm(mm) {
  return mm / MM_PER_EM
}

export const CARD_GEOMETRY = {
  header: 4.1,
  footer: 6.9,
  padX: 0.7,

  // Header
  logo: 2.0,
  headerLabel: 0.55,
  headerTitle: 0.82,
  headerUnit: 0.75,

  // Body
  bodyPadY: 0.45,
  photoW: 9.2,
  photoH: 11.2,
  badge: 0.58,
  badgeGap: 0.28,
  gap: 0.65,
  qr: 10.2,
  qrLabel: 0.48,
  qrLabelGap: 0.12,

  // Tipografi (nama paling dominan, lalu jabatan, lalu NIY/NIP)
  name: 1.5,
  role: 0.95,
  niy: 0.9,
  nip: 0.8,
  meta: 0.78,

  // Footer
  barcodeW: 20.0,
  barcodeH: 3.3,
  barcodeText: 0.66,
}

// Masa berlaku default kartu pegawai.
export const DEFAULT_VALIDITY_YEARS = 2
export const VALIDITY_YEAR_OPTIONS = [1, 2, 3, 5]

// Nilai status kepegawaian yang dikelompokkan menjadi tiga label di kartu.
const TETAP_LABELS = ['PNS', 'GTT', 'Guru Tetap Yayasan', 'Tetap', 'PNS/GTT', 'ASN']
const KONTRAK_LABELS = ['Kontrak', 'PKWT', 'PKK', 'Kontrak / PKWT', 'CS']
const HONORER_LABELS = ['Honorer', 'Honorarium', 'Lembaga']

export const CARD_STATUS_LABELS = ['Tetap', 'Kontrak', 'Honorer']

/**
 * Petrolah kepegawaian -> label tiga kelompok yang dipakai di kartu.
 * Nilai di luar daftar baku dikembalikan apa adanya supaya data baru dari
 * form/import tidak pernah hilang informasinya.
 */
export function statusKepegawaianGroup(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  const upper = raw.toUpperCase()
  if (HONORER_LABELS.some((l) => upper.includes(l.toUpperCase()))) return 'Honorer'
  if (KONTRAK_LABELS.some((l) => upper.includes(l.toUpperCase()))) return 'Kontrak'
  if (TETAP_LABELS.some((l) => upper.includes(l.toUpperCase()))) return 'Tetap'
  return raw
}

// Warna badge sesuai kelompok (mengikuti palet SimPres di tailwind.config.js).
export const CARD_STATUS_STYLES = {
  Tetap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Kontrak: 'bg-sky-50 text-sky-700 border-sky-200',
  Honorer: 'bg-amber-50 text-amber-800 border-amber-200',
  '-': 'bg-surface-container text-on-surface-variant border-outline/30',
}

export function cardStatusStyle(value) {
  return CARD_STATUS_STYLES[statusKepegawaianGroup(value)] || CARD_STATUS_STYLES['-']
}

// Kode singkat unit untuk badge logo pada kartu: "UNT-SD-02" -> "SD".
// Bagian angka-only dibuang supaya badge tidak pernah jadi "SD0".
export function shortUnitCode(unit) {
  const source = String(unit?.kode || unit?.nama || 'U')
  const parts = source
    .split('-')
    .filter((part) => part && !/^UNT$/i.test(part) && !/^\d+$/.test(part))
  return parts.join('').slice(0, 3).toUpperCase() || 'U'
}

/** Payload QR unik pegawai: SIMPRESPEG-{NIY}. */
export function cardQrValue(staff) {
  if (!staff) return ''
  const niy = String(staff.niy ?? '').trim()
  if (niy) return `${CARD_QR_PREFIX}${niy}`
  // Pegawai tanpa NIY (data belum lengkap) tetap harus punya kartu unik.
  const nip = String(staff.nip ?? '').trim()
  return `${CARD_QR_PREFIX}${nip || staff.id}`
}

/** Payload barcode 1D: NIY, atau NIP sebagai cadangan. */
export function cardBarcodeValue(staff) {
  if (!staff) return ''
  return String(staff.niy ?? '').trim() || String(staff.nip ?? '').trim() || String(staff.id)
}

/** Foto pegawai dibaca dari field yang benar-benar ada di store. */
export function cardPhotoOf(staff) {
  if (!staff) return ''
  return String(staff.foto || staff.photo || staff.fotoUrl || staff.avatar || '').trim()
}

export function toDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toDateInputValue(new Date())
}

export function addYears(isoDate, years) {
  const [y, m, d] = String(isoDate || todayISO()).split('-').map(Number)
  const date = new Date(y || 1970, (m || 1) - 1, d || 1)
  date.setFullYear(date.getFullYear() + (Number(years) || DEFAULT_VALIDITY_YEARS))
  return toDateInputValue(date)
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function formatDateID(isoDate) {
  const value = String(isoDate || '').trim()
  if (!value) return '-'
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

export function formatDateTimeID(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDateID(toDateInputValue(date))}, ${hours}:${minutes}`
}

/**
 * Baris employee_card untuk satu pegawai. Dipakai saat store diinisialisasi
 * dan setiap kali ada pegawai baru masuk, sehingga tabel kartu tidak pernah
 * kosong untuk pegawai yang datanya sudah lengkap.
 */
export function buildEmployeeCard(staff, { issuedDate = todayISO(), validityYears = DEFAULT_VALIDITY_YEARS } = {}) {
  return {
    id: `CARD-${staff.id}`,
    employee_id: staff.id,
    qr_code: cardQrValue(staff),
    barcode: cardBarcodeValue(staff),
    issued_date: issuedDate,
    expired_date: addYears(issuedDate, validityYears),
    printed_count: 0,
    last_printed_at: null,
  }
}

export function buildEmployeeCards(staffList, options) {
  return (staffList || []).map((staff) => buildEmployeeCard(staff, options))
}

/**
 * Gabungkan baris employee_card dengan data pegawai terkini.
 * Kartu selalu membaca nama/jabatan/unit/foto dari store, sehingga perubahan
 * data pegawai langsung tercermin tanpa menyentuh tabel kartu.
 */
export function mergeCardWithStaff(card, staff) {
  return {
    card: card || buildEmployeeCard(staff),
    staff,
    qr: cardQrValue(staff),
    barcode: cardBarcodeValue(staff),
    photo: cardPhotoOf(staff),
    initials: initialsForCard(staff.name),
    statusGroup: statusKepegawaianGroup(staff.statusPegawai),
  }
}

export function initialsForCard(name) {
  const parts = String(name || '').split(/[\s,]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

// Layout cetak yang tersedia. Kolom x baris menentukan isi satu lembar A4.
// CR80 = satu kartu per halaman untuk printer kartu direct-to-card.
export const PRINT_LAYOUTS = [
  { value: 'cr80', label: 'CR80 - Kartu PVC (85.60 x 53.98 mm)', columns: 1, rows: 1, pageFormat: 'card' },
  { value: 'a4-8', label: 'A4 - 8 Kartu per Lembar (2 x 4)', columns: 2, rows: 4, pageFormat: 'a4' },
  { value: 'a4-10', label: 'A4 - 10 Kartu per Lembar (2 x 5)', columns: 2, rows: 5, pageFormat: 'a4' },
]

export function printLayoutByValue(value) {
  return PRINT_LAYOUTS.find((l) => l.value === value) || PRINT_LAYOUTS[0]
}
