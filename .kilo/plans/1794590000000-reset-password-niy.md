# Plan: Fitur reset kata sandi ke default NIY — hanya Superadmin yang boleh reset

## Tujuan
- Semua user (mobile: Guru & Kepala Sekolah; desktop: Superadmin, Admin Unit, Petugas Presensi) dapat **direset** kata sandinya oleh Superadmin.
- Setelah reset, password kembali ke default = **NIY milik user target**.
- User yang login dengan password default (NIY) dapat mengganti dengan password apa pun melalui menu "Ubah password"/"Ganti Password".
- Hanya **Superadmin** yang boleh memicu aksi reset (tombol reset disembunyikan/digagalkan untuk Admin Unit, Petugas Presensi, Guru, Kepala Sekolah).

## Kode saat ini (baseline)
- Autentikasi lokal di `src/store/simPresStore.jsx`; password di `state.userAccounts` (staff/mobile) dan `state.adminUsers` (portal).
- Default password saat ini `DEFAULT_STAFF_PASSWORD = 'Attin123!'` (`src/data/seed.js:44`), bukan NIY.
- Reducer `RESET_STAFF_PASSWORD` ada (`simPresStore.jsx:1197`) tapi default-nya `initialStaffPassword()` = 'Attin123!'.
- `AdminUserPage.openResetPassword` (`src/pages/AdminUserPage.jsx:244`) pakai `generatePassword()` (acak).
- `ResetStaffPasswordModal` default = 'Attin123!' (`src/components/ResetStaffPasswordModal.jsx:21`).
- `EditEmployeeModal` tombol "Reset ke Attin123!" (`src/components/EditEmployeeModal.jsx:200`).
- `StaffTable` (`src/components/StaffTable.jsx`) menampilkan tombol reset pada setiap baris tanpa pengecekan role — dipakai di `DataGuruPegawaiPage` yang juga dibuka Admin Unit, sehingga Admin Unit saat ini masih bisa reset lewat sini.
- Alur ganti-password sendiri sudah ada: `ChangePasswordGate`, `validatePasswordChange`, reducer `CHANGE_PASSWORD`, dipicu via `MobileProfilPage` "Ubah password" dan `Sidebar`/`DashboardNav` "Ganti Password". `ProtectedRoute` memaksa ganti saat `mustChangePassword`.

## Keputusan desain
1. **Default password = NIY** (`account.niy`). Setiap fallback ke `initialStaffPassword()`/`DEFAULT_STAFF_PASSWORD` diganti ke NIY milik akun.
2. **Reset hanya oleh Superadmin**.
   - UI: tombol reset di `StaffTable` disembunyikan bila `selectCurrentUserRole(state) !== ROLE_SUPERADMIN`.
   - UI: `AdminUserPage` (Manajemen Admin & User) sudah Superadmin-only lewat permission matrix; tetap ditambahkan guard reducer agar aksi reset via adminUsers juga dihormati.
   - Aksi `RESET_STAFF_PASSWORD` di reducer tetap bisa dipanggil, tetapi panggilan UI dibatasi Superadmin.
3. **Reset → password = NIY target**, `mustChangePassword` menurut role (portal wajib ganti saat login berikutnya; mobile opsional lewat menu "Ubah password").
4. **Ganti setelah login dengan default** sudah tercover alur existing (`ChangePasswordGate` + `validatePasswordChange` + `CHANGE_PASSWORD`); tidak perlu UI baru. Password lama yang divalidasi = NIY setelah perubahan poin 1.
5. "Lupa kata sandi?" di `LoginPage` tetap informatif (arahkan ke Superadmin/TU); reset dipicu Superadmin lewat Manajemen Admin & User dan Data Guru.

## Catatan teknis risiko
- Guru/Kepala Sekolah bisa punya baris di `userAccounts` **dan** `adminUsers`. `findAccountByIdentifier` memeriksa `userAccounts` dulu, jadi password efektif adalah di `userAccounts`. Reducer `UPDATE_ADMIN_USER` sudah mensinkronkan password ke `userAccounts` saat NIY cocok (`shouldSyncUserAccount`), sehingga reset via `AdminUserPage` ke NIY berlaku untuk login mobile.
- Superadmin tidak bisa mengganti password sendiri lewat menu (`selectCanChangeOwnPassword` mengecualikan Superadmin), tetapi dapat di-reset lewat tabel admin — status quo dipertahankan.
- `StaffTable` dipakai di halaman yang diakses Admin Unit; tombol reset harus diganti dengan cek role di komponen, bukan hanya di permission matrix halaman.

## Tugas implementasi (terurut)
1. `src/store/simPresStore.jsx`: ubah semua fallback default password menjadi `account.niy` / `staff.niy`:
   - `buildUserAccount` (~255): `password || credentials?.password || staff.niy`
   - `upsertUserAccount` (~292): `lama?.password || staff.niy`
   - reducer `RESET_STAFF_PASSWORD` (~1202): `targetStaff.niy`
   - `buildStaffAccount` (~1614): `userAccount?.password || staff.niy`
   - `authenticateCredentials` (~1711): `account.password || account.niy || INITIAL_ACCOUNT_PASSWORD`
   - `validatePasswordChange` (~1750): `account.password || account.niy || INITIAL_ACCOUNT_PASSWORD`
   - `selectDemoLoginAccounts` (~3421, ~3435): `u.password || u.niy || INITIAL_ACCOUNT_PASSWORD` dan `staffAccount.password || staffAccount.niy`
2. `src/data/seed.js` + `src/store/simPresStore.jsx`: hentikan penggunaan `DEFAULT_STAFF_PASSWORD` / `initialStaffPassword()` sebagai default; buang impor & konstanta yang tidak terpakai.
3. `src/pages/AdminUserPage.jsx`: `openResetPassword` set `password: row.niy` dan tampilkan NIY di pesan sukses (ganti `generatePassword()`).
4. `src/components/ResetStaffPasswordModal.jsx`: opsi "Sandi Standar" default = `staff.niy`; teks & salin kredensial tampilkan NIY.
5. `src/components/EditEmployeeModal.jsx`: tombol "Reset ke Attin123!" → "Reset ke NIY" dengan nilai `staff.niy`.
6. `src/components/StaffTable.jsx`: sembunyikan tombol reset bila `selectCurrentUserRole(state) !== ROLE_SUPERADMIN` (impor `selectCurrentUserRole`, `ROLE_SUPERADMIN`).
7. `scripts/test-teacher-auth.mjs`: pakai NIY sebagai password default; verifikasi reset ke NIY oleh Superadmin, sandi lama ditolak setelah reset; Admin Unit/Petugas tidak bisa reset (jika ada uji UI).
8. Validasi: `node scripts/test-teacher-auth.mjs` (100% lulus) dan `npx oxlint src` (tanpa error baru).

## Validasi sukses
- Setiap staff/login dapat masuk dengan `NIY` sebagai kata sandi (default).
- Superadmin bisa reset password user apa pun (termasuk Superadmin lain) → password jadi NIY target.
- Admin Unit, Petugas Presensi, Guru, Kepala Sekolah **tidak** melihat/menombol aksi reset di UI.
- Setelah reset, login dengan NIY berhasil; sandi lama ditolak.
- User dapat mengganti NIY menjadi password bebas via "Ubah password" / "Ganti Password".

## Pertanyaan terbuka
Tidak ada. Siap untuk diimplementasi.
