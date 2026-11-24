// ============================================================================
// SAPAAN PEGAWAI — FUNGSI TERPUSAT
//
// Dua hal yang tidak boleh terjadi di SIMPEG:
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

// Bentuk salam pada baris pembuka Beranda ("Assalamu'alaikum ...").
export const SAPAAN_SALAM = "Assalamu'alaikum"

// Di baris salam, sapaan unit TK ditulis "Ummi". Bentuk ini hanya untuk
// kalimat pembuka; nama resmi di dokumen tetap memakai sapaan baku.
export const SAPAAN_TK_SALAM = 'Ummi'

/**
 * Baris pembuka Beranda: salam + kata sapaan, mis. "Assalamu'alaikum Ustadz".
 *
 * Bila gender/unit tidak memberi sapaan, hanya salam yang ditampilkan — nama
 * tetap tampil tanpa sapaan, tidak pernah ditebak.
 */
export function getSalamGreeting(staff, { unit } = {}) {
  const sapaan = getEmployeeSalutation(staff, unit)
  const kata = sapaan === SAPAAN_TK ? SAPAAN_TK_SALAM : sapaan
  return kata ? `${SAPAAN_SALAM} ${kata}` : SAPAAN_SALAM
}

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

/**
 * Singkatan kode/nama unit untuk penulisan jabatan: SDIT, SMPIT, SMAIT, TKIT.
 */
export function getUnitShortName(unit) {
  if (!unit) return ''
  const id = String(unit.id ?? '').trim().toLowerCase()
  if (id === 'sd' || id.startsWith('sd')) return 'SDIT'
  if (id === 'smp' || id.startsWith('smp')) return 'SMPIT'
  if (id === 'sma' || id.startsWith('sma')) return 'SMAIT'
  if (id === 'tk' || id.startsWith('tk')) return 'TKIT'
  const kode = String(unit.kode || '').trim().toUpperCase()
  if (kode.includes('SD')) return 'SDIT'
  if (kode.includes('SMP')) return 'SMPIT'
  if (kode.includes('SMA')) return 'SMAIT'
  if (kode.includes('TK')) return 'TKIT'
  const nama = String(unit.nama || '').trim()
  const match = nama.match(/\b(SDIT|SMPIT|SMAIT|TKIT|SD|SMP|SMA|TK)\b/i)
  if (match) return match[1].toUpperCase()
  return nama
}

/**
 * Format nama lengkap beserta gelar, menghindari duplikasi gelar bila sudah termuat di nama.
 */
export function formatNamaGelar(staff) {
  if (!staff) return ''
  const name = String(staff.name || '').trim()
  const gelar = String(staff.gelar || '').trim()
  if (!gelar) return name
  if (name.toLowerCase().includes(gelar.toLowerCase())) return name
  return `${name}, ${gelar}`
}

/**
 * Sapaan jabatan untuk peran Kepala Sekolah atau Admin Unit per unit sekolah.
 * Contoh: "Kepala Sekolah SDIT", "Admin SDIT", "Kepala Sekolah SMPIT".
 */
export function getLeaderRoleGreeting(role, unit) {
  const norm = String(role || '').toLowerCase()
  const unitShort = getUnitShortName(unit)
  if (norm.includes('kepala') || norm.includes('kepsek')) {
    return unitShort ? `Kepala Sekolah ${unitShort}` : 'Kepala Sekolah'
  }
  if (norm.includes('admin unit') || norm.includes('admin sekolah') || norm === 'admin' || norm === 'admin unit') {
    return unitShort ? `Admin ${unitShort}` : 'Admin Unit'
  }
  return ''
}

/**
 * Nama pejabat Kepala Sekolah / Admin Unit beserta gelar:
 * Mengambil nama akun/staf, atau fallback ke penandatangan per unit bila akun masih membawa placeholder nama.
 */
export function getLeaderDisplayName(staff, state, unit, role) {
  if (!staff) return ''
  const rawName = String(staff.name || '').trim()
  const unitId = String(staff.unitId ?? unit?.id ?? '').toLowerCase()
  const isPlaceholder = !rawName ||
    /^kepala\s+sekolah/i.test(rawName) ||
    /^admin\s+/i.test(rawName)

  if (isPlaceholder) {
    const configuredKepsek = state?.settings?.penandatangan?.kepalaSekolah?.[unitId]?.nama
    if (configuredKepsek && configuredKepsek.trim()) {
      return configuredKepsek.trim()
    }
    const norm = String(role || staff.role || '').toLowerCase()
    if (norm.includes('kepala') || norm.includes('kepsek')) {
      const defaultKepsek = {
        sd: 'Drs. H. Ahmad Fauzi, M.Pd',
        smp: 'Dra. Hj. Nurhasanah, M.Pd',
        sma: 'Dr. Hendri Saputra, M.Pd',
        tk: 'Hj. Irmawati Rahayu, S.Pd',
      }
      return defaultKepsek[unitId] || 'Drs. H. Ahmad Fauzi, M.Pd'
    }
    if (norm.includes('admin')) {
      const defaultAdmin = {
        sd: 'Fajar Pratama, S.Kom',
        smp: 'Reki Gusman, S.E.',
        sma: 'Ilham Hidayat, S.Kom',
        tk: 'Aisyah Putri, S.Pd',
      }
      return defaultAdmin[unitId] || 'Fajar Pratama, S.Kom'
    }
  }

  return formatNamaGelar(staff)
}
