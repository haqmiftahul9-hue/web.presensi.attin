# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-presensi.spec.js >> SIMPEG Attin - Sistem Presensi E2E >> Superadmin Desktop - Dashboard & Manajemen >> Navigasi ke Data Guru/Pegawai
- Location: tests\e2e-presensi.spec.js:70:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2')
Expected substring: "Data Guru"
Error: strict mode violation: locator('h1, h2') resolved to 4 elements:
    1) <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">SIMPEG</h1> aka getByRole('heading', { name: 'SIMPEG' })
    2) <h2 class="text-base font-bold text-foreground font-headline-sm">Tren Kehadiran Mingguan</h2> aka getByRole('heading', { name: 'Tren Kehadiran Mingguan' })
    3) <h2 class="text-base font-bold text-foreground font-headline-sm">Ringkasan per Unit</h2> aka getByRole('heading', { name: 'Ringkasan per Unit' })
    4) <h2 class="text-base font-bold text-foreground font-headline-sm">Aktivitas Presensi Terbaru</h2> aka getByRole('heading', { name: 'Aktivitas Presensi Terbaru' })

Call log:
  - Expect "toContainText" locator('h1, h2') with timeout 5000ms
  - waiting for locator('h1, h2')

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - status [ref=f1e8]: Login berhasil
  - generic [ref=f1e9]:
    - complementary [ref=f1e10]:
      - generic [ref=f1e11]:
        - generic [ref=f1e13]:
          - img "SIMPEG" [ref=f1e15]
          - generic [ref=f1e16]:
            - generic [ref=f1e17]: SIMPEG
            - generic [ref=f1e18]: Multi-Unit System
        - button "domain Unit Terpilih Semua Unit expand_more" [ref=f1e21] [cursor=pointer]:
          - generic [ref=f1e22]:
            - generic [ref=f1e23]: domain
            - generic [ref=f1e24]:
              - generic [ref=f1e25]: Unit Terpilih
              - generic [ref=f1e26]: Semua Unit
          - generic [ref=f1e27]: expand_more
        - generic [ref=f1e28]: Navigasi Utama
        - navigation [ref=f1e29]:
          - link "dashboard Dashboard" [ref=f1e30] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=f1e31]: dashboard
            - generic [ref=f1e32]: Dashboard
          - link "apartment Manajemen Unit" [ref=f1e33] [cursor=pointer]:
            - /url: /unit-sd-islam-rj
            - generic [ref=f1e34]: apartment
            - generic [ref=f1e35]: Manajemen Unit
          - link "manage_accounts Manajemen Admin & User" [ref=f1e36] [cursor=pointer]:
            - /url: /manajemen-admin-user
            - generic [ref=f1e37]: manage_accounts
            - generic [ref=f1e38]: Manajemen Admin & User
          - link "badge Data Guru/Pegawai" [active] [ref=f1e39] [cursor=pointer]:
            - /url: /data-guru-dan-pegawai
            - generic [ref=f1e40]: badge
            - generic [ref=f1e41]: Data Guru/Pegawai
          - link "contact_page Cetak Kartu ID" [ref=f1e42] [cursor=pointer]:
            - /url: /cetak-kartu-id
            - generic [ref=f1e43]: contact_page
            - generic [ref=f1e44]: Cetak Kartu ID
          - link "timer Presensi" [ref=f1e45] [cursor=pointer]:
            - /url: /presensi
            - generic [ref=f1e46]: timer
            - generic [ref=f1e47]: Presensi
          - link "qr_code_scanner Scan Presensi (Kios)" [ref=f1e48] [cursor=pointer]:
            - /url: /presensi-scan
            - generic [ref=f1e49]: qr_code_scanner
            - generic [ref=f1e50]: Scan Presensi (Kios)
          - link "summarize Rekap & Laporan" [ref=f1e51] [cursor=pointer]:
            - /url: /rekap-dan-laporan
            - generic [ref=f1e52]: summarize
            - generic [ref=f1e53]: Rekap & Laporan
          - link "leaderboard Ranking Kehadiran" [ref=f1e54] [cursor=pointer]:
            - /url: /ranking-kehadiran
            - generic [ref=f1e55]: leaderboard
            - generic [ref=f1e56]: Ranking Kehadiran
          - link "event_available Pengajuan Izin/Cuti" [ref=f1e57] [cursor=pointer]:
            - /url: /pengajuan-izin-dan-cuti
            - generic [ref=f1e58]: event_available
            - generic [ref=f1e59]: Pengajuan Izin/Cuti
          - link "history Log Aktivitas" [ref=f1e60] [cursor=pointer]:
            - /url: /log-aktivitas
            - generic [ref=f1e61]: history
            - generic [ref=f1e62]: Log Aktivitas
          - link "settings Pengaturan Global" [ref=f1e63] [cursor=pointer]:
            - /url: /pengaturan-global
            - generic [ref=f1e64]: settings
            - generic [ref=f1e65]: Pengaturan Global
      - generic [ref=f1e67]:
        - generic [ref=f1e68]: shield_person
        - generic [ref=f1e70]:
          - generic "Superadmin Pusat" [ref=f1e71]
          - generic "superadmin@simpres.sch.id" [ref=f1e72]: superadmin
          - generic [ref=f1e73]: Superadmin
        - button "Menu pengguna" [ref=f1e76] [cursor=pointer]:
          - generic [ref=f1e77]: more_vert
    - generic [ref=f1e78]:
      - banner [ref=f1e79]:
        - generic [ref=f1e81]:
          - generic: search
          - searchbox "Cari pegawai, NIY, atau data presensi" [ref=f1e82]
          - generic: /
        - generic [ref=f1e83]:
          - button "Pesan" [ref=f1e84] [cursor=pointer]:
            - generic [ref=f1e85]: chat
          - button "Notifikasi" [ref=f1e87] [cursor=pointer]:
            - generic [ref=f1e88]: notifications
          - generic [ref=f1e91]:
            - img "SIMPEG" [ref=f1e92]
            - generic [ref=f1e93]:
              - generic [ref=f1e94]: SIMPEG
              - generic [ref=f1e95]: Yayasan Islam Attin Indonesia
        - generic [ref=f1e96]: Superadmin Pusat
      - main [ref=f1e97]:
        - generic [ref=f1e99]:
          - generic [ref=f1e100]:
            - generic [ref=f1e101]:
              - img "SIMPEG" [ref=f1e103]
              - generic [ref=f1e104]:
                - generic [ref=f1e105]:
                  - heading "SIMPEG" [level=1] [ref=f1e106]
                  - generic [ref=f1e107]: Superadmin
                - paragraph [ref=f1e108]: Sistem Presensi Kepegawaian Terpadu
            - generic [ref=f1e109]:
              - generic [ref=f1e110]:
                - generic [ref=f1e111]: domain
                - generic [ref=f1e112]: Semua Unit Sekolah
              - generic [ref=f1e113]: Sabtu, 7 November 2026 • 17:56 WIB
          - generic [ref=f1e118]:
            - generic [ref=f1e119]:
              - generic [ref=f1e120]:
                - generic [ref=f1e121]: Total Pegawai
                - generic [ref=f1e122]: groups
              - generic [ref=f1e124]:
                - text: "9"
                - generic [ref=f1e126]:
                  - generic [ref=f1e127]: arrow_upward
                  - text: +4 staf baru bulan ini
            - generic [ref=f1e128]:
              - generic [ref=f1e129]:
                - generic [ref=f1e130]: Hadir Hari Ini
                - generic [ref=f1e131]: check_circle
              - generic [ref=f1e133]:
                - text: "0"
                - generic [ref=f1e134]: 0.0% tingkat kehadiran
            - generic [ref=f1e137]:
              - generic [ref=f1e138]:
                - generic [ref=f1e139]: Terlambat
                - generic [ref=f1e140]: schedule
              - generic [ref=f1e142]:
                - text: "0"
                - generic [ref=f1e144]:
                  - generic [ref=f1e145]: timer
                  - text: Rata-rata 0 menit
            - generic [ref=f1e146]:
              - generic [ref=f1e147]:
                - generic [ref=f1e148]: Alpha / Belum
                - generic [ref=f1e149]: person_off
              - generic [ref=f1e151]:
                - text: "9"
                - generic [ref=f1e153]:
                  - generic [ref=f1e154]: info
                  - text: Menunggu konfirmasi
          - generic [ref=f1e155]:
            - generic [ref=f1e157]:
              - generic [ref=f1e158]:
                - generic [ref=f1e159]:
                  - generic [ref=f1e160]:
                    - heading "Tren Kehadiran Mingguan" [level=2] [ref=f1e161]
                    - generic [ref=f1e162]: 93.9% Rata-rata
                  - generic [ref=f1e163]: Grafik komparasi rasio kehadiran tepat waktu dan keterlambatan pegawai
                - generic [ref=f1e164]:
                  - generic [ref=f1e165]:
                    - generic [ref=f1e166]: Hadir
                    - generic [ref=f1e168]: Terlambat
                  - generic [ref=f1e170]:
                    - button "7 Hari" [ref=f1e171] [cursor=pointer]
                    - button "30 Hari" [ref=f1e172] [cursor=pointer]
              - img "Grafik Kehadiran" [ref=f1e174]:
                - generic [ref=f1e175]: 100%
                - generic [ref=f1e176]: 75%
                - generic [ref=f1e177]: 50%
                - generic [ref=f1e178]: 0%
                - generic [ref=f1e179]: Sen
                - generic [ref=f1e183]: Sel
                - generic [ref=f1e187]: Rab
                - generic [ref=f1e191]: Kam
                - generic [ref=f1e195]: Jum
                - generic [ref=f1e199]: Sab
                - generic [ref=f1e205]: Min (Piket)
              - generic [ref=f1e206]:
                - generic [ref=f1e207]:
                  - generic [ref=f1e208]: verified
                  - text: "Kepatuhan masuk batas 07:30 (Sabtu):"
                - generic [ref=f1e209]: 0.0% (Tinggi)
            - generic [ref=f1e211]:
              - generic [ref=f1e212]:
                - generic [ref=f1e213]:
                  - generic [ref=f1e214]:
                    - heading "Ringkasan per Unit" [level=2] [ref=f1e215]
                    - paragraph [ref=f1e216]: Persentase kehadiran per unit kerja
                  - generic [ref=f1e217]: 4 Unit Terdaftar
                - generic [ref=f1e218]:
                  - generic [ref=f1e220]:
                    - generic [ref=f1e221]: TKIT Attin Sumbar
                    - generic [ref=f1e222]:
                      - generic [ref=f1e223]: 0/1 Hadir
                      - generic [ref=f1e224]: 0%
                  - generic [ref=f1e227]:
                    - generic [ref=f1e228]: SDIT Attin Sumbar
                    - generic [ref=f1e229]:
                      - generic [ref=f1e230]: 0/6 Hadir
                      - generic [ref=f1e231]: 0%
                  - generic [ref=f1e234]:
                    - generic [ref=f1e235]: SMPIT Attin Sumbar
                    - generic [ref=f1e236]:
                      - generic [ref=f1e237]: 0/1 Hadir
                      - generic [ref=f1e238]: 0%
                  - generic [ref=f1e241]:
                    - generic [ref=f1e242]: SMAIT Attin Sumbar
                    - generic [ref=f1e243]:
                      - generic [ref=f1e244]: 0/1 Hadir
                      - generic [ref=f1e245]: 0%
              - link "Lihat Rekap Lengkap Unit arrow_forward" [ref=f1e248] [cursor=pointer]:
                - /url: /rekap-dan-laporan
                - text: Lihat Rekap Lengkap Unit
                - generic [ref=f1e249]: arrow_forward
          - generic [ref=f1e250]:
            - generic [ref=f1e251]:
              - generic [ref=f1e252]:
                - heading "Aktivitas Presensi Terbaru" [level=2] [ref=f1e256]
                - generic [ref=f1e257]: Live Feed
              - generic [ref=f1e258]:
                - generic [ref=f1e259]:
                  - combobox [ref=f1e260] [cursor=pointer]:
                    - option "Semua Unit Sekolah" [selected]
                    - option "TKIT Attin Sumbar"
                    - option "SDIT Attin Sumbar"
                    - option "SMPIT Attin Sumbar"
                    - option "SMAIT Attin Sumbar"
                  - generic: expand_more
                - button "download Export CSV" [ref=f1e261] [cursor=pointer]:
                  - generic [ref=f1e262]: download
                  - generic [ref=f1e263]: Export CSV
            - table [ref=f1e265]:
              - rowgroup [ref=f1e266]:
                - row [ref=f1e267]:
                  - columnheader "Pegawai" [ref=f1e268]
                  - columnheader "Unit" [ref=f1e269]
                  - columnheader "Waktu Masuk" [ref=f1e270]
                  - columnheader "Lokasi / Geofence" [ref=f1e271]
                  - columnheader "Status" [ref=f1e272]
                  - columnheader "Aksi" [ref=f1e273]
              - rowgroup [ref=f1e274]:
                - row [ref=f1e275]:
                  - cell "Belum ada aktivitas presensi hari ini" [ref=f1e276]
            - generic [ref=f1e277]:
              - generic [ref=f1e279]:
                - text: Menampilkan
                - strong [ref=f1e280]: "0"
                - text: dari
                - strong [ref=f1e281]: "0"
                - text: pegawai presensi hari ini
              - link "Buka Monitoring Lengkap arrow_forward" [ref=f1e283] [cursor=pointer]:
                - /url: /presensi
                - generic [ref=f1e284]: Buka Monitoring Lengkap
                - generic [ref=f1e285]: arrow_forward
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
> 74  |       await expect(page.locator('h1, h2')).toContainText('Data Guru');
      |                                            ^ Error: expect(locator).toContainText(expected) failed
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
```