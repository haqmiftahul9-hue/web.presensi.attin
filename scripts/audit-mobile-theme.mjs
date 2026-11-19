/**
 * Audit komputasi gaya pada modul mobile: memeriksa apakah ada elemen yang
 * tetap biru/terang meski tema lain aktif, dan apakah ada permukaan putih
 * yang tidak berubah di mode gelap.
 *
 * Jalankan: node scripts/audit-mobile-theme.mjs [url]
 */
import { chromium } from 'playwright'

const URL_BASE = process.argv[2] || 'http://localhost:4173'
const THEMES = ['blue', 'green', 'rose', 'amber', 'purple', 'teal']
const PAGES = ['/mobile/home', '/mobile/riwayat', '/mobile/izin-cuti', '/mobile/profil']

const browser = await chromium.launch({
  executablePath:
    'C:\\Users\\iif\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe',
})
const ctx = await browser.newContext({
  viewport: { width: 400, height: 860 },
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

for (const dark of [false, true]) {
  for (const theme of THEMES) {
    await page.evaluate(
      ({ t, d }) => {
        localStorage.setItem('simpres.colorTheme.v2', t)
        localStorage.setItem('simpres.colorTheme', t)
        document.documentElement.setAttribute('data-color-theme', t)
        document.documentElement.classList.toggle('dark', d)
      },
      { t: theme, d: dark },
    )

    for (const p of PAGES) {
      await page.goto(`${URL_BASE}${p}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700)

      const report = await page.evaluate(() => {
        const out = { whiteSurfaces: [], hardBlue: [], lowContrast: [] }
        const seen = new Set()
        const el = document.querySelector('.sp-mobile-root')
        if (!el) return out

        const parseRGB = (s) => {
          const m = s.match(/rgba?\(([^)]+)\)/)
          if (!m) return null
          const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
          return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
        }
        // "Biru" = kanal biru dominan jauh di atas merah, dan warna itu mencolok.
        const isBlueish = (c) => c && c.b - c.r > 28 && c.b > 90

        for (const n of el.querySelectorAll('*')) {
          const cs = getComputedStyle(n)
          const bg = parseRGB(cs.backgroundColor)
          const fg = parseRGB(cs.color)
          const r = n.getBoundingClientRect()
          if (r.width < 4 || r.height < 4) continue

          // Permukaan putih solid di mode gelap -> belum di-theme.
          if (
            bg && bg.a > 0.85 && bg.r > 245 && bg.g > 245 && bg.b > 245 &&
            !n.closest('.sp-hero-card')
          ) {
            const key = n.className?.toString?.().slice(0, 90)
            if (!seen.has(key)) { seen.add(key); out.whiteSurfaces.push(key) }
          }

          // Warna biru HARD (bukan turunan tema) yang masih tersisa.
          if (bg && isBlueish(bg) && !n.closest('.sp-hero-card')) {
            const key = bg.r + ',' + bg.g + ',' + bg.b + ' @ ' + (n.className?.toString?.().slice(0, 70))
            if (!seen.has(key)) { seen.add(key); out.hardBlue.push(key) }
          }

          // Teks kecil dengan kontras rendah terhadap latar efektif.
          if (fg && n.childNodes.length === 1 && n.firstChild?.nodeType === 3) {
            const size = parseFloat(cs.fontSize)
            const weight = parseInt(cs.fontWeight, 10) || 400
            const big = size >= 24 || (size >= 18.66 && weight >= 700)
            const lum = (c) => {
              const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
              return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
            }
            // Latar efektif: cari elemen induk pertama dengan latar non-transparan.
            let p = n, bgEff = null
            while (p && p !== document.body) {
              const c = parseRGB(getComputedStyle(p).backgroundColor)
              if (c && c.a > 0.5) { bgEff = c; break }
              p = p.parentElement
            }
            if (bgEff) {
              const l1 = lum(fg), l2 = lum(bgEff)
              const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
              const min = big ? 3 : 4.5
              if (ratio < min) {
                const txt = (n.textContent || '').trim().slice(0, 28)
                if (txt) {
                  const key = `${ratio.toFixed(2)}:1 "${txt}"`
                  if (!seen.has(key)) { seen.add(key); out.lowContrast.push(key) }
                }
              }
            }
          }
        }
        return out
      })

      const mode = dark ? 'dark' : 'light'
      const tag = `${mode}/${theme}${p}`
      if (report.whiteSurfaces.length) {
        console.log(`\n[WHITE-SURFACE] ${tag}`)
        report.whiteSurfaces.slice(0, 4).forEach((s) => console.log('   ', s))
      }
      if (report.hardBlue.length) {
        console.log(`[HARD-BLUE] ${tag}`)
        report.hardBlue.slice(0, 4).forEach((s) => console.log('   ', s))
      }
      if (report.lowContrast.length) {
        console.log(`[LOW-CONTRAST] ${tag}`)
        report.lowContrast.slice(0, 6).forEach((s) => console.log('   ', s))
      }
    }
  }
}

await browser.close()
console.log('\naudit selesai')
