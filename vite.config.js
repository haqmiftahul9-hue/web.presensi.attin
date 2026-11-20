import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

process.on('SIGINT', () => process.exit(0))

/**
 * Plugin untuk memastikan Service Worker (PWA) dan berkas cache selalu diperbarui
 * secara otomatis setiap kali ada proses build baru. Hal ini mencegah pengguna mobile
 * atau pintasan PWA terjebak di cache lama tanpa harus menghapus situs dari peramban.
 */
function pwaVersionPlugin() {
  const buildVersion = `${Date.now()}`
  const buildTime = new Date().toISOString()

  return {
    name: 'pwa-version-plugin',
    config(config, { command }) {
      return {
        define: {
          __APP_VERSION__: JSON.stringify(command === 'build' ? buildVersion : 'dev'),
          __BUILD_TIME__: JSON.stringify(buildTime),
        },
      }
    },
    buildStart() {
      const versionData = JSON.stringify({ version: buildVersion, buildTime }, null, 2)
      try {
        fs.writeFileSync(path.resolve('public/version.json'), versionData, 'utf8')
      } catch (err) {
        console.warn('[pwaVersionPlugin] Gagal menulis public/version.json:', err?.message || err)
      }
    },
    closeBundle() {
      const distVersionPath = path.resolve('dist/version.json')
      const distSwPath = path.resolve('dist/sw.js')
      const versionData = JSON.stringify({ version: buildVersion, buildTime }, null, 2)

      try {
        fs.writeFileSync(distVersionPath, versionData, 'utf8')
      } catch (err) {
        console.warn('[pwaVersionPlugin] Gagal menulis dist/version.json:', err?.message || err)
      }

      if (fs.existsSync(distSwPath)) {
        try {
          let swContent = fs.readFileSync(distSwPath, 'utf8')
          swContent = swContent.replace(
            /const SW_VERSION = ['"][^'"]+['"]/,
            `const SW_VERSION = "${buildVersion}"`
          )
          fs.writeFileSync(distSwPath, swContent, 'utf8')
          console.log(`[pwaVersionPlugin] Berhasil memperbarui dist/sw.js ke versi: ${buildVersion}`)
        } catch (err) {
          console.warn('[pwaVersionPlugin] Gagal memperbarui dist/sw.js:', err?.message || err)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), pwaVersionPlugin()],
  server: {
    port: 5173,
    strictPort: false,
  },
  appType: 'spa',
})
