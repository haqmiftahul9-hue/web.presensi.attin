// ============================================================================
// SAPAAN PEGAWAI — FUNGSI TERPUSAT
//
// Dua hal yang tidak boleh terjadi di SimPres:
//   1. Kata sapaan ditulis manual di tiap halaman ("Bapak", "Ibu", "Umi"…).
//      Kalau nanti aturan berubah, semua halaman harus ikut berubah.
//   2. Sapaan mengarang jenis kelamin. Ini aplikasi sekolah Islam, dan
//      "Ustadz"/"Ustadzah" yang salah adalah kesalahan yang.VISIBLE di layar.
//
// Karena itu satu-satunya sumber sapaan adalah `getEmployeeGreeting()`. Halaman
// mobile, profil, kartu ID, dan notifikasi semuanya memanggil fungsi ini, dan
// fungsi ini hanya membaca dua kolom yang sudah ada di data pegawai:
//
//   gender pegawai -> Ustadz / Ustadzah   (selain unit TK)
//   unit TK        -> Umi                  (mengabaikan gender)
//
// Bila gender belum terisi, TIDAK ditebak: nama ditampilkan tanpa sapaan.
// Laporan resmi juga memakai nama resmi (`getEmployeeFormalName()`), bukan
// sapaan, karena nama dagang tidak boleh menggantikan nama dalam dokumen.
// ============================================================================

// Kata sapaan. Satu-satunya tempat kata-kata ini didefinisikan.
export const SAPAAN_TK = 'Umi'
export const SAPAAN_LAKI = 'Ustadz'
export const SAPAAN_PEREMPUAN = 'Ustadzah'

/**
* Unit TKIT adalah satu-satunya unit yang memakai "Umi" untuk semua pegawai,
 * apa pun gendernya — di lingkungan PAUD itu memang lazim. Id unit inilah
 * satu-satunya penandanya di seluruh data; `TKIT`, `TK-2`, dan id serupa
 * ikut dikenali.
 */
export function isTKUnit(staff, unit) {
  const id = String(staff?.unitId ?? unit?.id ?? '').trim().toLowerCase()
  if (id) return id === 'tk' || id.startsWith('tk-') || id.startsWith('tkit')
  // Cadangan: kalau id tidak ada, lihat penanda pada kode/nama unit.
  const sumber = `${unit?.kode || ''} ${unit?.nama || ''}`.toUpperCase()
  return /(^|[^A-Z])TK(IT)?([^A-Z]|$)/.test(sumber)
}

/**
 * Normalisasi jenis kelamin ke 'L' / 'P'. Data impor bisa membawa "L",
 * "Lk", "Pria", "Wanita", dsb. Nilai yang tidak dikenali menghasilkan string
 * kosong — pemanggil lalu menampilkan nama tanpa sapaan, bukan menebak.
 */
export function normalisasiGender(nilai) {
  const v = String(nilai ?? '').trim().toLowerCase()
  if (!v) return ''
  if (['laki-laki', 'laki', 'l', 'lk', 'pria', 'male', 'm'].includes(v)) return 'L'
  if (['perempuan', 'wanita', 'p', 'pr', 'female', 'f'].includes(v)) return 'P'
  return ''
}

/** "Hendra Kurniawan, S.Pd.I" -> "Hendra Kurniawan" (gelar dibuang). */
export function namaTanpaGelar(nama) {
  return String(nama || '').split(',')[0].trim()
}

/**
 * Kata sapaan saja, tanpa nama: 'Umi' / 'Ustadz' / 'Ustadzah' / ''.
 * Gender kosong -> '' (sapaan dilewati, bukan ditebak).
 */
export function getEmployeeSalutation(staff, unit) {
  if (isTKUnit(staff, unit)) return SAPAAN_TK
  const gender = normalisasiGender(
    staff?.jenisKelamin ?? staff?.gender ?? staff?.jk ?? staff?.jenis_kelamin,
  )
  if (gender === 'L') return SAPAAN_LAKI
  if (gender === 'P') return SAPAAN_PEREMPUAN
  return ''
}

/**
 * Sapaan lengkap untuk ditampilkan ke pengguna.
 *
 *   Ahmad Fauzi  (Laki-laki, SMP)  -> "Ustadz Ahmad Fauzi"
 *   Siti Rahma   (Perempuan, SD)   -> "Ustadzah Siti Rahma"
 *   Aisyah       (unit TKIT)       -> "Umi Aisyah"
 *
 * `unit` opsional; kalau tidak diberikan, unit dibaca dari `staff.unitId`.
 * `useTitle` menampilkan gelar juga ("Umi Aisyah, S.Pd") untuk tempat yang
 * memang butuh nama lengkap, seperti daftar hadir.
 */
export function getEmployeeGreeting(staff, { unit, useTitle = false } = {}) {
  const nama = useTitle
    ? String(staff?.name || '').trim()
    : namaTanpaGelar(staff?.name)
  return [getEmployeeSalutation(staff, unit), nama].filter(Boolean).join(' ')
}

/**
 * Nama resmi untuk dokumen (laporan PDF, slip, rekap). Nama dagang dipakai
 * untuk Beranda, Profil, dan kartu ID; nama resmi tetap dipakai untuk laporan
 * resmi karena nama dagang tidak boleh menggantikan nama dalam dokumen.
 */
export function getEmployeeFormalName(staff) {
  return String(staff?.name || '').trim() || 'Pengguna'
}

/**
 * Varian untuk kalimat notifikasi: "Ustadz Ahmad Fauzi" di dalam kalimat sudah
 * enak dibaca, jadi tidak perlu kapital ulang atau awalan apa pun.
 */
export function employeeGreetingInSentence(staff, options) {
  return getEmployeeGreeting(staff, options)
}