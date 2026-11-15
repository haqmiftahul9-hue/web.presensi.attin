# Rencana Maksimal: Role Admin/Kepala Sekolah Tidak Muncul Menu + Login Kosong & Logout Gagal

## Ringkasan masalah (laporan user)
1. Pegawai yang diubah role-nya jadi **Kepala Sekolah** atau **Admin** via halaman Data Guru/Pegawai, setelah login **tidak mendapat menu tambahan** admin/kepala sekolah.
2. Login terkadang gagal / masuk ke **halaman mobile kosong (blank)** dan **logout tidak bisa dilakukan** (kembali ke akun yang sama / tidak kembali ke /login).

## Akar penyebab (ditemukan via code review root `src/`)
- `ROLE_APP_MODE[KEPALA_SEKOLAH] = MODE_MOBILE` dan `ROLE_HOME_PATH[KEPALA_SEKOLAH] = '/mobile/home'` → Kepala Sekolah selalu diarahkan ke aplikasi mobile, bukan dashboard desktop dengan sidebar menu admin (`simPresStore.jsx:371,383`).
- Bottom nav mobile **hardcoded** 5 item, tidak berbasis `PERMISSION_MATRIX` → menu Kepala Sekolah (Persetujuan Izin, dll) tidak muncul otomatis setelah role berubah (`MobileLayout.jsx:24-36`).
- `UPDATE_STAFF` mengubah `currentUser.role` seketika tapi **tidak memicu navigasi ulang** ke home yang sesuai role baru; tab yang sudah buka tetap di halaman lama (`simPresStore.jsx:871-886`).
- `SYNC_STORAGE_USER_ACCOUNTS` belum ada di reducer + listener storage → role yang diubah di tab lain tidak difresh di tab yang sudah buka (`simPresStore.jsx:1416-1439`, listener `storage` di `SimPresProvider`).
- `case 'LOGOUT'` **tidak ada** di reducer; blok `return {...currentUser:null...}` setelah `SYNC_ATTENDANCE` tidak terjangkau → `performLogout` tidak bersihkan state via reducer (`simPresStore.jsx:1584-1596` adalah case yang benar tapi terisolasi; verifikasi tidak ada duplikasi/dangling).
- `LogoutRoute` di `App.jsx` menggunakan `navigate('/login', { replace: true })` — cukup, tetapi alur logout tersebar di Sidebar/MobileProfil/ChangePasswordGate tanpa indikasi konsisten.
- `findAccountByIdentifier` / `selectSelfStaffId` mungkin gagal menautkan akun Kepala Sekolah ke data staff (NIY kosong / tidak cocok) → halaman mobile menampilkan "Data pegawai tidak ditemukan" / blank (`simPresStore.jsx:1772-1805`, `MobileBerandaPage.jsx`).
- `isMobileSessionRole` mencakup Admin Unit & Superadmin (persisten localStorage) padahal mode-nya desktop → inkonsisten sesi (`simPresStore.jsx:1710-1713`).

## Ruang lingkup & asumsi
- Hanya root `src/` diubah. Folder `simpres_*` di luar cakupan.
- Auth/store tunggal: `src/store/simPresStore.jsx`.
- Arsitektur role dibawa dari plan approved sebelumnya (`1794626099895`, `1794453067210`, `1794032754726`) dan **dipersetujui ulang dalam plan ini**:
  - `Admin Unit` = desktop-only (`MODE_DESKTOP`), home `/dashboard`, sidebar.
  - `Guru` = mobile-only.
  - `Kepala Sekolah` = mobile (`MODE_MOBILE`), home `/mobile/home`, bottom nav + menu Persetujuan Izin.
  - Jika user ingin Kepala Sekolah punya **sidebar desktop**, itu adalah perubahan arsitektur terpisah (di luar cakupan plan ini, catat sebagai follow-up).

## Keputusan arsitektur (disetujui dalam plan ini)
1. Kepala Sekolah tetap mobile; "menu tambahan sebagai kepala sekolah" disajikan lewat **bottom nav mobile berbasis permission** (Persetujuan Izin + menu lain sesuai matriks), konsisten dengan sidebar desktop.
2. Admin Unit tetap desktop; menu muncul via sidebar yang sudah difilter `hasMenuPermission`.
3. Logout = satu jalur SPA, state bersih via reducer `LOGOUT`, storage dihapus, navigate `/login` tanpa hard reload.
4. Sesi mobile (Guru, Kepala Sekolah) selalu persist `localStorage` (abaikan toggle "Ingat saya"); portal (Superadmin/Admin Unit/Petugas) non-persisten.
5. Setiap perubahan role pada akun yang sedang login memicu navigasi ulang ke home yang sesuai role baru.

## Tugas perbaikan (root `src/`)

### T1 — Reducer `LOGOUT` efektif & hapus blok return dangling
File: `src/store/simPresStore.jsx`
- Pastikan `case 'LOGOUT'` mengembalikan reset auth/session: `currentUser: null`, `isAuthenticated: false`, `selectedUnitId: ALL_UNITS`, `authStatus: 'idle'`, `authError: null`, `authErrorCode: null`, `passwordChangeRequested: false`. Jangan menghapus data domain.
- Hapus/verifikasi tidak ada blok `return { ...currentUser:null...}` yang tidak terjangkau setelah `case 'SYNC_ATTENDANCE'`.
Efek: `performLogout` membersihkan state secara deterministik.

### T2 — Persistensi sesi mobile konsisten (Guru & Kepala Sekolah)
File: `src/store/simPresStore.jsx`
- `performLogin`: `effectiveRemember = true` untuk role mobile (`appModeOfRole(role) === MODE_MOBILE`), tulis ke `localStorage`; portal non-persisten (`sessionStorage` / tidak disimpan).
- `readStoredSession`: mobile boleh restore dari `localStorage`; portal tidak boleh restore dari `localStorage` (hapus jika ada).
- `initWithStoredSession`: validasi ulang akun (status Aktif, permission matrix, `roleDikenal`); bila gagal → `clearStoredSession` + `currentUser: null`.
Efek: login mobile "tetap login sampai logout"; portal tidak auto-login setelah browser ditutup.

### T3 — Satukan alur logout SPA (tanpa hard reload)
File: `src/App.jsx` (`LogoutRoute`), `src/components/Sidebar.jsx`, `src/pages/mobile/MobileProfilPage.jsx`, `src/components/ChangePasswordGate.jsx`
- Semua pemakaian `performLogout` → `navigate('/login', { replace: true })` (SPA), tombol logout disabled selama proses, dialog/menu ditutup sebelum navigasi.
- `LogoutRoute`: render transisi ringan, lalu `performLogout` + navigate; hindari `window.location.replace`.
Efek: logout smooth, konsisten, kembali ke `/login`.

### T4 — Refresh `currentUser` saat `userAccounts` berubah lintas tab
File: `src/store/simPresStore.jsx`
- Tambah `case 'SYNC_STORAGE_USER_ACCOUNTS'`: ganti `state.userAccounts`; bila `currentUser` aktif, re-derive lewat `findAccountByIdentifier(state, accountLoginKey(currentUser))`; jika `role`/`unitId`/`status` berubah → perbarui `currentUser` dan `selectedUnitId = initialUnitScope(fresh)`.
- Listener `storage` di `SimPresProvider`: tambah cabang `PERSISTED_USER_ACCOUNTS_KEY` → dispatch `SYNC_STORAGE_USER_ACCOUNTS`.
Efek: role yang diubah Superadmin di desktop terlihat segera di tab mobile yang sudah buka (tanpa relogin).

### T5 — Bottom nav mobile berbasis permission
File: `src/components/mobile/MobileLayout.jsx`
- Ganti `buildNavItems` hardcoded: daftar rute mobile berurutan (home, presensi = tengah, riwayat, slip, izin-cuti, persetujuan-izin, kartu-id, qr, profil), kunci menu dari `ROUTE_MENU_KEYS[to]`.
- Tampilkan item bila `hasMenuPermission(state, role, menuKey, 'view')`.
- "Persetujuan" muncul bila `hasMenuPermission(state, role, 'pengajuanIzinCuti', 'edit')` (Kepala Sekolah = true, Guru = false sesuai matriks saat ini).
Efek: menu selalu mencerminkan role aktif; role berubah → menu berubah tanpa relogin.

### T6 — Tautkan akun Kepala Sekolah/Admin ke data staff
File: `src/store/simPresStore.jsx`
- `findAccountByIdentifier`: bila menemukan `adminUser` role `Kepala Sekolah`/`Guru`, isi `staffId`/`pegawaiId` dari staff yang cocok NIY.
- `selectSelfStaffId`: pastikan fallback `user.staffId` → `user.pegawaiId` → NIY match terhadap `state.staff` tidak pernah menghasilkan `null` untuk akun yang valid.
Efek: halaman mobile (Beranda, Presensi, Riwayat, Slip, Izin/Cuti, Profil) menampilkan data, tidak blank / "Data pegawai tidak ditemukan".

### T7 — Audit halaman mobile agar tidak blank
File: `src/pages/mobile/*.jsx`
- Hapus karakter BOM (mis. `MobileBerandaPage.jsx` baris awal jika ada).
- Pastikan setiap halaman render `LoadingState`/`ErrorState` fallback, tidak pernah blank.
- `MobileErrorBoundary` tangani error per-route dengan pesan yang jelas.
Efek: tidak ada layar mobile kosong setelah login.

### T8 — Navigasi ulang otomatis setelah role change pada akun aktif
File: `src/pages/DataGuruPegawaiPage.jsx` (atau `src/components/StaffTable.jsx`)
- Setelah `dispatch({ type: 'UPDATE_STAFF', ... })`, bila role/unitId `currentUser` berubah (akun yang sedang login adalah target), navigasi ke `selectAppHomePath(state)` via `navigate({ replace: true })`.
- Gunakan `useEffect` memantau `currentUser.role`/`unitId`; bila berubah dari nilai sebelum dispatch → redirect ke home baru.
Efek: admin yang mengubah role dirinya sendiri (atau role berubah lewat tab lain via T4) langsung berpindah ke halaman yang sesuai.

### T9 — Sidebar desktop: entri role Kepala Sekolah & menu Admin Unit
File: `src/components/Sidebar.jsx`
- Tambah entri `Kepala Sekolah` di `roleMap` (jangan fallback ke `roleMap.Guru`).
- Verifikasi `navItems` difilter `hasMenuPermission` dan `onlyRole` — Admin Unit melihat menu sesuai matriks (dashboard, dataGuruPegawai, presensi, rekapLaporan, pengajuanIzinCuti, logAktivitas, dll).
Efek: Admin Unit dan (jika pindah desktop nanti) Kepala Sekolah melihat sidebar menu yang benar.

### T10 — Tes, build, dan validasi manual semua role
- Tambah skenario di `scripts/test-*.mjs`:
  - `UPDATE_STAFF` ganti role → `userAccounts[pegawaiId].role` ikut berubah (normalisasi).
  - `hasPermission('Kepala Sekolah', 'pengajuanIzinCuti', 'edit')` = true; `hasPermission('Guru', ...)` = false.
  - `appModeOfRole('Admin Unit') = MODE_DESKTOP`; `appModeOfRole('Kepala Sekolah') = MODE_MOBILE`.
  - `LOGOUT` mereset auth state; `clearStoredSession` menghapus sesi.
  - `findAccountByIdentifier` mengembalikan role baru setelah `userAccounts` diupdate.
- `npm run build` (Vite) lolos tanpa error.
- Manual QA:
  - Login Guru → ubah role jadi Kepala Sekolah via Data Guru/Pegawai → login ulang sebagai Kepala Sekolah → bottom nav menampilkan "Persetujuan" + menu standar, tidak blank.
  - Login Admin Unit → dashboard desktop + sidebar menu sesuai permission.
  - Logout dari sidebar & profil mobile → kembali ke `/login`; refresh tidak auto-login (portal); mobile tetap login sampai logout.
  - Tidak ada redirect loop / layar kosong.

## Kriteria validasi (Definition of Done)
1. Role berubah via Data Guru/Pegawai → `userAccounts[pegawaiId].role` & `adminUsers` terupdate, tersimpan `localStorage`.
2. Login sebagai Kepala Sekolah → `/mobile/home`, bottom nav menampilkan menu tambahan (Persetujuan Izin + standar), tidak blank.
3. Login sebagai Admin Unit → `/dashboard`, sidebar menampilkan menu sesuai permission.
4. Logout bekerja (sidebar & profil mobile): kembali ke `/login`, sesi dihapus, tidak auto-login setelah refresh (portal), tidak ada layar kosong.
5. Role berubah pada akun yang sedang login → navigasi ulang ke home sesuai role baru (tanpa relogin manual).
6. `npm run build` lolos; tes `scripts/test-*.mjs` lolos; tidak ada regresi login semua role.

## Risiko & mitigasi
- Listener storage memicu re-render banyak tab → reducer hanya ubah state bila isi `userAccounts` benar-benar berubah; refresh `currentUser` hanya bila `role`/`unitId`/`status` benar-benar berbeda.
- `findAccountByIdentifier` dipakai ulang untuk refresh sesi → regression login Guru/Superadmin/Admin Unit harus diuji (sudah ada cakupan tes).
- Perangkat bersama (mobile): sesi persist = siapa pun pegang perangkat bisa akses sampai logout → mitigasi tombol logout jelas + revalidasi status akun saat restore.
- Jika user nanti ingin Kepala Sekolah punya **sidebar desktop** (bukan bottom nav mobile), itu perubahan arsitektur terpisah (ubah `ROLE_APP_MODE[KEPALA_SEKOLAH]`, `ROLE_HOME_PATH[KEPALA_SEKOLAH]`, dan matriks permission desktop).

## Di luar cakupan
- Migrasi akun Kepala Sekolah lama yang belum punya NIY/staff linkage (handle via AdminUserPage / form ulang).
- Supabase Auth penuh / SSO / refresh token / kebijakan perangkat enterprise.
- Ubah Kepala Sekolah ke desktop sidebar (follow-up, butuh konfirmasi user terpisah).
