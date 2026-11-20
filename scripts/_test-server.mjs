// ============================================================================
// PEMUAT VITE UNTUK UJI SKRIP SSR
// ----------------------------------------------------------------------------
// Dipakai bersama oleh semua skrip scripts/test-*.mjs
//
// Alasan file ini ada: sejak Vite 8, module runner SSR meng-inline modul
// CommonJS secara bawaan. Akibatnya react dimuat dua kali: sekali oleh Node
// (dipakai react-dom/server) dan sekali oleh module runner. Dua salinan
// React itu tidak berbagi ReactSharedInternals, sehingga setiap pemanggilan
// hook di dalam komponen melempar "Invalid hook call".
//
// Memperlakukan React (dan router-nya) sebagai external membuat module runner
// memakai salinan React milik Node yang sama dengan react-dom/server.
// ============================================================================

import { createServer } from 'vite'

/** Paket yang harus tetap di luar (tidak di-inline) module runner SSR. */
export const SSR_EXTERNAL = [
  'react',
  'react-dom',
  'react-dom/server',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-router',
  'react-router-dom',
  'react-hot-toast',
]

/**
 * Buat server Vite untuk uji SSR.
 * @param {object} overrides opsi tambahan yang menimpa default
 */
export function createTestServer(overrides = {}) {
  return createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'silent',
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { external: [...SSR_EXTERNAL] },
    ...overrides,
  })
}

/**
 * Ambil renderToString dari dalam graf modul Vite.
 *
 * Penting: renderer harus dimuat lewat server yang sama dengan komponen yang
 * diuji. Kalau renderToString diambil dari import biasa di Node, React yang
 * dipakai renderer berbeda dari React yang dipakai komponen -> "Invalid hook
 * call" di setiap hook.
 *
 * @param {object} server server Vite dari createTestServer()
 */
export async function loadRender(server) {
  return server.ssrLoadModule('/scripts/_render-helper.js')
}

export default createTestServer
