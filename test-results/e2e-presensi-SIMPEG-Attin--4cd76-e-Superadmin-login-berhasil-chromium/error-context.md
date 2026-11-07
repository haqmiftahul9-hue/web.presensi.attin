# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-presensi.spec.js >> SIMPEG Attin - Sistem Presensi E2E >> Login - Semua Role >> Superadmin login berhasil
- Location: tests\e2e-presensi.spec.js:30:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:5174/dashboard"
Received: "http://localhost:5174/login"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="id">…</html>
       - unexpected value "http://localhost:5174/login"

```

```yaml
- img "SIMPEG"
- heading "SIMPEG" [level=1]
- paragraph: Sistem Informasi Kepegawaian & Presensi
- textbox "Username" [invalid]
- text: Username NIY, username, atau email dinas wajib diisi.
- textbox "Password": superadmin1234!
- text: Password
- button "Tampilkan kata sandi": visibility
- checkbox "Ingat saya" [checked]
- text: Ingat saya
- button "Lupa password?"
- button "Masuk arrow_forward"
- paragraph: © 2026 SIMPEG · Yayasan Islam Attin Indonesia
```

# Test source

```ts
  1   | // ============================================================================
  2   | // PLAYWRIGHT E2E TEST - SIMPEG ATTIN SISTEM PRESENSI
  3   | // Menguji semua role: Superadmin, Admin Unit, Guru/Pegawai, Kepala Sekolah
  4   | // ============================================================================
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | 
  8   | const BASE_URL = 'http://localhost:5174';
  9   | 
  10  | // Kredensial test dari seed.js
  11  | const CREDENTIALS = {
  12  |   superadmin: { identifier: 'superadmin', password: 'superadmin1234!', role: 'Superadmin' },
  13  |   adminSD: { identifier: 'adminsd1', password: 'SDit@2026', role: 'Admin Unit', unit: 'SD' },
  14  |   guruSD: { identifier: '049097021', password: 'Attin123!', role: 'Guru', unit: 'SD' },
  15  |   kepalaSD: { identifier: 'kepalasd', password: 'KepalaSekolah@2026', role: 'Kepala Sekolah', unit: 'SD' },
  16  | };
  17  | 
  18  | async function login(page, creds) {
  19  |   await page.goto(`${BASE_URL}/login`);
  20  |   await page.fill('input[type="text"], input[name="identifier"]', creds.identifier);
  21  |   await page.fill('input[type="password"]', creds.password);
  22  |   await page.click('button[type="submit"]');
  23  |   await page.waitForTimeout(2000);
  24  | }
  25  | 
  26  | test.describe('SIMPEG Attin - Sistem Presensi E2E', () => {
  27  | 
  28  |   // ========== LOGIN TESTS ==========
  29  |   test.describe('Login - Semua Role', () => {
  30  |     test('Superadmin login berhasil', async ({ page }) => {
  31  |       await login(page, CREDENTIALS.superadmin);
> 32  |       await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  33  |       await expect(page.locator('h1')).toContainText('SimPres');
  34  |     });
  35  | 
  36  |     test('Admin Unit login berhasil', async ({ page }) => {
  37  |       await login(page, CREDENTIALS.adminSD);
  38  |       await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  39  |     });
  40  | 
  41  |     test('Guru login - dialihkan ke mobile', async ({ page }) => {
  42  |       await login(page, CREDENTIALS.guruSD);
  43  |       await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
  44  |     });
  45  | 
  46  |     test('Kepala Sekolah login - dialihkan ke mobile', async ({ page }) => {
  47  |       await login(page, CREDENTIALS.kepalaSD);
  48  |       await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
  49  |     });
  50  | 
  51  |     test('Login gagal dengan password salah', async ({ page }) => {
  52  |       await page.goto(`${BASE_URL}/login`);
  53  |       await page.fill('input[type="text"]', CREDENTIALS.superadmin.identifier);
  54  |       await page.fill('input[type="password"]', 'passwordsalah');
  55  |       await page.click('button[type="submit"]');
  56  |       await page.waitForTimeout(2000);
  57  |       await expect(page.locator('.text-rose-600, .text-red-600, [role="alert"]')).toBeVisible();
  58  |     });
  59  |   });
  60  | 
  61  |   // ========== SUPERADMIN DESKTOP TESTS ==========
  62  |   test.describe('Superadmin Desktop - Dashboard & Manajemen', () => {
  63  |     test('Dashboard menampilkan KPI cards', async ({ page }) => {
  64  |       await login(page, CREDENTIALS.superadmin);
  65  |       await expect(page.locator('text=Sudah Presensi')).toBeVisible();
  66  |       await expect(page.locator('text=Terlambat Hari Ini')).toBeVisible();
  67  |       await expect(page.locator('text=Belum Presensi')).toBeVisible();
  68  |     });
  69  | 
  70  |     test('Navigasi ke Data Guru/Pegawai', async ({ page }) => {
  71  |       await login(page, CREDENTIALS.superadmin);
  72  |       await page.click('a:has-text("Data Guru"), [href="/data-guru-dan-pegawai"]');
  73  |       await page.waitForURL(`${BASE_URL}/data-guru-dan-pegawai`);
  74  |       await expect(page.locator('h1, h2')).toContainText('Data Guru');
  75  |     });
  76  | 
  77  |     test('Navigasi ke Manajemen Admin & User', async ({ page }) => {
  78  |       await login(page, CREDENTIALS.superadmin);
  79  |       await page.click('a:has-text("Manajemen Admin"), [href="/manajemen-admin-user"]');
  80  |       await page.waitForURL(`${BASE_URL}/manajemen-admin-user`);
  81  |     });
  82  | 
  83  |     test('Navigasi ke Pengaturan Global', async ({ page }) => {
  84  |       await login(page, CREDENTIALS.superadmin);
  85  |       await page.click('a:has-text("Pengaturan"), [href="/pengaturan-global"]');
  86  |       await page.waitForURL(`${BASE_URL}/pengaturan-global`);
  87  |     });
  88  | 
  89  |     test('Navigasi ke Monitoring Presensi', async ({ page }) => {
  90  |       await login(page, CREDENTIALS.superadmin);
  91  |       await page.click('a:has-text("Monitoring"), [href="/presensi"]');
  92  |       await page.waitForURL(`${BASE_URL}/presensi`);
  93  |       await expect(page.locator('text=Monitoring Presensi')).toBeVisible();
  94  |     });
  95  | 
  96  |     test('Navigasi ke Rekap & Laporan', async ({ page }) => {
  97  |       await login(page, CREDENTIALS.superadmin);
  98  |       await page.click('a:has-text("Rekap"), [href="/rekap-dan-laporan"]');
  99  |       await page.waitForURL(`${BASE_URL}/rekap-dan-laporan`);
  100 |     });
  101 | 
  102 |     test('Navigasi ke Pengajuan Izin/Cuti', async ({ page }) => {
  103 |       await login(page, CREDENTIALS.superadmin);
  104 |       await page.click('a:has-text("Izin"), [href="/pengajuan-izin-dan-cuti"]');
  105 |       await page.waitForURL(`${BASE_URL}/pengajuan-izin-dan-cuti`);
  106 |     });
  107 | 
  108 |     test('Navigasi ke Log Aktivitas', async ({ page }) => {
  109 |       await login(page, CREDENTIALS.superadmin);
  110 |       await page.click('a:has-text("Log Aktivitas"), [href="/log-aktivitas"]');
  111 |       await page.waitForURL(`${BASE_URL}/log-aktivitas`);
  112 |     });
  113 | 
  114 |     test('Navigasi ke Cetak Kartu ID', async ({ page }) => {
  115 |       await login(page, CREDENTIALS.superadmin);
  116 |       await page.click('a:has-text("Kartu ID"), [href="/cetak-kartu-id"]');
  117 |       await page.waitForURL(`${BASE_URL}/cetak-kartu-id`);
  118 |     });
  119 | 
  120 |     test('Navigasi ke Ranking Kehadiran', async ({ page }) => {
  121 |       await login(page, CREDENTIALS.superadmin);
  122 |       await page.click('a:has-text("Ranking"), [href="/ranking-kehadiran"]');
  123 |       await page.waitForURL(`${BASE_URL}/ranking-kehadiran`);
  124 |     });
  125 |   });
  126 | 
  127 |   // ========== ADMIN UNIT DESKTOP TESTS ==========
  128 |   test.describe('Admin Unit Desktop - Terkunci ke Unit', () => {
  129 |     test('Admin Unit dapat mengakses dashboard', async ({ page }) => {
  130 |       await login(page, CREDENTIALS.adminSD);
  131 |       await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  132 |       await expect(page.locator('h1')).toContainText('SimPres');
```