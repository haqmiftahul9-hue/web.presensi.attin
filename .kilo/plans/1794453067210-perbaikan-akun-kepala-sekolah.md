# Plan: Perbaikan Penyimpanan & Login Akun Kepala Sekolah (Manajemen Admin & User)

## Konteks & asumsi
- App menggunakan store lokal `src/store/simPresStore.jsx` untuk auth/user, BUKAN Supabase Auth (tidak ada pemanggilan `supabase.auth` di frontend; `src/lib/supabaseClient.js` hanya null kecuali env diisi).
- Login: `performLogin` → `authenticateCredentials` → `findAccountByIdentifier` (prioritas: `userAccounts` → `adminUsers` → `staff`).
- Tabel `public.users` + trigger `handle_new_auth_user` di `supabase/schema.sql` tidak terhubung ke alur login frontend.
- Role 'Kepala Sekolah' di routing/permission SUDAH BENAR (ROLE_OPTIONS, PERMISSION_MATRIX, ROLE_APP_MODE = mobile, ROUTE_ROLES /mobile, ROLE_HOME_PATH, ROLE_HOME_CANDIDATES). Tidak perlu diubah.

## Akar penyebab (ditemukan via code review)

**1. NIY kosong → tidak ada akun login.**
- `syncStaffFromAdminUser` (`simPresStore.jsx:2122-2123`) mengembalikan `staff` tanpa perubahan kalau `!niy`.
- `upsertUserAccount` (`simPresStore.jsx:287`) mengembalikan `accounts` tanpa perubahan kalau `!staff?.niy`.
- Reducer `ADD_ADMIN_USER` (`simPresStore.jsx:1120-1134`) hanya menambah `userAccounts` bila `staffBaru` ditemukan (berdasarkan NIY). Form AdminUserPage NIY opsional (`:138-139`).
- Akibat: adminUsers ditambah (muncul di tabel), tapi tidak ada baris staff dan tidak ada user account → tidak bisa login (khususnya kalau login pakai NIY).

**2. NIY diisi tapi staff sudah ada di master data → user account tidak diperbarui.**
- `staffBaru` (`simPresStore.jsx:1121`) memerlukan `!state.staff.some((x) => x.niy === payload.niy)`. Jika NIY sudah ada (kepala sekolah sudah terdaftar sebagai guru/staf), `staffBaru = undefined` → `userAccounts` tidak disentuh, meski adminUsers berupa role 'Kepala Sekolah'. Login (kalau ada userAccount lama dari seed) tetap role 'Guru' + password default, bukan Kepala Sekolah.

**3. adminUsers & userAccounts tidak di-persist ke localStorage.**
- Tidak ada `writePersistedItem` untuk keduanya (hanya `staff`, `units`, `leaves`, `settings`, `attendanceHistory`). Akun yang ditambah manual hilang saat refresh/penutupan tab → "data tidak tersimpan".

**4. (Pemicu penunjang) Teks pembantu form** (`AdminUserPage.jsx:854-856`) menyebut hanya Admin Unit dan Guru/Pegawai yang butuh unit, padahal Kepala Sekolah juga (`:141` sudah menyertakannya di validasi).

## Keputusan (DISETUJUI)

**NIY WAJIB untuk role Guru dan Kepala Sekolah.** (User menyetujui rekomendasi.)
- Alasan: akun mobile (login, username, userAccount) selalu berpatokan pada NIY (`buildUserAccount` pakai `username: staff.niy`; `upsertUserAccount` butuh `staff.niy`; `buildUserAccounts` filter `s.niy`). NIY kosong selalu menghasilkan akun tanpa kredensial login canonic.
- Jika NIY tetap diizinkan kosong di masa depan, diperlukan identifier cadangan (email/username) di `upsertUserAccount` dan `syncStaffFromAdminUser`.

## Tugas perbaikan (siap diimplementasikan)

### T1 — Validasi form AdminUserPage (`src/pages/AdminUserPage.jsx`)
- NIY wajib untuk role `Guru` dan `Kepala Sekolah` (selain unit yang sudah wajib).
- Pesan error: "NIY wajib diisi untuk peran ini."
- Perbaiki teks pembantu baris `:854-856` agar menyebut Admin Unit, Guru/Pegawai, dan Kepala Sekolah.

### T2 — Reducer `ADD_ADMIN_USER` (`src/store/simPresStore.jsx:1114-1136`)
- Setelah `syncStaffFromAdminUser`, cari staff berdasarkan NIY (baik baru maupun yang sudah ada), bukan hanya `staffBaru` brand-new.
- Buat/perbarui `userAccounts` untuk role `Guru` dan `Kepala Sekolah` setiap kali ada staff dengan NIY, terlepas dari status baru/lama staff.
- Pastikan `userAccount.role = 'Kepala Sekolah'` saat role adalah Kepala Sekolah.

### T3 — Reducer `UPDATE_ADMIN_USER` (`src/store/simPresStore.jsx:1137-1165`)
- Verifikasi perubahan role ke/from `Kepala Sekolah` pada NIY yang sama memperbarui `userAccount` (role + password). Kondisi `shouldSyncUserAccount` baris `:1143` sudah mencakup `ROLE_KEPALA_SEKOLAH`; konfirmasi dan uji.

### T4 — Persistensi adminUsers & userAccounts (`src/store/simPresStore.jsx`)
- Tambahkan kunci `PERSISTED_ADMIN_USERS_KEY = 'simpres.adminUsers'` dan `PERSISTED_USER_ACCOUNTS_KEY = 'simpres.userAccounts'`.
- Baca kedua kunci pada inisialisasi state (`initialState` / `initWithStoredSession`); gabungkan `buildUserAccounts(initialStaff)` dengan data persisted (dikeykan oleh `pegawaiId`/`niy`) agar akun seed tetap tersedia.
- Tulis ke localStorage pada setiap mutasi: `ADD_ADMIN_USER`, `UPDATE_ADMIN_USER`, `DELETE_ADMIN_USER`, `RESET_STAFF_PASSWORD`.

### T5 — Tes (baru; belum ada framework unit test)
- Tambahkan skrip uji node (mirip pola `scripts/*.mjs`) untuk:
  - `ADD_ADMIN_USER` dengan skenario Kepala Sekolah: (a) NIY baru diisi, (b) NIY kosong (harus ditolak form), (c) NIY duplikasi staff lama → userAccount tetap dibuat/diperbarui dengan role 'Kepala Sekolah'.
  - `authenticateCredentials` untuk akun Kepala Sekolah yang baru ditambahkan (login berhasil, role benar, diarahkan ke `/mobile/home`).
  - Persistensi: state setelah refresh tetap memuat adminUsers dan userAccounts yang ditambah manual.

### T6 — E2e Playwright (opsional, butuh dev server)
- Skenario tambah akun Kepala Sekolah lewat AdminUserPage lalu login sebagai Kepala Sekolah ke `/mobile/home`.

## Kriteria validasi (Definition of Done)
1. Tambah Kepala Sekolah dengan NIY → tersimpan di `adminUsers`, `staff`, dan `userAccounts`; login sebagai Kepala Sekolah berhasil (role benar, route `/mobile/home`).
2. Tambah Kepala Sekolah tanpa NIY → form menolak dengan pesan validasi (jika T1 disetujui).
3. Refresh halaman → akun yang ditambah manual tetap tersedia dan bisa login.
4. `npm run build` lolos tanpa error.
5. E2e login `kepalaSD` (seed) tetap berhasil — tidak ada regresi.

## Risiko & catatan
- Persistensi `userAccounts` dapat mempertahankan kata sandi lama bila penggabungan dengan `buildUserAccounts(initialStaff)` tidak dikeykan dengan benar (`pegawaiId`/`niy`).
- `selectScopedAdminUsers` (`simPresStore.jsx:3360`) menyembunyikan akun di luar unit aktif untuk non-Superadmin — perilaku sengaja, bukan bug; catat kepada user bahwa akun Kepala Sekolah di unit lain mungkin tidak muncul saat unit aktif berbeda.

# ============================
# FASE 2: Halaman Mobile Kosong Setelah Login Kepala Sekolah
# ============================

## Masalah baru (dilaporkan user)
Setelah berhasil login sebagai Kepala Sekolah, aplikasi menampilkan bottom navigation (menus) dari `MobileLayout`, tetapi `<Outlet />` tidak merender konten halaman — tampak kosong atau menampilkan error "Data pegawai tidak ditemukan". User ingin Kepala Sekolah memiliki halaman mobile yang **sama persis** dengan Guru/Pegawai (Beranda, Presensi, Riwayat, Slip, Izin/Cuti, Profil, Kartu ID, QR) **ditambah** menu tambahan Persetujuan Izin.

## Akar penyebab (kondisi saat ini)
- Routing di `App.jsx`: SUDAH BENAR — semua rute `/mobile/*` tersedia untuk semua role mobile termasuk Kepala Sekolah.
- Permission matrix di `simPresStore.jsx:107-128`: SUDAH BENAR — Kepala Sekolah punya `view`/`edit` untuk semua menu mobile incl. `pengajuanIzinCuti: ['view', 'edit']`.
- Bottom nav di `MobileLayout.jsx:23-29`: SUDAH BENAR — menambah menu Persetujuan untuk `ROLE_KEPALA_SEKOLAH`.
- `selectSelfStaffId` (`simPresStore.jsx:3204-3213`): mencari staff lewat `user.staffId` → `user.pegawaiId` → NIY match. Jika akun Kepala Sekolah tidak punya `pegawaiId`/`staffId` dan NIY kosong/tidak cocok, returns `null`.
- `MobileBerandaPage.jsx:109-120`: jika `!staff || !presensi`, render `ErrorState` "Data pegawai tidak ditemukan" — ini bukan halaman beranda yang diharapkan user.
- Akun Kepala Sekolah yang dibuat **sebelum** perbaikan Fase 1 (NIY wajib + sync userAccount) mungkin tidak memiliki `userAccount` yang terhubung ke staff, sehingga `selectSelfStaffId` returns `null`.

## Tugas perbaikan Fase 2

### T7 — Pastikan akun Kepala Sekolah terhubung ke data staff (`simPresStore.jsx`)
- Saat `findAccountByIdentifier` menemukan `adminUser` dengan role `Kepala Sekolah` (atau `Guru`), pastikan `staffId` dan `pegawaiId` diisi dengan ID staff yang sesuai (berdasarkan NIY match terhadap `state.staff`).
- Ini memastikan `selectSelfStaffId` dan `selectSelfStaff` dapat menemukan data pegawai untuk akun yang sudah ada.

### T8 — Audit dan perbaiki error rendering di semua halaman mobile (`src/pages/mobile/*.jsx`)
- Periksa setiap halaman mobile untuk karakter BOM, syntax error, atau null reference yang menyebabkan komponen tidak render.
- Khusus: `MobileBerandaPage.jsx` line 2 memiliki karakter `﻿` (BOM) sebelum `import` — hapus.
- Pastikan semua halaman mobile render fallback (LoadingState/ErrorState) yang jelas, tidak pernah blank.

### T9 — Pastikan `selectSelfPresensi` dan `selectSelfLeaves` bekerja untuk Kepala Sekolah (`simPresStore.jsx`)
- Verifikasi selector-selector ini menggunakan `selectSelfStaffId` yang sudah benar terhubung ke staff data.
- Tanpa staff linkage, presensi dan riwayat izin tidak bisa ditampilkan.

### T10 — Tes akhir keurutan login Kepala Sekolah
- Login sebagai Kepala Sekolah → diarahkan ke `/mobile/home`.
- Beranda menampilkan data pegawai (sama seperti Guru/Pegawai).
- Semua menu bottom nav (Beranda, Presensi, Riwayat, Slip, Izin/Cuti, Profil + Persetujuan) bisa diklik dan menampilkan halaman yang sesuai.
- `npm run build` lolos tanpa error.

## Kriteria validasi Fase 2 (Definition of Done)
1. Login Kepala Sekolah berhasil, route ke `/mobile/home`, halaman beranda menampilkan data pegawai (tidak blank, tidak error "Data pegawai tidak ditemukan").
2. Setiap menu bottom nav untuk Kepala Sekolah (termasuk Persetujuan) membuka halaman yang benar.
3. Semua fitur Guru/Pegawai tersedia untuk Kepala Sekolah: presensi, riwayat, slip, izin/cuti, profil, kartu ID, QR.
4. `npm run build` lolos tanpa error.

## Risiko Fase 2
- Akun Kepala Sekolah lama (sebelum Fase 1) yang tidak punya NIY atau staff linkage perlu di-migrasi atau di-update ulang melalui AdminUserPage.
- Perubahan pada `findAccountByIdentifier` dapat mempengaruhi login role lain (Guru, Superadmin, Admin Unit) — perlu regression test.
- AdminUnit yang menambah Kepala Sekolah ke unit yang bukan unit aktifnya tidak akan melihatnya dalam daftar scoped (perancangan saat ini).
