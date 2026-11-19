/**
 * Screenshot tema mobile dalam mode gelap + portal desktop, untuk memeriksa
 * apakah token baru tetap serasi di luar mode terang.
 *
 * Jalankan: node scripts/shot-dark-desktop.mjs [url]
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const URL_BASE = process.argv[2] || 'http://localhost:4173'
const OUT = path.resolve('tmp/theme-shots')

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\iif\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe',
})

// --- Mobile dark ---
const ctx = await browser.newContext({
  viewport: { width: 400, height: 860 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
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

for (const theme of ['blue', 'rose', 'amber']) {
  await page.evaluate((t) => {
    localStorage.setItem('simpres.colorTheme.v2', t)
    localStorage.setItem('simpres.colorTheme', t)
    document.documentElement.setAttribute('data-color-theme', t)
    document.documentElement.classList.add('dark')
  }, theme)
  await page.goto(`${URL_BASE}/mobile/home`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, `dark-beranda-${theme}.png`), fullPage: true })
  console.log('dark shot', theme)
}
await ctx.close()

// --- Desktop ---
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const dpage = await dctx.newPage()
await dpage.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle' })
await dpage.fill('#desktop-identifier', 'adminsd1')
await dpage.fill('#desktop-password', 'SDit@2026')
await dpage.locator('button[type="submit"]:visible').first().click()
await dpage.waitForTimeout(3000)
for (const theme of ['blue', 'green', 'rose']) {
  await dpage.evaluate((t) => {
    localStorage.setItem('simpres.colorTheme.v2', t)
    localStorage.setItem('simpres.colorTheme', t)
    document.documentElement.setAttribute('data-color-theme', t)
  }, theme)
  await dpage.goto(`${URL_BASE}/dashboard`, { waitUntil: 'networkidle' })
  await dpage.waitForTimeout(1200)
  await dpage.screenshot({ path: path.join(OUT, `desktop-${theme}.png`) })
  console.log('desktop shot', theme)
}

await browser.close()
console.log('done')
