# Rencana: Perubahan Role Tidak Terrefleksi di Menu Mobile (Guru → Kepala Sekolah/Admin)

## Konteks & asumsi
- App utama: root `src/` (Vite + React). Folder `simpres_*` di luar cakupan (tidak diubah).
- Auth/store tunggal: `src/store/simPresStore.jsx`.
- Pembagian mode sudah disetujui (plan `1794599000000-manajemen-admin-role.md`):
  - `Admin Unit` = desktop-only (`ROLE_APP_MODE` = `MODE_DESKTOP`), tidak dibuka di mobile.
  - `Guru` dan `Kepala Sekolah` = mobile (`MODE_MOBILE`); `Kepala Sekolah` tambah menu Persetujuan.
- Data Guru/Pegawai (`StaffTable.handleChangeRole`, `StaffTable.jsx:126-137`) → `UPDATE_STAFF {id, role}` → reducer sinkronkan `userAccounts` role + persist `PERSISTED_USER_ACCOUNTS_KEY` + log aktivitas (sudah terimplementasi, `simPresStore.jsx:773-790`).
- Sidebar desktop sudah berbasis `hasMenuPermission` (`Sidebar.jsx:284`); bottom nav mobile BELUM.

## Akar penyebab
1. **Sesi mobile yang sudah buka tidak difresh setelah role diubah di tab lain.** `currentUser` hanya ditetapkan saat login/init (`initWithStoredSession` / `LOGIN_SUCCESS`). Listener `storage` di `SimPresProvider` (`simPresStore.jsx:1967-1991`) sinkronkan `units`/`staff`/`leaves`/`settings` tapi **belum** `userAccounts`, dan tidak merest `currentUser`. Akibat: tab mobile yang sudah buka tetap `currentUser.role = 'Guru'` meski `userAccounts` di localStorage sudah berubah → menu mobile tidak berubah sebelum relogin.
2. **Bottom nav mobile hardcoded, tidak berbasis permission.** `MobileLayout.buildNavItems()` (`MobileLayout.jsx:24-30`) menampilkan 5 base item untuk semua role mobile dan menambah "Persetujuan" hanya kalau `role === ROLE_KEPALA_SEKOLAH`. Tidak konsultasi `PERMISSION_MATRIX`/`hasMenuPermission`, jadi menu tidak responsif terhadap perubahan role dan tidak konsisten dengan desktop.

## Keputusan (dibawa dari rencana approved)
- `Admin Unit` tetap desktop-only; tidak diubah agar bisa diakses mobile. Role mobile yang fiturnya tambah = `Kepala Sekolah`. Jika user ingin fitur admin di mobile, gunakan role `Kepala Sekolah`.
- Bottom nav mobile dibangun berdasarkan permission (`hasMenuPermission`) agar selalu sinkron dengan role aktif, konsisten dengan sidebar desktop.

## Tugas perbaikan (root `src/`)

### T1 — Refresh `currentUser` saat `userAccounts` berubah lintas tab (`src/store/simPresStore.jsx`)
- Tambah `case 'SYNC_STORAGE_USER_ACCOUNTS'` di reducer: mengganti `state.userAccounts`, dan bila `currentUser` aktif, re-derive `currentUser` lewat `findAccountByIdentifier(state, accountLoginKey(currentUser))`; jika `role`/`unitId`/`status` berubah, perbarui `currentUser` dan `selectedUnitId = initialUnitScope(fresh)`.
- Tambah cabis `e.key === PERSISTED_USER_ACCOUNTS_KEY` di listener `storage` di `SimPresProvider` → dispatch `SYNC_STORAGE_USER_ACCOUNTS`.
- Efek: role yang diubah superadmin di desktop terlihat segera di tab mobile yang sudah buka (tanpa relogin). Sama halnya jika role diubah lewat `UPDATE_ADMIN_USER` (Manajemen Admin) karena itu juga menulis `PERSISTED_USER_ACCOUNTS_KEY`.

### T2 — Bottom nav mobile berbasis permission (`src/components/mobile/MobileLayout.jsx`)
- Ganti `buildNavItems(role)` hardcoded dengan builder:
  - Daftar rute mobile berurutan dengan label/icon (home, presensi = tengah, riwayat, slip, izin-cuti, persetujuan-izin, kartu-id, qr, profil), kunci menu dari `ROUTE_MENU_KEYS[to]`.
  - Tiap item ditampilkan bila `hasMenuPermission(state, role, menuKey, 'view')`.
  - "Persetujuan" ditampilkan bila `hasMenuPermission(state, role, 'pengajuanIzinCuti', 'edit')` (Kepala Sekolah = true, Guru = false sesuai matrix saat ini).
- Efek: menu selalu mencerminkan permission role aktif; tidak lagi depend pada nama role secara hardcoded.

### T3 — Tes (baru)
- Tambah skenario di `scripts/test-admin-features.mjs`:
  - `UPDATE_STAFF` dengan perubahan role → `userAccounts[pegawaiId].role` ikut berubah (normalisasi).
  - `hasPermission(state, 'Kepala Sekolah', 'pengajuanIzinCuti', 'edit')` = true; `hasPermission(state, 'Guru', 'pengajuanIzinCuti', 'edit')` = false.
  - `appModeOfRole('Admin Unit') = MODE_DESKTOP`; `appModeOfRole('Kepala Sekolah') = MODE_MOBILE`.
  - `findAccountByIdentifier` mengembalikan role baru setelah `userAccounts` diupdate (simulasi refresh sesi).

### T4 — Build & validasi
- `npm run build` (Vite) lolos tanpa error.
- Rangkaian `scripts/test-*.mjs` lolos.
- Manual QA: Superadmin ubah role pegawai → `Kepala Sekolah` di Data Guru/Pegawai → buka akun itu di mobile (atau simulasi sync storage lintas tab) → menu "Persetujuan" muncul tanpa relogin; ubah kembali ke `Guru` → "Persetujuan" hilang. Login `Admin Unit` di mobile dialihkan ke dashboard desktop (per arsitektur).

## Kriteria validasi (Definition of Done)
1. Role berubah di Data Guru/Pegawai → `userAccounts[pegawaiId].role` terupdate & tersimpan `localStorage` (`simpres.userAccounts`).
2. Tab mobile yang sudah buka menampilkan role baru (menu Kepala Sekolah: "Persetujuan" muncul) tanpa relogin, setelah data disinkron lintas tab.
3. `npm run build` lolos tanpa error.
4. Tes role/permission di `scripts/test-*.mjs` lolos, tidak ada regresi login semua role.

## Risiko & mitigasi
- Listener storage bisa memicu re-render berulang di banyak tab. Mitigasi: reducer hanya merubah state bila isi `userAccounts` benar-benar berubah; refresh `currentUser` hanya bila `role`/`unitId`/`status` sebenarnya berbeda.
- `findAccountByIdentifier` dipakai ulang untuk refresh `currentUser`; regression login role lain (Guru/Superadmin/Admin Unit) harus di-uji (sudah ada cakupan di `test-admin-features.mjs`).
- Admin Unit dibuka di mobile tetap dialihkan ke desktop dashboard — bukan bug, dokumentasikan kepada user.
