import { chromium } from 'playwright'
const URL_BASE = process.argv[2] || 'http://localhost:4173'
const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\iif\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe',
})
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, isMobile: true })
const page = await ctx.newPage()
await page.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('#mobile-identifier', 'kepalasd')
await page.fill('#mobile-password', 'KepalaSekolah@2026')
await page.locator('button[type="submit"]:visible').first().click()
await page.waitForTimeout(3000)

await page.evaluate(() => {
  localStorage.setItem('simpres.colorTheme.v2', 'teal')
  document.documentElement.setAttribute('data-color-theme', 'teal')
  document.documentElement.classList.add('dark')
})
await page.goto(`${URL_BASE}/mobile/profil`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const info = await page.evaluate(() => {
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const card = document.querySelector('.sp-card')
  const frame = document.querySelector('.sp-mobile-device-frame')
  const whiteBtn = document.querySelector('.bg-white')
  return {
    darkClass: root.className,
    dataTheme: root.getAttribute('data-color-theme'),
    varCard: cs.getPropertyValue('--card').trim(),
    varSpSurface: cs.getPropertyValue('--sp-surface').trim(),
    varBackground: cs.getPropertyValue('--background').trim(),
    varPrimary: cs.getPropertyValue('--primary').trim(),
    cardBg: card ? getComputedStyle(card).backgroundColor : null,
    frameBg: frame ? getComputedStyle(frame).backgroundColor : null,
    whiteBtnBg: whiteBtn ? getComputedStyle(whiteBtn).backgroundColor : null,
    whiteBtnClass: whiteBtn ? whiteBtn.className.slice(0, 80) : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
