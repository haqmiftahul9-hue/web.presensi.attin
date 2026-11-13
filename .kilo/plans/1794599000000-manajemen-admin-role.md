# Rencana: Manajemen Admin (Role Berbasis Staff)

**Target:** aplikasi utama di `src/` (Vite + React). Folder `simpres_*` di luar cakupan (tidak diubah).

## Keputusan (disetujui)
- Tidak ada form "Tambah Admin/User" terpisah di halaman Manajemen Admin.
- Admin didapat dengan mengubah `staff.role` → `Admin` pada tabel Data Guru/Pegawai. Akun tetap milik pegawai itu, tapi tambah halaman admin.
- Kode role `Admin` reuse `ROLE_ADMIN_UNIT` (`Admin Unit`) → otomatis dapat akses desktop + semua fitur admin (RBAC & route guard sudah ada).
- Path `/manajemen-admin-user` dipertahankan, hanya label berubah → "Manajemen Admin".
- Dropdown role: Guru / Pegawai, Admin, Kepala Sekolah, Lainnya. Jabatan detail (Guru PAI, dst.) tidak dijaga.

## File yang diubah (root `src/`)
1. `src/components/Sidebar.jsx:17` — label `Manajemen Admin & User` → `Manajemen Admin`.
2. `src/components-dashboard/Sidebar.jsx:4` — label `Manajemen Admin & User` → `Manajemen Admin`.
3. `src/components-dashboard/DashboardNav.jsx:24` — label `Manajemen Admin & User` → `Manajemen Admin`.
4. `src/components/StaffTable.jsx`:
   - Header `Jabatan / Penugasan` → `Role`.
   - Cell role jadi `<select>` (4 opsi), onChange → `UPDATE_STAFF {id, role}` + toast + activity log.
5. `src/store/simPresStore.jsx`:
   - Reducer `UPDATE_STAFF`: saat `role` berubah, sinkronkan ke `userAccounts` (pegawaiId) dengan `normalisasiRole(role)`, simpan `PERSISTED_USER_ACCOUNTS_KEY`, catat log aktivitas perubahan role.
6. `src/pages/AdminUserPage.jsx`:
   - Breadcrumb + `<h1>` → "Manajemen Admin".
   - Hapus form tambah/edit `adminUsers` (tombol Tambah, validasi, rendering form).
   - Tabel di-build dari `state.staff` (scope unit via `selectActiveUnitId`/`selectScopedStaff`) filter role admin-level (`Admin`, `Kepala Sekolah`, `Petugas Presensi`).
   - Setiap baris: tombol `Batalkan Admin` (konfirmasi → role kembali `Guru`), toggle Status, Detail, Edit data pegawai.
   - KPI cards, filter, export disesuaikan ke data staff.

## Alur data
Klik dropdown Role pada tabel StaffTable → `UPDATE_STAFF {role:'Admin'}` → reducer tulis `staff[i].role` + `userAccounts[pegawaiId].role` → `ROLE_APP_MODE[Admin Unit]=desktop` → guard rute membuka path admin.  
Batalkan Admin → role kembali `Guru` → `userAccounts.role` kembali `Guru` → mode mobile, akses admin dicabut.

## Validasi (Definition of Done)
- `npm run build` (Vite) di root berhasil.
- Manual QA: Superadmin buka Data Guru/Pegawai → klik Role pada pegawai → pilih Admin → muncul di Manajemen Admin; klik Batalkan Admin → hilang dari daftar, role kembali Guru/Pegawai; pilih Kepala Sekolah → fitur Kepala Sekolah aktif; coba cabut admin pada diri sendiri → ditolak.

## Risiko & mitigasi
- Superadmin mencabut diri sendiri / sisa superadmin nol: validasi handler Batalkan Admin blokir `id === currentUser.id`.
- Baris `adminUsers` lama tetap ada tapi tidak dipakai UI baru; `findAccountByIdentifier` memeriksa `userAccounts` dulu (sudah benar di kode saat ini).

Rencana siap diimplementasikan.
