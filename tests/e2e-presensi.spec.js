// ============================================================================
// PLAYWRIGHT E2E TEST - SIMPEG ATTIN SISTEM PRESENSI
// Menguji semua role: Superadmin, Admin Unit, Guru/Pegawai, Kepala Sekolah
// ============================================================================

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

// Kredensial test dari seed.js
const CREDENTIALS = {
  superadmin: { identifier: 'superadmin', password: 'superadmin1234!', role: 'Superadmin' },
  adminSD: { identifier: 'adminsd1', password: 'SDit@2026', role: 'Admin Unit', unit: 'SD' },
  guruSD: { identifier: '049097021', password: 'Attin123!', role: 'Guru', unit: 'SD' },
  kepalaSD: { identifier: 'kepalasd', password: 'KepalaSekolah@2026', role: 'Kepala Sekolah', unit: 'SD' },
};

async function login(page, creds) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="text"], input[name="identifier"]', creds.identifier);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

test.describe('SIMPEG Attin - Sistem Presensi E2E', () => {

  // ========== LOGIN TESTS ==========
  test.describe('Login - Semua Role', () => {
    test('Superadmin login berhasil', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('h1')).toContainText('SimPres');
    });

    test('Admin Unit login berhasil', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('Guru login - dialihkan ke mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
    });

    test('Kepala Sekolah login - dialihkan ke mobile', async ({ page }) => {
      await login(page, CREDENTIALS.kepalaSD);
      await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
    });

    test('Login gagal dengan password salah', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="text"]', CREDENTIALS.superadmin.identifier);
      await page.fill('input[type="password"]', 'passwordsalah');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await expect(page.locator('.text-rose-600, .text-red-600, [role="alert"]')).toBeVisible();
    });
  });

  // ========== SUPERADMIN DESKTOP TESTS ==========
  test.describe('Superadmin Desktop - Dashboard & Manajemen', () => {
    test('Dashboard menampilkan KPI cards', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await expect(page.locator('text=Sudah Presensi')).toBeVisible();
      await expect(page.locator('text=Terlambat Hari Ini')).toBeVisible();
      await expect(page.locator('text=Belum Presensi')).toBeVisible();
    });

    test('Navigasi ke Data Guru/Pegawai', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Data Guru"), [href="/data-guru-dan-pegawai"]');
      await page.waitForURL(`${BASE_URL}/data-guru-dan-pegawai`);
      await expect(page.locator('h1, h2')).toContainText('Data Guru');
    });

    test('Navigasi ke Manajemen Admin & User', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Manajemen Admin"), [href="/manajemen-admin-user"]');
      await page.waitForURL(`${BASE_URL}/manajemen-admin-user`);
    });

    test('Navigasi ke Pengaturan Global', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Pengaturan"), [href="/pengaturan-global"]');
      await page.waitForURL(`${BASE_URL}/pengaturan-global`);
    });

    test('Navigasi ke Monitoring Presensi', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Monitoring"), [href="/presensi"]');
      await page.waitForURL(`${BASE_URL}/presensi`);
      await expect(page.locator('text=Monitoring Presensi')).toBeVisible();
    });

    test('Navigasi ke Rekap & Laporan', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Rekap"), [href="/rekap-dan-laporan"]');
      await page.waitForURL(`${BASE_URL}/rekap-dan-laporan`);
    });

    test('Navigasi ke Pengajuan Izin/Cuti', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Izin"), [href="/pengajuan-izin-dan-cuti"]');
      await page.waitForURL(`${BASE_URL}/pengajuan-izin-dan-cuti`);
    });

    test('Navigasi ke Log Aktivitas', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Log Aktivitas"), [href="/log-aktivitas"]');
      await page.waitForURL(`${BASE_URL}/log-aktivitas`);
    });

    test('Navigasi ke Cetak Kartu ID', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Kartu ID"), [href="/cetak-kartu-id"]');
      await page.waitForURL(`${BASE_URL}/cetak-kartu-id`);
    });

    test('Navigasi ke Ranking Kehadiran', async ({ page }) => {
      await login(page, CREDENTIALS.superadmin);
      await page.click('a:has-text("Ranking"), [href="/ranking-kehadiran"]');
      await page.waitForURL(`${BASE_URL}/ranking-kehadiran`);
    });
  });

  // ========== ADMIN UNIT DESKTOP TESTS ==========
  test.describe('Admin Unit Desktop - Terkunci ke Unit', () => {
    test('Admin Unit dapat mengakses dashboard', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('h1')).toContainText('SimPres');
    });

    test('Admin Unit tidak dapat mengakses Pengaturan Global (403)', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await page.goto(`${BASE_URL}/pengaturan-global`);
      await page.waitForTimeout(2000);
      await expect(page.url()).toContain('/403');
    });

    test('Admin Unit dapat mengakses Data Guru/Pegawai unitnya', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await page.click('a:has-text("Data Guru"), [href="/data-guru-dan-pegawai"]');
      await page.waitForURL(`${BASE_URL}/data-guru-dan-pegawai`);
    });

    test('Admin Unit dapat mengakses Monitoring Presensi', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await page.click('a:has-text("Monitoring"), [href="/presensi"]');
      await page.waitForURL(`${BASE_URL}/presensi`);
    });
  });

  // ========== GURU MOBILE TESTS ==========
  test.describe('Guru Mobile - Presensi & Profil', () => {
    test('Mobile Beranda menampilkan data pegawai', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await expect(page).toHaveURL(`${BASE_URL}/mobile/home`);
      await expect(page.locator('text=Presensi Hari Ini')).toBeVisible();
      await expect(page.locator('text=Bustanul Abidin')).toBeVisible();
    });

    test('Navigasi ke Presensi Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Presensi Sekarang"), [href="/mobile/presensi"]');
      await page.waitForURL(`${BASE_URL}/mobile/presensi`);
      await expect(page.locator('text=Status Sensor')).toBeVisible();
    });

    test('Navigasi ke Riwayat Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Riwayat Presensi"), [href="/mobile/riwayat"]');
      await page.waitForURL(`${BASE_URL}/mobile/riwayat`);
      await expect(page.locator('text=Riwayat Kehadiran')).toBeVisible();
    });

    test('Navigasi ke Slip Kehadiran', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Slip Kehadiran"), [href="/mobile/slip"]');
      await page.waitForURL(`${BASE_URL}/mobile/slip`);
      await expect(page.locator('text=Slip Kehadiran')).toBeVisible();
    });

    test('Navigasi ke Izin & Cuti Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Pengajuan Izin/Cuti"), [href="/mobile/izin-cuti"]');
      await page.waitForURL(`${BASE_URL}/mobile/izin-cuti`);
      await expect(page.locator('text=Izin & Cuti')).toBeVisible();
    });

    test('Navigasi ke Kartu ID Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Kartu ID"), [href="/mobile/kartu-id"]');
      await page.waitForURL(`${BASE_URL}/mobile/kartu-id`);
    });

    test('Navigasi ke QR Presensi Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("QR Presensi"), [href="/mobile/qr"]');
      await page.waitForURL(`${BASE_URL}/mobile/qr`);
    });

    test('Navigasi ke Profil Mobile', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Profil"), [href="/mobile/profil"]');
      await page.waitForURL(`${BASE_URL}/mobile/profil`);
      await expect(page.locator('text=Profil Pegawai')).toBeVisible();
    });
  });

  // ========== KEPALA SEKOLAH MOBILE TESTS ==========
  test.describe('Kepala Sekolah Mobile - Persetujuan Izin', () => {
    test('Kepala Sekolah dapat mengakses Persetujuan Izin', async ({ page }) => {
      await login(page, CREDENTIALS.kepalaSD);
      await page.click('a:has-text("Persetujuan"), [href="/mobile/persetujuan-izin"]');
      await page.waitForURL(`${BASE_URL}/mobile/persetujuan-izin`);
    });

    test('Kepala Sekolah dapat mengakses Profil', async ({ page }) => {
      await login(page, CREDENTIALS.kepalaSD);
      await page.click('a:has-text("Profil"), [href="/mobile/profil"]');
      await page.waitForURL(`${BASE_URL}/mobile/profil`);
    });
  });

  // ========== PRESENSI ALUR DATA TESTS ==========
  test.describe('Alur Data Presensi - End to End', () => {
    test('Guru melakukan presensi masuk via Face Recognition', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Presensi Sekarang"), [href="/mobile/presensi"]');
      await page.waitForURL(`${BASE_URL}/mobile/presensi`);
      
      const presensiButton = page.locator('button:has-text("Ambil Presensi Sekarang")');
      if (await presensiButton.isVisible({ timeout: 5000 })) {
        await presensiButton.click();
        await page.waitForTimeout(3000);
        await expect(page.locator('text=Presensi Berhasil, text=Disimpan Offline')).toBeVisible({ timeout: 10000 });
      }
    });

    test('Guru melakukan presensi pulang', async ({ page }) => {
      await login(page, CREDENTIALS.guruSD);
      await page.click('a:has-text("Presensi Sekarang"), [href="/mobile/presensi"]');
      await page.waitForURL(`${BASE_URL}/mobile/presensi`);
      
      const pulangButton = page.locator('button:has-text("Absen Pulang Sekarang")');
      if (await pulangButton.isVisible({ timeout: 5000 })) {
        await pulangButton.click();
        await page.waitForTimeout(3000);
        await expect(page.locator('text=Absen Pulang Tercatat, text=Disimpan Offline')).toBeVisible({ timeout: 10000 });
      }
    });

    test('Admin Kiosk scan presensi halaman', async ({ page }) => {
      await login(page, CREDENTIALS.adminSD);
      await page.click('a:has-text("Presensi"), [href="/presensi-scan"]');
      await page.waitForURL(`${BASE_URL}/presensi-scan`);
      await expect(page.locator('text=Scan Presensi')).toBeVisible();
    });
  });

  // ========== ERROR HANDLING ==========
  test.describe('Error Handling & Edge Cases', () => {
    test('Halaman 403 accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/403`);
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Akses Ditolak, text=403')).toBeVisible();
    });
  });
});
