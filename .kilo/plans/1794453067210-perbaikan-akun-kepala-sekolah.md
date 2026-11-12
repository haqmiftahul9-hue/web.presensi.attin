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
- AdminUnit yang menambah Kepala Sekolah ke unit yang bukan unit aktifnya tidak akan melihatnya dalam daftar scoped (perancangan saat ini).
