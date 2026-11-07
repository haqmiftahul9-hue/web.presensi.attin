# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-presensi.spec.js >> SIMPEG Attin - Sistem Presensi E2E >> Admin Unit Desktop - Terkunci ke Unit >> Admin Unit tidak dapat mengakses Pengaturan Global (403)
- Location: tests\e2e-presensi.spec.js:135:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/403"
Received string:    "http://localhost:5174/dashboard"
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - complementary [ref=f2e4]:
    - generic [ref=f2e5]:
      - generic [ref=f2e7]:
        - img "SIMPEG" [ref=f2e9]
        - generic [ref=f2e10]:
          - generic [ref=f2e11]: SIMPEG
          - generic [ref=f2e12]: Multi-Unit System
      - generic [ref=f2e15]:
        - generic [ref=f2e16]:
          - generic [ref=f2e17]: domain
          - generic [ref=f2e18]:
            - generic [ref=f2e19]: Unit Terpilih
            - generic [ref=f2e20]: SDIT Attin Sumbar
        - generic [ref=f2e21]: lock
      - generic [ref=f2e22]: Navigasi Utama
      - navigation [ref=f2e23]:
        - link "dashboard Dashboard" [ref=f2e24] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=f2e25]: dashboard
          - generic [ref=f2e26]: Dashboard
        - link "badge Data Guru/Pegawai" [ref=f2e27] [cursor=pointer]:
          - /url: /data-guru-dan-pegawai
          - generic [ref=f2e28]: badge
          - generic [ref=f2e29]: Data Guru/Pegawai
        - link "contact_page Cetak Kartu ID" [ref=f2e30] [cursor=pointer]:
          - /url: /cetak-kartu-id
          - generic [ref=f2e31]: contact_page
          - generic [ref=f2e32]: Cetak Kartu ID
        - link "timer Presensi" [ref=f2e33] [cursor=pointer]:
          - /url: /presensi
          - generic [ref=f2e34]: timer
          - generic [ref=f2e35]: Presensi
        - link "qr_code_scanner Scan Presensi (Kios)" [ref=f2e36] [cursor=pointer]:
          - /url: /presensi-scan
          - generic [ref=f2e37]: qr_code_scanner
          - generic [ref=f2e38]: Scan Presensi (Kios)
        - link "summarize Rekap & Laporan" [ref=f2e39] [cursor=pointer]:
          - /url: /rekap-dan-laporan
          - generic [ref=f2e40]: summarize
          - generic [ref=f2e41]: Rekap & Laporan
        - link "leaderboard Ranking Kehadiran" [ref=f2e42] [cursor=pointer]:
          - /url: /ranking-kehadiran
          - generic [ref=f2e43]: leaderboard
          - generic [ref=f2e44]: Ranking Kehadiran
        - link "event_available Pengajuan Izin/Cuti" [ref=f2e45] [cursor=pointer]:
          - /url: /pengajuan-izin-dan-cuti
          - generic [ref=f2e46]: event_available
          - generic [ref=f2e47]: Pengajuan Izin/Cuti
        - link "history Log Aktivitas" [ref=f2e48] [cursor=pointer]:
          - /url: /log-aktivitas
          - generic [ref=f2e49]: history
          - generic [ref=f2e50]: Log Aktivitas
    - generic [ref=f2e52]:
      - generic [ref=f2e53]: shield_person
      - generic [ref=f2e55]:
        - generic "Admin SD Unit 1" [ref=f2e56]
        - generic "adminsd1@simpres.sch.id" [ref=f2e57]: adminsd1
        - generic [ref=f2e58]: Admin Unit
      - button "Menu pengguna" [ref=f2e61] [cursor=pointer]:
        - generic [ref=f2e62]: more_vert
  - generic [ref=f2e63]:
    - banner [ref=f2e64]:
      - generic [ref=f2e66]:
        - generic: search
        - searchbox "Cari pegawai, NIY, atau data presensi" [ref=f2e67]
        - generic: /
      - generic [ref=f2e68]:
        - button "Pesan" [ref=f2e69] [cursor=pointer]:
          - generic [ref=f2e70]: chat
        - button "Notifikasi" [ref=f2e72] [cursor=pointer]:
          - generic [ref=f2e73]: notifications
        - generic [ref=f2e76]:
          - img "SIMPEG" [ref=f2e77]
          - generic [ref=f2e78]:
            - generic [ref=f2e79]: SIMPEG
            - generic [ref=f2e80]: SDIT Attin Sumbar
      - generic [ref=f2e81]: Admin SD Unit 1
    - main [ref=f2e82]:
      - generic [ref=f2e84]:
        - generic [ref=f2e85]:
          - generic [ref=f2e86]:
            - img "SIMPEG" [ref=f2e88]
            - generic [ref=f2e89]:
              - generic [ref=f2e90]:
                - heading "SIMPEG" [level=1] [ref=f2e91]
                - generic [ref=f2e92]: Admin Unit
              - paragraph [ref=f2e93]: Sistem Presensi Kepegawaian Terpadu
          - generic [ref=f2e94]:
            - generic [ref=f2e95]:
              - generic [ref=f2e96]: domain
              - generic [ref=f2e97]: SDIT Attin Sumbar
            - generic [ref=f2e98]: Sabtu, 7 November 2026 • 17:59 WIB
        - generic [ref=f2e103]:
          - generic [ref=f2e104]:
            - generic [ref=f2e105]:
              - generic [ref=f2e106]: Total Pegawai
              - generic [ref=f2e107]: groups
            - generic [ref=f2e109]:
              - text: "6"
              - generic [ref=f2e111]:
                - generic [ref=f2e112]: arrow_upward
                - text: +4 staf baru bulan ini
          - generic [ref=f2e113]:
            - generic [ref=f2e114]:
              - generic [ref=f2e115]: Hadir Hari Ini
              - generic [ref=f2e116]: check_circle
            - generic [ref=f2e118]:
              - text: "0"
              - generic [ref=f2e119]: 0.0% tingkat kehadiran
          - generic [ref=f2e122]:
            - generic [ref=f2e123]:
              - generic [ref=f2e124]: Terlambat
              - generic [ref=f2e125]: schedule
            - generic [ref=f2e127]:
              - text: "0"
              - generic [ref=f2e129]:
                - generic [ref=f2e130]: timer
                - text: Rata-rata 0 menit
          - generic [ref=f2e131]:
            - generic [ref=f2e132]:
              - generic [ref=f2e133]: Alpha / Belum
              - generic [ref=f2e134]: person_off
            - generic [ref=f2e136]:
              - text: "6"
              - generic [ref=f2e138]:
                - generic [ref=f2e139]: info
                - text: Menunggu konfirmasi
        - generic [ref=f2e140]:
          - generic [ref=f2e142]:
            - generic [ref=f2e143]:
              - generic [ref=f2e144]:
                - generic [ref=f2e145]:
                  - heading "Tren Kehadiran Mingguan" [level=2] [ref=f2e146]
                  - generic [ref=f2e147]: 93.9% Rata-rata
                - generic [ref=f2e148]: Grafik komparasi rasio kehadiran tepat waktu dan keterlambatan pegawai
              - generic [ref=f2e149]:
                - generic [ref=f2e150]:
                  - generic [ref=f2e151]: Hadir
                  - generic [ref=f2e153]: Terlambat
                - generic [ref=f2e155]:
                  - button "7 Hari" [ref=f2e156] [cursor=pointer]
                  - button "30 Hari" [ref=f2e157] [cursor=pointer]
            - img "Grafik Kehadiran" [ref=f2e159]:
              - generic [ref=f2e160]: 100%
              - generic [ref=f2e161]: 75%
              - generic [ref=f2e162]: 50%
              - generic [ref=f2e163]: 0%
              - generic [ref=f2e164]: Sen
              - generic [ref=f2e168]: Sel
              - generic [ref=f2e172]: Rab
              - generic [ref=f2e176]: Kam
              - generic [ref=f2e180]: Jum
              - generic [ref=f2e184]: Sab
              - generic [ref=f2e190]: Min (Piket)
            - generic [ref=f2e191]:
              - generic [ref=f2e192]:
                - generic [ref=f2e193]: verified
                - text: "Kepatuhan masuk batas 07:30 (Sabtu):"
              - generic [ref=f2e194]: 0.0% (Tinggi)
          - generic [ref=f2e196]:
            - generic [ref=f2e197]:
              - generic [ref=f2e198]:
                - generic [ref=f2e199]:
                  - heading "Ringkasan per Unit" [level=2] [ref=f2e200]
                  - paragraph [ref=f2e201]: Persentase kehadiran per unit kerja
                - generic [ref=f2e202]: 1 Unit Terpilih
              - generic [ref=f2e205]:
                - generic [ref=f2e206]: SDIT Attin Sumbar
                - generic [ref=f2e207]:
                  - generic [ref=f2e208]: 0/6 Hadir
                  - generic [ref=f2e209]: 0%
            - link "Lihat Rekap Lengkap Unit arrow_forward" [ref=f2e212] [cursor=pointer]:
              - /url: /rekap-dan-laporan
              - text: Lihat Rekap Lengkap Unit
              - generic [ref=f2e213]: arrow_forward
        - generic [ref=f2e214]:
          - generic [ref=f2e215]:
            - generic [ref=f2e216]:
              - heading "Aktivitas Presensi Terbaru" [level=2] [ref=f2e220]
              - generic [ref=f2e221]: Live Feed
            - generic [ref=f2e222]:
              - generic [ref=f2e223]:
                - combobox [ref=f2e224] [cursor=pointer]:
                  - option "Semua Unit Sekolah" [selected]
                  - option "TKIT Attin Sumbar"
                  - option "SDIT Attin Sumbar"
                  - option "SMPIT Attin Sumbar"
                  - option "SMAIT Attin Sumbar"
                - generic: expand_more
              - button "download Export CSV" [ref=f2e225] [cursor=pointer]:
                - generic [ref=f2e226]: download
                - generic [ref=f2e227]: Export CSV
          - table [ref=f2e229]:
            - rowgroup [ref=f2e230]:
              - row [ref=f2e231]:
                - columnheader "Pegawai" [ref=f2e232]
                - columnheader "Unit" [ref=f2e233]
                - columnheader "Waktu Masuk" [ref=f2e234]
                - columnheader "Lokasi / Geofence" [ref=f2e235]
                - columnheader "Status" [ref=f2e236]
                - columnheader "Aksi" [ref=f2e237]
            - rowgroup [ref=f2e238]:
              - row [ref=f2e239]:
                - cell "Belum ada aktivitas presensi hari ini" [ref=f2e240]
          - generic [ref=f2e241]:
            - generic [ref=f2e243]:
              - text: Menampilkan
              - strong [ref=f2e244]: "0"
              - text: dari
              - strong [ref=f2e245]: "0"
              - text: pegawai presensi hari ini
            - link "Buka Monitoring Lengkap arrow_forward" [ref=f2e247] [cursor=pointer]:
              - /url: /presensi
              - generic [ref=f2e248]: Buka Monitoring Lengkap
              - generic [ref=f2e249]: arrow_forward
```

# Test source

```ts
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
  133 |     });
  134 | 
  135 |     test('Admin Unit tidak dapat mengakses Pengaturan Global (403)', async ({ page }) => {
  136 |       await login(page, CREDENTIALS.adminSD);
  137 |       await page.goto(`${BASE_URL}/pengaturan-global`);
  138 |       await page.waitForTimeout(2000);
> 139 |       await expect(page.url()).toContain('/403');
      |                                ^ Error: expect(received).toContain(expected) // indexOf
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
  186 |       await login(page, CREDENTIALS.guruSD);
  187 |       await page.click('a:has-text("Pengajuan Izin/Cuti"), [href="/mobile/izin-cuti"]');
  188 |       await page.waitForURL(`${BASE_URL}/mobile/izin-cuti`);
  189 |       await expect(page.locator('text=Izin & Cuti')).toBeVisible();
  190 |     });
  191 | 
  192 |     test('Navigasi ke Kartu ID Mobile', async ({ page }) => {
  193 |       await login(page, CREDENTIALS.guruSD);
  194 |       await page.click('a:has-text("Kartu ID"), [href="/mobile/kartu-id"]');
  195 |       await page.waitForURL(`${BASE_URL}/mobile/kartu-id`);
  196 |     });
  197 | 
  198 |     test('Navigasi ke QR Presensi Mobile', async ({ page }) => {
  199 |       await login(page, CREDENTIALS.guruSD);
  200 |       await page.click('a:has-text("QR Presensi"), [href="/mobile/qr"]');
  201 |       await page.waitForURL(`${BASE_URL}/mobile/qr`);
  202 |     });
  203 | 
  204 |     test('Navigasi ke Profil Mobile', async ({ page }) => {
  205 |       await login(page, CREDENTIALS.guruSD);
  206 |       await page.click('a:has-text("Profil"), [href="/mobile/profil"]');
  207 |       await page.waitForURL(`${BASE_URL}/mobile/profil`);
  208 |       await expect(page.locator('text=Profil Pegawai')).toBeVisible();
  209 |     });
  210 |   });
  211 | 
  212 |   // ========== KEPALA SEKOLAH MOBILE TESTS ==========
  213 |   test.describe('Kepala Sekolah Mobile - Persetujuan Izin', () => {
  214 |     test('Kepala Sekolah dapat mengakses Persetujuan Izin', async ({ page }) => {
  215 |       await login(page, CREDENTIALS.kepalaSD);
  216 |       await page.click('a:has-text("Persetujuan"), [href="/mobile/persetujuan-izin"]');
  217 |       await page.waitForURL(`${BASE_URL}/mobile/persetujuan-izin`);
  218 |     });
  219 | 
  220 |     test('Kepala Sekolah dapat mengakses Profil', async ({ page }) => {
  221 |       await login(page, CREDENTIALS.kepalaSD);
  222 |       await page.click('a:has-text("Profil"), [href="/mobile/profil"]');
  223 |       await page.waitForURL(`${BASE_URL}/mobile/profil`);
  224 |     });
  225 |   });
  226 | 
  227 |   // ========== PRESENSI ALUR DATA TESTS ==========
  228 |   test.describe('Alur Data Presensi - End to End', () => {
  229 |     test('Guru melakukan presensi masuk via Face Recognition', async ({ page }) => {
  230 |       await login(page, CREDENTIALS.guruSD);
  231 |       await page.click('a:has-text("Presensi Sekarang"), [href="/mobile/presensi"]');
  232 |       await page.waitForURL(`${BASE_URL}/mobile/presensi`);
  233 |       
  234 |       const presensiButton = page.locator('button:has-text("Ambil Presensi Sekarang")');
  235 |       if (await presensiButton.isVisible({ timeout: 5000 })) {
  236 |         await presensiButton.click();
  237 |         await page.waitForTimeout(3000);
  238 |         await expect(page.locator('text=Presensi Berhasil, text=Disimpan Offline')).toBeVisible({ timeout: 10000 });
  239 |       }
```