# Rencana: Logout Smooth & Sesi Persisten Mobile

## Ringkasan
- **Masalah 1 (logout tidak smooth)**: alur logout tersebar/inkonsisten dan reducer tidak memproses `LOGOUT` dengan benar, sehingga pembersihan state tidak deterministik dan transisi bisa terasa patah.
- **Masalah 2 (login ulang mobile)**: aplikasi sudah punya fondasi persistensi sesi berbasis storage, tetapi perilakunya belum eksplisit untuk seluruh user mobile (Guru/Pegawai **dan** Kepala Sekolah) dan masih terikat pilihan “Ingat saya”.

**Rekomendasi (disetujui sebagai arah implementasi):** logout harus satu jalur, instan di UI (state dibersihkan sinkron), dengan transisi halus ke `/login` tanpa `window.location.replace` pada alur normal. User mobile (mode mobile: Guru/Pegawai, Kepala Sekolah) tetap login sampai logout eksplisit; role portal (Superadmin/Admin Unit/Petugas) tetap sesi non-persisten demi keamanan perangkat bersama.

## Temuan Relevan (kode saat ini)
- `src/store/simPresStore.jsx:1288-1308` — `case 'SYNC_ATTENDANCE'` ditutup lalu ada blok `return { ...currentUser:null, isAuthenticated:false,... }` **tanpa** `case 'LOGOUT'` (unreachable). `performLogout` (`:1699-1702`) memanggil `dispatch({type:'LOGOUT'})` sehingga pembersihan state via reducer saat ini tidak efektif.
- `src/store/simPresStore.jsx:1374-1414,1656-1684,1704-1720` — sesi identitas-only (`sanitizeSessionUser`), restore via `initWithStoredSession` + validasi ulang akun/status/permission. `readStoredSession` menolak restore portal dari `localStorage` (`:1385-1391`), tetapi `performLogin` menghitung `isPortalRole = user.role !== ROLE_GURU_PEGAWAI` (`:1676-1677`) → **Kepala Sekolah** (mobile) diperlakukan portal (tidak dipersist), inkonsisten dengan mode mobile. `effectiveRemember` memaksa portal ke `false`.
- `src/pages/LoginPage.jsx:66,96-101,315-327` — `remember` default `true`, dipakai saat login; UI “Ingat saya” relevan berbeda untuk portal vs mobile.
- `src/App.jsx:152-159` — `/logout` memanggil `performLogout` lalu `window.location.replace('/login')` (hard reload, terasa tidak smooth).
- `src/components/Sidebar.jsx:176-184,252-270` — konfirmasi logout lalu `performLogout` + `navigate('/login',{replace:true})`.
- `src/pages/mobile/MobileProfilPage.jsx:189-192,516-558` — konfirmasi lalu `performLogout` + `navigate('/login',{replace:true})`.
- `src/components/ChangePasswordGate.jsx:77-80` — `performLogout` + `navigate` (konteks akun dipaksa ganti sandi).
- `src/components/ProtectedRoute.jsx:31,69-79` — guard/guest-only sudah mengandalkan `selectIsAuthenticated` dan `resolvePostLoginPath`; setelah logout state bersih, guard akan mengarahkan ke login.

## Keputusan Desain
1. **Logout**: reducer **wajib** menangani `LOGOUT` (reset auth/session fields ke state aman: `currentUser:null`, `isAuthenticated:false`, `selectedUnitId:ALL_UNITS`, `authStatus:'idle'`, `authError:null`, `authErrorCode:null`, `passwordChangeRequested:false`; jangan menghapus data domain kecuali memang diperlukan). `performLogout` tetap menghapus storage sesi lalu dispatch `LOGOUT`. UI logout memakai satu pola: konfirmasi (jika ada) → set state “keluar…” non-blocking singkat/disabled → `performLogout` → `navigate('/login',{replace:true})` (SPA). Hindari hard reload; `/logout` route mengikuti pola yang sama (render transisi ringan lalu navigate) agar tidak blank/jank.
2. **Persistensi mobile (“tetap login sampai logout”)**: tentukan persistensi berdasarkan **mode/role mobile** (`ROLE_GURU_PEGAWAI`, `ROLE_KEPALA_SEKOLAH` / `MODE_MOBILE`), bukan `role !== GURU`. Untuk user mobile, sesi **selalu** ditulis ke `localStorage` (abaikan toggle “Ingat saya”) dan dipulihkan otomatis saat buka berikutnya; logout eksplisit = `clearStoredSession` + `LOGOUT`. Untuk portal, tetap `sessionStorage` (atau non-persist) dan tidak dipulihkan dari `localStorage` (pertahankan kebijakan saat ini).
3. **Keamanan & validitas sesi**: pertahankan validasi ulang saat init (`findAccountByIdentifier`, status aktif, permission). Sesi tetap identitas-only (tanpa password/mustChangePassword). Tidak menambah TTL paksa (sesuai “kecuali logout”) — risiko diterima; mitigasi: revalidasi on-load dan (opsional, follow-up) revalidasi saat fokus/tab-visible. Bila akun dinonaktifkan/dihapus/role berubah, sesi otomatis dibersihkan saat restore.
4. **UX**: tombol logout disabled + indikator singkat saat proses, feedback sukses opsional non-intrusif, tidak ada redirect ganda; pastikan `ChangePasswordGate`/modal tertutup oleh reset state.

## Rencana Implementasi (untuk agent eksekusi)
1. **Perbaiki reducer & helper auth** (`src/store/simPresStore.jsx`)
   - Tambah `case 'LOGOUT'` yang mengembalikan reset auth/session (hapus blok return dangling setelah `SYNC_ATTENDANCE` atau pindahkan menjadi case yang benar). Pastikan tidak merusak data lain.
   - Ganti logika `isPortalRole` di `performLogin` dan cek di `readStoredSession` agar konsisten dengan role mobile (Guru/Pegawai & Kepala Sekolah) vs portal; gunakan `normalisasiRole`/`appModeOfRole`/konstanta role yang sudah ada. Untuk mobile, paksa persist (`effectiveRemember = true`) dan tulis ke persistent store.
   - Pastikan `writeStoredSession`/`readStoredSession`/`initWithStoredSession` selaras: mobile boleh restore dari localStorage, portal tidak. Jangan simpan kredensial.
2. **Satukan alur logout UI**
   - `src/App.jsx` (`LogoutRoute`): ganti hard reload dengan alur SPA (dispatch/logout + `navigate('/login',{replace:true})` atau komponen transisi minimal) agar konsisten dan smooth.
   - `src/components/Sidebar.jsx`, `src/pages/mobile/MobileProfilPage.jsx`, `src/components/ChangePasswordGate.jsx`: gunakan pola yang sama, cegah double-click, beri state loading lokal singkat bila perlu, pastikan dialog/menu tertutup sebelum/selaras dengan navigasi.
   - Audit pemanggil lain `performLogout` (mis. halaman/menu lain) untuk konsistensi.
3. **Penyesuaian Login & perilaku “ingat saya”** (`src/pages/LoginPage.jsx`)
   - Karena mobile auto-persist, pertimbangkan menyembunyikan/menonaktifkan toggle yang menyesatkan atau menyesuaikan copy (keputusan UI minor, implementasi mengikuti perilaku di atas). Pastikan portal tidak mendapat persist meski toggle aktif.
4. **Validasi khusus mobile (Guru/Pegawai & Kepala Sekolah)**
   - Verifikasi `ROLE_KEPALA_SEKOLAH` diperlakukan mobile di seluruh jalur sesi (login, restore, guard, home path) dan tetap bisa logout normal.

## Risiko & Mitigasi
- **Perangkat bersama (mobile)**: sesi persisten = siapa pun yang pegang perangkat bisa akses sampai logout → mitigasi: tombol logout jelas, revalidasi status akun saat restore, pertimbangkan opsi “kunci cepat”/timeout di iterasi berikut jika kebijakan berubah.
- **Regresi auth guard**: perubahan storage/restore bisa loop redirect → uji `ProtectedRoute`/`GuestOnlyRoute`/`resolvePostLoginPath` untuk semua role.
- **State stale setelah logout**: pastikan reset field auth mencegah tampilan data user lama; data domain bisa tetap di memori app sampai reload penuh hanya jika aman (sesi identitas sudah hilang).

## Rencana Validasi
- Unit/logic: tambah atau jalankan tes auth/session jika ada (cari `test*auth*`, `*login*`, `simPresStore`); pastikan `LOGOUT` mereset state dan sesi storage terhapus.
- Manual (dev): 
  - Logout dari sidebar (portal) dan profil mobile: konfirmasi → transisi halus ke `/login`, refresh tidak auto-login, back/forward tidak masuk area terproteksi.
  - Login Guru/Pegawai dan Kepala Sekolah → tutup tab/browser/PWA → buka lagi: langsung masuk ke beranda mobile tanpa form login; presensi dapat diakses.
  - Klik Logout pada mobile → buka lagi: harus login ulang.
  - Login Superadmin/Admin Unit/Petugas dengan “Ingat saya”: tutup browser → buka lagi: **harus** login ulang (sesuai kebijakan portal).
  - Akun dinonaktifkan saat sesi tersimpan: saat restore/open berikutnya ditolak dan sesi dibersihkan.
- Build: `npx vite build` dan rangkaian tes unit terkait (`scripts/test-*.mjs`) setelah perubahan.

## Di Luar Cakupan
- Penerapan/migrasi skema Supabase (tetap sesuai status sebelumnya).
- SSO/Supabase Auth penuh, refresh token, atau kebijakan keamanan perangkat enterprise (MDM) — dapat menjadi tindak lanjut.