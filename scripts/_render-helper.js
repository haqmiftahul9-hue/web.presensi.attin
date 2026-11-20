// ============================================================================
// PENYEDIA RENDER UNTUK UJI SSR
// ----------------------------------------------------------------------------
// react-dom/server harus dijalankan di konteks yang sama dengan modul yang
// dimuat lewat Vite (src/**). Kalau renderToString diambil langsung dari
// Node, modul runner Vite memuat salinan React sendiri sehingga setiap hook
// di dalam komponen melempar "Invalid hook call".
//
// Modul ini dimuat lewat server.ssrLoadModule(), sehingga react dan
// react-dom/server-nya hidup di konteks yang sama dengan komponen uji.
// Elemen React tetap aman lintas konteks karena tipe elemen memakai
// Symbol.for('react.element').
// ============================================================================

import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

export { renderToString, createElement, MemoryRouter }
export default renderToString
