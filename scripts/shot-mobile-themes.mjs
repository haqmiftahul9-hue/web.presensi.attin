/**
 * Masuk sebagai Kepala Sekolah (peran mobile), lalu ambil screenshot
 * halaman mobile di bawah setiap tema warna.
 *
 * Jalankan: node scripts/shot-mobile-themes.mjs [url]
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const URL_BASE = process.argv[2] || 'http://localhost:4173'
const OUT = path.resolve('tmp/theme-shots')
const THEMES = ['blue', 'green', 'rose', 'amber', 'purple', 'teal']
const PAGES = [
  { path: '/mobile/home', name: 'beranda' },
  { path: '/mobile/riwayat', name: 'riwayat' },
  { path: '/mobile/izin-cuti', name: 'izin' },
  { path: '/mobile/profil', name: 'profil' },
]

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\iif\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe',
})
const ctx = await browser.newContext({
  viewport: { width: 400, height: 860 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()

// 1. Masuk lewat form login sungguhan supaya sesi tersusun benar.
await page.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle' })
const idField = (await page.locator('#mobile-identifier').isVisible())
  ? '#mobile-identifier'
  : '#desktop-identifier'
const pwField = (await page.locator('#mobile-password').isVisible())
  ? '#mobile-password'
  : '#desktop-password'
await page.fill(idField, 'kepalasd')
await page.fill(pwField, 'KepalaSekolah@2026')
await page.locator('button[type="submit"]:visible').first().click()
await page.waitForTimeout(3000)
console.log('after login ->', page.url())

for (const theme of THEMES) {
  await page.evaluate((t) => {
    localStorage.setItem('simpres.colorTheme.v2', t)
    localStorage.setItem('simpres.colorTheme', t)
    document.documentElement.setAttribute('data-color-theme', t)
  }, theme)

  for (const p of PAGES) {
    await page.goto(`${URL_BASE}${p.path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await page.screenshot({ path: path.join(OUT, `${p.name}-${theme}.png`), fullPage: true })
  }
  console.log('shot', theme)
}

await browser.close()
console.log('done ->', OUT)
