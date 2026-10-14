// ============================================================================
// MODUL MOBILE GURU/PEGAWAI — helper murni (tanpa React).
//
// Semua perhitungan yang dipakai halaman mobile (jarak geofence, status
// kehadiran, langkah validasi, rekap bulanan) hidup di sini supaya bisa diuji
// tanpa merender dan tidak tersebar di dalam komponen.
//
// Aturan jam kerja dan penentuan status Tepat Waktu/Terlambat TIDAK di sini:
// keduanya hidup di data/jamKerja.js supaya halaman mobile, monitoring, rekap,
// dashboard, dan laporan PDF memakai fungsi yang sama.
// ============================================================================

import { calculateAttendanceStatus, jamKerjaRules, jendelaPresensi, STATUS_TERLAMBAT, HARI_ID, HARI_PENDEK } from './jamKerja.js'
import { kelompokIzinCuti } from './jenisIzinCuti.js'

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// Nama hari berasal dari modul jam kerja — satu sumber untuk seluruh aplikasi.
export { HARI_ID, HARI_PENDEK }
export { calculateAttendanceStatus, jamKerjaRules }
export { BULAN_ID, BULAN_PENDEK }

/** Jarak dua titik di permukaan bumi (meter), rumus Haversine. */
export function jarakMeter(latitude, longitude, latitudeUnit, longitudeUnit) {
  if ([latitude, longitude, latitudeUnit, longitudeUnit].some((v) => !Number.isFinite(Number(v)))) return null
  const R = 6_371_000
  const toRad = (v) => (Number(v) * Math.PI) / 180
  const dLat = toRad(latitudeUnit - latitude)
  const dLon = toRad(longitudeUnit - longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(latitudeUnit)) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))))
}

/** Jarak ke titik presensi unit, atau null bila unit belum punya koordinat. */
export function jarakKeUnit(posisi, unit) {
  if (!posisi || !unit) return null
  return jarakMeter(posisi.latitude, posisi.longitude, unit.latitude, unit.longitude)
}

export function formatMeter(meter) {
  if (!Number.isFinite(meter)) return '-'
  return meter >= 1000 ? `${(meter / 1000).toFixed(1)} km` : `${meter} m`
}

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function jamMenitDariDate(date) {
  return date.getHours() * 60 + date.getMinutes()
}

export function jamMenitKeJam(menit) {
  const aman = Number.isFinite(menit) ? menit : 0
  return `${pad(Math.floor(aman / 60) % 24)}:${pad(aman % 60)}`
}

export function jamDetik(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "07:02:31" -> "07:02" untuk kartu ringkasan. */
export function jamPendek(waktu) {
  if (!waktu) return null
  const parts = String(waktu).split(':')
  if (parts.length < 2) return waktu
  return `${pad(Number(parts[0]))}:${pad(Number(parts[1]))}`
}

export function tanggalPanjang(date) {
  return `${HARI_ID[date.getDay()]}, ${date.getDate()} ${BULAN_ID[date.getMonth()]} ${date.getFullYear()}`
}

export function tanggalPendek(date) {
  return `${date.getDate()} ${BULAN_PENDEK[date.getMonth()]} ${date.getFullYear()}`
}

export function tanggalPendekISO(iso) {
  const [tahun, bulan, tanggal] = String(iso).split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return iso
  return `${tanggal} ${BULAN_PENDEK[bulan - 1]}`
}

export function hariPendekISO(iso) {
  const [tahun, bulan, tanggal] = String(iso).split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return iso
  return HARI_PENDEK[new Date(tahun, bulan - 1, tanggal).getDay()]
}

/** "2026-10-01" -> "Senin, 01 Oktober 2026" — format tanggal pada kartu riwayat. */
export function tanggalLengkapISO(iso) {
  const [tahun, bulan, tanggal] = String(iso || '').split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return iso || '-'
  const date = new Date(tahun, bulan - 1, tanggal)
  return `${HARI_ID[date.getDay()]}, ${pad(tanggal)} ${BULAN_ID[bulan - 1]} ${tahun}`
}

/** "2026-10-01" -> "01/10/2026", format isian filter tanggal. */
export function isoKeTanggalID(iso) {
  const [tahun, bulan, tanggal] = String(iso || '').split('-').map(Number)
  if (!tahun || !bulan || !tanggal) return ''
  return `${pad(tanggal)}/${pad(bulan)}/${tahun}`
}

/**
 * "01/10/2026" -> "2026-10-01". Mengembalikan null bila formatnya bukan
 * dd/mm/yyyy atau tanggalnya tidak ada di kalender (mis. 31/02/2026), supaya
 * filter tidak pernah diam-diam menampilkan periode yang salah.
 */
export function tanggalIDKeISO(teks) {
  const cocok = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(teks || '').trim())
  if (!cocok) return null
  const tanggal = Number(cocok[1])
  const bulan = Number(cocok[2])
  const tahun = Number(cocok[3])
  if (bulan < 1 || bulan > 12 || tanggal < 1) return null
  const date = new Date(tahun, bulan - 1, tanggal)
  // Tolak tanggal yang meluber ke bulan lain, mis. 31 Februari.
  if (date.getFullYear() !== tahun || date.getMonth() !== bulan - 1 || date.getDate() !== tanggal) return null
  return `${tahun}-${pad(bulan)}-${pad(tanggal)}`
}

/** Jumlah hari inklusif dari satu rentang ISO. 0 bila rentangnya tidak valid. */
export function hitungRentangHari(mulai, selesai) {
  if (!mulai || !selesai) return 0
  const a = new Date(`${mulai}T00:00:00`)
  const b = new Date(`${selesai}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  const selisih = Math.round((b - a) / 86400000)
  return selisih < 0 ? 0 : selisih + 1
}

export function isoHariIni(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function bulanKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function namaBulanDariKey(key) {
  const bulan = Number(String(key).split('-')[1])
  return BULAN_ID[bulan - 1] || '-'
}

/** "Hendra Kurniawan, S.Pd.I" -> "Hendra" (gelar dibuang). */
export function namaDepan(nama) {
  return String(nama || '').split(',')[0].trim() || 'Pengguna'
}

// Sapaan ("Umi", "Ustadz", "Ustadzah") TIDAK ada di modul ini. Satu-satunya
// sumbernya adalah data/sapaanPegawai.js supaya dashboard, profil, kartu ID,
// dan notifikasi tidak pernah berbeda.

// Nama ini ikut dipakai desktop (kartu ID), jadi tetap diekspor ulang dari
// modul sapaan terpusat.
export {
  getEmployeeGreeting,
  getEmployeeSalutation,
  getEmployeeFormalName,
  namaTanpaGelar,
} from './sapaanPegawai.js'

/**
 * Jendela presensi sebuah hari mengikuti jam kerja global: terlalu awal, dalam
 * jendela, atau sudah lewat jam pulang. Konsep shift sudah dihapus.
 */
export function cekJendelaPresensi(menitSekarang, rules) {
  return jendelaPresensi(menitSekarang, rules)
}

/**
 * Langkah validasi presensi. Fungsi murni: menerima hasil pengukuran lalu
 * mengembalikan daftar langkah beserta statusnya, sehingga halaman tinggal
 * menjalankannya berurutan (dengan jeda animasi) tanpa logika apa pun.
 */
export function langkahValidasi({ lokasi, waktu, biometri }) {
  return [
    {
      key: 'lokasi',
      icon: 'my_location',
      judul: 'Validasi Lokasi',
      detail: lokasi?.detail || 'Mencoba membaca koordinat GPS',
      ok: Boolean(lokasi?.dalamRadius),
    },
    {
      key: 'waktu',
      icon: 'schedule',
      judul: 'Validasi Waktu',
      detail: waktu?.detail || 'Memeriksa jam masuk dan batas hari kerja',
      ok: Boolean(waktu?.ok),
    },
    {
      key: 'biometri',
      icon: biometri?.icon || 'face',
      judul: biometri?.judul || 'Validasi Wajah',
      detail: biometri?.detail || 'Menyelaraskan biometrik',
      ok: Boolean(biometri?.ok),
    },
  ]
}

/** Rekap kehadiran satu pegawai untuk satu bulan ("YYYY-MM"). */
export function rekapBulanan(riwayat, key) {
  const baris = (riwayat || []).filter((r) => String(r.date || '').startsWith(key))
  const hadir = baris.filter((r) => r.masuk)
  const terlambat = hadir.filter((r) => (r.lateMinutes || 0) > 0)
  const tepatWaktu = hadir.length - terlambat.length
  const totalHariKerja = 22
  return {
    key,
    namaBulan: namaBulanDariKey(key),
    hadir: hadir.length,
    terlambat: terlambat.length,
    tepatWaktu,
    total: baris.length,
    persen: totalHariKerja ? Math.round((hadir.length / totalHariKerja) * 100) : 0,
    totalHariKerja,
  }
}

/** Rata-rata menit keterlambatan; null bila tidak pernah terlambat. */
export function rataKeterlambatan(riwayat, key) {
  const terlambat = (riwayat || []).filter((r) => String(r.date || '').startsWith(key) && (r.lateMinutes || 0) > 0)
  if (!terlambat.length) return null
  const total = terlambat.reduce((sum, r) => sum + (r.lateMinutes || 0), 0)
  return Math.round(total / terlambat.length)
}

// ===== Riwayat harian (halaman Riwayat & Slip Kehadiran) =====

const BULAN_INDEX = BULAN_PENDEK.reduce((acc, nama, i) => {
  acc[nama.toLowerCase()] = i + 1
  return acc
}, {})

/**
 * Periode pengajuan pada data izin/cuti ditulis bebas ("16-18 Sep 2026",
 * "15 Sep 2026"). Fungsi ini mengubahnya menjadi rentang tanggal ISO agar bisa
 * dicocokkan dengan baris presensi per hari; format tak lazim menghasilkan null
 * supaya tidak pernah salah menandai hari sebagai izin.
 */
export function parsePeriode(periode) {
  const teks = String(periode || '').trim()
  const pola = /(\d{1,2})\s*(?:[-–]\s*(\d{1,2}))?\s*([A-Za-z]{3,9})\s+(\d{4})/
  const cocok = pola.exec(teks)
  if (!cocok) return null
  const bulan = BULAN_INDEX[cocok[3].slice(0, 3).toLowerCase()]
  if (!bulan) return null
  const tahun = Number(cocok[4])
  const mulai = `${tahun}-${pad(bulan)}-${pad(Number(cocok[1]))}`
  const akhirHari = cocok[2] ? Number(cocok[2]) : Number(cocok[1])
  const selesai = `${tahun}-${pad(bulan)}-${pad(akhirHari)}`
  return mulai <= selesai ? { mulai, selesai } : { mulai: selesai, selesai: mulai }
}

/**
 * Rentang ISO dari satu pengajuan izin/cuti.
 *
 * Pengajuan baru menyimpan `mulai` dan `selesai` sebagai ISO, jadi rentang
 * dibaca dari sana — ini yang membuat cuti melahirkan (yang bisa 3 bulan dan
 * melewati pergantian bulan) terhitung benar. Pengajuan lama yang hanya punya
 * teks `periode` tetap dibaca lewat parsePeriode() sebagai cadangan.
 */
export function rentangPengajuan(item) {
  if (!item) return null
  const mulai = typeof item === 'string' ? null : String(item.mulai || '').slice(0, 10)
  const selesai = typeof item === 'string' ? null : String(item.selesai || '').slice(0, 10)
  if (mulai && selesai) {
    return mulai <= selesai ? { mulai, selesai } : { mulai: selesai, selesai: mulai }
  }
  const teks = typeof item === 'string' ? item : item.periode
  return parsePeriode(teks)
}

/** Daftar hari (ISO) yang tercakup satu pengajuan izin/cuti. */
export function hariDariPeriode(item) {
  const rentang = rentangPengajuan(item)
  if (!rentang) return []
  const hasil = []
  const akhir = new Date(`${rentang.selesai}T00:00:00`)
  const sekarang = new Date(`${rentang.mulai}T00:00:00`)
  // Pengajuan lebih dari satu tahun masih aman: batas 400 hari mencegah loop
  // tak terbatas bila data rusak.
  let guard = 0
  while (sekarang <= akhir && guard < 400) {
    hasil.push(isoDariDate(sekarang))
    sekarang.setDate(sekarang.getDate() + 1)
    guard += 1
  }
  return hasil
}

export function isoDariDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Peta tanggal -> pengajuan yang memuat tanggal tersebut. Hanya pengajuan
 * berstatus Disetujui yang dihitung: pengajuan yang masih Menunggu atau Ditolak
 * tidak boleh relieving hari kerja pegawai.
 */
export function izinPerTanggal(leaves, { hanyaDisetujui = true } = {}) {
  const peta = new Map()
  ;(leaves || []).forEach((item) => {
    if (hanyaDisetujui && item.status !== 'Disetujui') return
    // Barikanya, bukan hanya `item.periode`: cuti melahirkan punya tanggal ISO
    // yang mencakup beberapa bulan, sedangkan teks periode tidak bisa
    // merepresentasikannya dengan utuh.
    hariDariPeriode(item).forEach((iso) => {
      if (!peta.has(iso)) peta.set(iso, item)
    })
  })
  return peta
}

/**
 * Label status sesuai jenis pengajuan: cuti untuk kelompok "Cuti", izin untuk
 * sisanya. Sumbernya daftar jenis terpusat (data/jenisIzinCuti.js) supaya
 * "Cuti Sakit" dan "Sakit" sama-sama dihitung sebagai cuti.
 */
export function labelIzin(jenis) {
  return kelompokIzinCuti(jenis) === 'Cuti' ? 'Cuti' : 'Izin'
}

/**
 * Status satu hari: izin/cuti yang disetujui menang atas ketiadaan baris presensi,
 * lalu status kehadiran diambil dari calculateAttendanceStatus() — fungsi yang
 * sama dengan yang dipakai halaman Presensi, Monitoring, dan Rekap.
 */
export function statusHari({ tanggal, masuk, lateMinutes, izin } = {}) {
  if (izin) {
    const cuti = labelIzin(izin.jenis) === 'Cuti'
    return {
      label: cuti ? 'Cuti' : 'Izin',
      kelas: cuti ? 'bg-blue-100 text-blue-900' : 'bg-secondary-fixed text-on-secondary-fixed',
      ikon: cuti ? 'beach_access' : 'event_busy',
    }
  }
  if (!masuk) {
    return { label: 'Tanpa Presensi', kelas: 'bg-surface-container text-on-surface-variant', ikon: 'do_not_disturb_on' }
  }
  const hasil = calculateAttendanceStatus(tanggal, masuk)
  const menit = hasil.lateMinutes || lateMinutes || 0
  if (menit > 0) {
    return { label: `${STATUS_TERLAMBAT} ${menit} mnt`, kelas: 'bg-amber-50 text-amber-800', ikon: 'schedule' }
  }
  return { label: hasil.status, kelas: 'bg-emerald-50 text-emerald-700', ikon: 'check_circle' }
}

/** Metode presensi diterjemahkan ke istilah yang dipakai di seluruh modul. */
const METODE_LABEL = {
  'Face Recognition': { label: 'Wajah', ikon: 'face', ket: 'Face Recognition' },
  'QR Code': { label: 'Barcode', ikon: 'qr_code_scanner', ket: 'QR Code kartu ID' },
  'Mobile GPS': { label: 'GPS', ikon: 'my_location', ket: 'Mobile GPS' },
}

export function metodePresensi(method) {
  return METODE_LABEL[method] || { label: method || 'Tidak tercatat', ikon: 'help', ket: method || 'Tidak tercatat' }
}

/**
 * Rekap satu rentang tanggal: kehadiran, keterlambatan, izin/cuti, dan hari
 * tanpa presensi. Halaman riwayat memanggilnya dengan rentang hasil
 * rentangDariPeriode() yang sama untuk daftar, sehingga angka di header dan isi
 * daftar tidak mungkin berbeda.
 */
export function rekapRentang({ riwayat, izinTanggal, dari, sampai, totalHariKerja = 22 }) {
  const baris = (riwayat || []).filter((r) => dalamRentang(r.date, dari, sampai))
  const hadir = baris.filter((r) => r.masuk)
  const terlambat = hadir.filter((r) => (r.lateMinutes || 0) > 0)
  let izin = 0
  let cuti = 0
  izinTanggal?.forEach((value, iso) => {
    if (!dalamRentang(iso, dari, sampai)) return
    if (labelIzin(value.jenis) === 'Cuti') cuti += 1
    else izin += 1
  })
  const hariKerja = hadir.length + izin + cuti
  return {
    dari,
    sampai,
    hadir: hadir.length,
    tepatWaktu: hadir.length - terlambat.length,
    terlambat: terlambat.length,
    izin,
    cuti,
    hariKerja,
    persen: totalHariKerja ? Math.round((hariKerja / totalHariKerja) * 100) : 0,
    totalHariKerja,
  }
}

/** ISO ("YYYY-MM-DD") berada di dalam rentang inklusif. String dibandingkan apa adanya. */
function dalamRentang(iso, dari, sampai) {
  const nilai = String(iso || '').slice(0, 10)
  if (!nilai || !dari || !sampai) return false
  return nilai >= dari && nilai <= sampai
}

export const MODE_BULANAN = 'bulanan'
export const MODE_RENTANG = 'rentang'

/**
 * Ubah pilihan periode menjadi rentang tanggal konkret. Dipakai bersama oleh
 * filter daftar dan rekap header, sehingga jumlah hari, angka rekap, dan isi
 * daftar dijamin berasal dari rentang yang sama — tanpa ini, mode bulanan bisa
 * diam-diam memakai sisa rentang tanggal dari pemakaian sebelumnya.
 *
 *   bulanan key "2026-10"        -> 2026-10-01 s.d. 2026-10-31
 *   rentang 01/10 s.d. 15/10/2026 -> 2026-10-01 s.d. 2026-10-15
 */
export function rentangDariPeriode(periode) {
  const { mode, key, dari, sampai } = periode || {}
  if (mode === MODE_RENTANG) return { dari: dari || '', sampai: sampai || '' }
  if (!key) return { dari: '', sampai: '' }
  return { dari: `${key}-01`, sampai: `${key}-31` }
}

/**
 * Daftar hari riwayat untuk satu periode, terbaru lebih dulu.
 *
 * mode 'bulanan'  -> `periode.key` = "2026-10" (seluruh Oktober 2026)
 * mode 'rentang'  -> `periode.dari` / `periode.sampai` = "2026-10-01" / "2026-10-15"
 *
 * Sumber datanya sudah dibatasi ke pegawai yang login di halaman, jadi fungsi
 * ini tidak pernah menyentuh presensi orang lain. Hari izin/cuti yang tidak
 * punya baris presensi tetap ikut ditampilkan.
 */
export function filterRiwayatPeriode({ riwayat, izinTanggal, periode }) {
  const { dari, sampai } = rentangDariPeriode(periode)
  if (!dari || !sampai || dari > sampai) return []

  const byTanggal = new Map()
  for (const r of riwayat || []) {
    const iso = String(r.date || '').slice(0, 10)
    if (!dalamRentang(iso, dari, sampai)) continue
    // Satu hari satu baris: kalau riwayat berisi lebih dari satu, yang terakhir
    // (paling baru) yang dipakai.
    byTanggal.set(iso, { ...r, date: iso })
  }

  if (izinTanggal) {
    for (const [iso, value] of izinTanggal) {
      const hari = String(iso).slice(0, 10)
      if (!dalamRentang(hari, dari, sampai) || byTanggal.has(hari)) continue
      byTanggal.set(hari, { date: hari, masuk: null, pulang: null, lateMinutes: 0, izin: value })
    }
  }

  return [...byTanggal.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** Label periode untuk judul dan empty state, mis. "Oktober 2026" atau "01 Oktober 2026 - 15 Oktober 2026". */
export function labelPeriode({ mode, key, dari, sampai }) {
  if (mode === MODE_RENTANG) {
    if (!dari || !sampai) return 'Rentang tanggal'
    const awal = tanggalLengkapISO(dari).split(', ')[1]
    const akhir = tanggalLengkapISO(sampai).split(', ')[1]
    return `${awal} - ${akhir}`
  }
  if (!key) return 'Pilih bulan'
  return `${namaBulanDariKey(key)} ${String(key).slice(0, 4)}`
}

