# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-presensi.spec.js >> SIMPEG Attin - Sistem Presensi E2E >> Superadmin Desktop - Dashboard & Manajemen >> Navigasi ke Pengaturan Global
- Location: tests\e2e-presensi.spec.js:83:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('a:has-text("Pengaturan"), [href="/pengaturan-global"]')

```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - generic [ref=f1e6]:
    - generic [ref=f1e7]:
      - img "SIMPEG" [ref=f1e9]
      - heading "SIMPEG" [level=1] [ref=f1e10]
      - paragraph [ref=f1e11]: Sistem Informasi Kepegawaian & Presensi
    - generic [ref=f1e12]:
      - generic [ref=f1e13]:
        - textbox "Username" [invalid] [ref=f1e14]
        - generic [ref=f1e15]: Username
        - generic [ref=f1e16]: NIY, username, atau email dinas wajib diisi.
      - generic [ref=f1e17]:
        - textbox "Password" [ref=f1e18]: superadmin1234!
        - generic [ref=f1e19]: Password
        - button "Tampilkan kata sandi" [ref=f1e20] [cursor=pointer]:
          - generic [ref=f1e21]: visibility
      - generic [ref=f1e22]:
        - generic [ref=f1e23] [cursor=pointer]:
          - checkbox "Ingat saya" [checked] [ref=f1e24]
          - generic [ref=f1e25]: Ingat saya
        - button "Lupa password?" [ref=f1e26] [cursor=pointer]
      - button "Masuk arrow_forward" [active] [ref=f1e28] [cursor=pointer]:
        - generic [ref=f1e29]: Masuk
        - generic [ref=f1e30]: arrow_forward
  - paragraph [ref=f1e31]: © 2026 SIMPEG · Yayasan Islam Attin Indonesia
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
  32  |       await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
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
> 85  |       await page.click('a:has-text("Pengaturan"), [href="/pengaturan-global"]');
      |                  ^ Error: page.click: Test timeout of 60000ms exceeded.
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
  133 |     });
  134 | 
  135 |     test('Admin Unit tidak dapat mengakses Pengaturan Global (403)', async ({ page }) => {
  136 |       await login(page, CREDENTIALS.adminSD);
  137 |       await page.goto(`${BASE_URL}/pengaturan-global`);
  138 |       await page.waitForTimeout(2000);
  139 |       await expect(page.url()).toContain('/403');
  140 |     });
  141 | 
  142 |     test('Admin Unit dapat mengakses Data Guru/Pegawai unitnya', async ({ page }) => {
  143 |       await login(page, CREDENTIALS.adminSD);
  144 |       await page.click('a:has-text("Data Guru"), [href="/data-guru-dan-pegawai"]');
  145 |       await page.waitForURL(`${BASE_URL}/data-guru-dan-pegawai`);
  146 |     });
  147 | 
  148 |     test('Admin Unit dapat mengakses Monitoring Presensi', async ({ page }) => {
  149 |       await login(page, CREDENTIALS.adminSD);
  150 |       await page.click('a:has-text("Monitoring"), [href="/presensi"]');
  151 |       await page.waitForURL(`${BASE_URL}/presensi`);
  152 |     });
  153 |   });
  154 | 
  155 |   // ========== GURU MOBILE TESTS ==========
  156 |   test.describe('Guru Mobile - Presensi & Profil', () => {
  157 |     test('Mobile Beranda menampilkan data pegawai', async ({ page }) => {
  158 |       await login(page, CREDENTIALS.guruSD);
  159 |       await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
  160 |       await expect(page.locator('text=Presensi Hari Ini')).toBeVisible();
  161 |       await expect(page.locator('text=Bustanul Abidin')).toBeVisible();
  162 |     });
  163 | 
  164 |     test('Navigasi ke Presensi Mobile', async ({ page }) => {
  165 |       await login(page, CREDENTIALS.guruSD);
  166 |       await page.click('a:has-text("Presensi Sekarang"), [href="/mobile/presensi"]');
  167 |       await page.waitForURL(`${BASE_URL}/mobile/presensi`);
  168 |       await expect(page.locator('text=Status Sensor')).toBeVisible();
  169 |     });
  170 | 
  171 |     test('Navigasi ke Riwayat Mobile', async ({ page }) => {
  172 |       await login(page, CREDENTIALS.guruSD);
  173 |       await page.click('a:has-text("Riwayat Presensi"), [href="/mobile/riwayat"]');
  174 |       await page.waitForURL(`${BASE_URL}/mobile/riwayat`);
  175 |       await expect(page.locator('text=Riwayat Kehadiran')).toBeVisible();
  176 |     });
  177 | 
  178 |     test('Navigasi ke Slip Kehadiran', async ({ page }) => {
  179 |       await login(page, CREDENTIALS.guruSD);
  180 |       await page.click('a:has-text("Slip Kehadiran"), [href="/mobile/slip"]');
  181 |       await page.waitForURL(`${BASE_URL}/mobile/slip`);
  182 |       await expect(page.locator('text=Slip Kehadiran')).toBeVisible();
  183 |     });
  184 | 
  185 |     test('Navigasi ke Izin & Cuti Mobile', async ({ page }) => {
```