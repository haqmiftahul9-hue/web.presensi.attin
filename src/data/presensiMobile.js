// ============================================================================
// MODUL MOBILE GURU/PEGAWAI — helper murni (tanpa React).
//
// Semua perhitungan yang dipakai halaman mobile (jarak geofence, keterlambatan,
// jendela presensi, langkah validasi, rekap bulanan) hidup di sini supaya bisa
// diuji tanpa merender dan tidak tersebar di dalam komponen.
// ============================================================================

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export { HARI_ID, HARI_PENDEK, BULAN_ID, BULAN_PENDEK }

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

/** Sapaan mengikuti jenis kelamin pada data pegawai, tanpa menebak. */
export function sapaan(staff) {
  const gender = String(staff?.jenisKelamin || '').toLowerCase()
  if (gender === 'laki-laki') return 'Bapak'
  if (gender === 'perempuan') return 'Bu'
  return ''
}

export function namaShift(jamMasuk) {
  const [jam] = String(jamMasuk || '07:00').split(':').map(Number)
  if (!Number.isFinite(jam)) return 'Shift Pagi'
  if (jam < 11) return 'Shift Pagi'
  if (jam < 15) return 'Shift Siang'
  return 'Shift Sore'
}

/** Menit keterlambatan dihitung dari batas toleransi unit, bukan jam masuk mentah. */
export function hitungKeterlambatan(menitSekarang, jamMasuk, toleransi) {
  const [jam, menit] = String(jamMasuk || '07:00').split(':').map(Number)
  const batas = jam * 60 + menit + (Number(toleransi) || 0)
  return Math.max(0, menitSekarang - batas)
}

/**
 * Jendela presensi sebuah hari: sebelum shift (terlalu awal), dalam shift,
 * atau sudah lewat jam pulang (terlalu akhir).
 */
export function cekJendelaPresensi(menitSekarang, rules) {
  const [jamMasuk] = String(rules?.jamMasuk || '07:00').split(':').map(Number)
  const [jamPulang] = String(rules?.jamPulang || '15:00').split(':').map(Number)
  const mulai = jamMasuk * 60 - 60
  const tutup = jamPulang * 60
  return {
    sebelumShift: menitSekarang < mulai,
    dalamJendela: menitSekarang >= mulai && menitSekarang <= tutup,
    lewatJamPulang: menitSekarang > tutup,
    mulai,
    tutup,
  }
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
      detail: waktu?.detail || 'Memeriksa jam masuk dan toleransi',
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
  const terlambat = hadir.filter((r) => (r.late || 0) > 0)
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
  const terlambat = (riwayat || []).filter((r) => String(r.date || '').startsWith(key) && (r.late || 0) > 0)
  if (!terlambat.length) return null
  const total = terlambat.reduce((sum, r) => sum + r.late, 0)
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

/** Daftar hari (ISO) yang tercakup satu pengajuan izin/cuti. */
export function hariDariPeriode(periode) {
  const rentang = parsePeriode(periode)
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
    hariDariPeriode(item.periode).forEach((iso) => {
      if (!peta.has(iso)) peta.set(iso, item)
    })
  })
  return peta
}

/** Label status sesuai jenis pengajuan: cuti untuk "Cuti ...", izin untuk sisanya. */
export function labelIzin(jenis) {
  return String(jenis || '').startsWith('Cuti') ? 'Cuti' : 'Izin'
}

/**
 * Status satu hari: izin/cuti yang disetujui menang atas ketiadaan baris presensi,
 * lalu presensi menentukan tepat waktu atau terlambat.
 */
export function statusHari({ masuk, late, izin } = {}) {
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
  if (late > 0) {
    return { label: `Terlambat ${late} mnt`, kelas: 'bg-amber-50 text-amber-800', ikon: 'schedule' }
  }
  return { label: 'Tepat Waktu', kelas: 'bg-emerald-50 text-emerald-700', ikon: 'check_circle' }
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
 * Rekap satu bulan: kehadiran, keterlambatan, izin/cuti, dan hari tanpa presensi.
 * `izinPerTanggal` dipakai agar angka izin/cuti sama persis dengan yang
 * ditampilkan di kartu daftar.
 */
export function rekapHarian({ riwayat, izinTanggal, key, totalHariKerja = 22 }) {
  const baris = (riwayat || []).filter((r) => String(r.date || '').startsWith(key))
  const hadir = baris.filter((r) => r.masuk)
  const terlambat = hadir.filter((r) => (r.late || 0) > 0)
  let izin = 0
  let cuti = 0
  izinTanggal?.forEach((value, iso) => {
    if (!String(iso).startsWith(key)) return
    if (labelIzin(value.jenis) === 'Cuti') cuti += 1
    else izin += 1
  })
  const hariKerja = hadir.length + izin + cuti
  return {
    key,
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
