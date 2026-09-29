// Aturan isi menu titik tiga pada kartu pengguna sidebar.
//
// Dipisah dari komponen supaya daftar item + aturan role-nya bisa diuji
// langsung tanpa merender, dan tetap jadi satu sumber kebenaran: Sidebar hanya
// merender hasil fungsi ini.
//
// Perataan menu per role:
//   - Superadmin : Aktivitas Saya, Keluar.
//                  "Profil Saya" (beserta ikon profilnya) dan "Ganti Password"
//                  disembunyikan. Akun pusat overseen seluruh unit, bukan data
//                  pegawai, jadi tidak punya halaman profil; dan kata sandinya
//                  dikelola lewat prosedur operasional, bukan menu pengguna.
//   - Role lain  : Profil Saya, Ganti Password, Keluar.
export const USER_MENU_CATALOG = [
  {
    key: 'profile',
    label: 'Profil Saya',
    icon: 'account_circle',
    // Dilewati untuk Superadmin: bawa ikon profilnya sekaligus.
    skipForSuperadmin: true,
  },
  {
    key: 'activity',
    label: 'Aktivitas Saya',
    icon: 'history',
    onlySuperadmin: true,
  },
  {
    key: 'password',
    label: 'Ganti Password',
    icon: 'password',
    // Dicek dari auth store (selectCanChangeOwnPassword), bukan dari nama role,
    // supaya role baru ikut aturan yang sama tanpa perlu diedit di sini.
    needsPasswordRight: true,
  },
  {
    key: 'logout',
    label: 'Keluar',
    icon: 'logout',
    // Aksi destruktif: dipisah divider dari item di atasnya selama masih ada
    // item sebelumnya (lihat Sidebar).
    destructive: true,
  },
]

export function buildUserMenuItems({ isSuperadmin = false, canChangePassword = false } = {}) {
  return USER_MENU_CATALOG.filter((item) => {
    if (item.onlySuperadmin) return isSuperadmin
    if (item.skipForSuperadmin) return !isSuperadmin
    if (item.needsPasswordRight) return canChangePassword
    return true
  })
}
