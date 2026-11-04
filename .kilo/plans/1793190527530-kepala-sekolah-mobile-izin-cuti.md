# Plan: Role Kepala Sekolah (mobile) dengan persetujuan izin/cuti per unit

## Goal

Tambahkan role "Kepala Sekolah" yang tetap memakai tampilan mobile (seperti Guru/Pegawai), namun memiliki fitur tambahan persetujuan (approve/reject) pengajuan izin/cuti khusus untuk unit penugasannya. Admin dapat membuat akun Kepala Sekolah per unit melalui Manajemen Admin & User.

## Scope

- Tambah role `Kepala Sekolah` ke RBAC dan normalisasi.
- Mode mobile + home path `/mobile/home`.
- Matriks permission mobile (izin/cuti view + edit/approve).
- Sync staff otomatis saat akun Kepala Sekolah dibuat (seperti Guru).
- Halaman mobile baru untuk persetujuan izin/cuti per unit.
- Route + navigasi kondisional (hanya kepala sekolah).
- Filter data berdasarkan unit akun (sudah ada via selectScopedLeaves).

## Tasks

1. **Store RBAC** (`src/store/simPresStore.jsx`)
   - Tambah `ROLE_KEPALA_SEKOLAH = 'Kepala Sekolah'`.
   - Tambah alias di `normalisasiRole` ('kepala sekolah', 'kepala unit').
   - `ROLE_APP_MODE[ROLE_KEPALA_SEKOLAH] = MODE_MOBILE`.
   - `ROLE_HOME_PATH[ROLE_KEPALA_SEKOLAH] = '/mobile/home'`.
   - Tambah ke array `MODE_MOBILE` roles.
   - `syncStaffFromAdminUser`: perlakukan Kepala Sekolah seperti Guru (buat baris staff).
   - `PERMISSION_MATRIX`: tambah entry 'Kepala Sekolah' dengan permission mobile + `pengajuanIzinCuti: ['view','edit']`.

2. **AdminUserPage** (`src/pages/AdminUserPage.jsx`)
   - Tambah opsi role 'Kepala Sekolah' di dropdown.
   - Validasi unitId wajib untuk role ini (seperti Admin Unit).

3. **Halaman mobile persetujuan** (baru: `src/pages/mobile/MobilePersetujuanIzinPage.jsx`)
   - Gunakan `selectScopedLeaves(state)` + filter status 'Menunggu'.
   - Tampilkan daftar pengajuan dengan tombol Setujui/Tolak.
   - Dispatch `UPDATE_LEAVE_STATUS` dengan id + status.
   - Tambah activity log.

4. **Routing** (`src/App.jsx`)
   - Import halaman baru.
   - Tambah route `/mobile/persetujuan-izin` di dalam MobileLayout.

5. **Navigasi mobile** (`src/components/mobile/MobileLayout.jsx`)
   - Buat `NAV_ITEMS` kondisional: jika role === Kepala Sekolah, tambah item "Persetujuan" (icon `task_alt`) menuju `/mobile/persetujuan-izin`.
   - Pertahankan 5 item dasar; tambah item ke-6 hanya untuk kepala sekolah.

6. **Validasi**
   - Build, test-presensi-integrasi, test-edit-profil.
   - Verifikasi akun kepala sekolah (unit SD) hanya melihat pengajuan unit SD.

## Risks

- MobileLayout NAV_ITEMS statis; perlu conditional rendering berdasarkan role.
- syncStaffFromAdminUser harus membuat staff agar selectSelfStaff bekerja.
- Permission matrix entry diperlukan agar roleDikenal dan login berhasil (line 1667 checks permissionMatrix).

## Out of scope

- Notifikasi push ke kepala sekolah (bisa ditambahkan nanti).
- Desktop view untuk kepala sekolah (tetap mobile).
