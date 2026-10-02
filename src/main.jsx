import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SimPresProvider } from './store/simPresStore.jsx'
import { registerServiceWorker } from './pwa/registerServiceWorker.js'
import { watchSymbolFont } from './pwa/watchSymbolFont.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimPresProvider>
      <App />
    </SimPresProvider>
  </React.StrictMode>,
)

// PWA: service worker untuk offline + installability modul mobile.
registerServiceWorker()

// Jaring pengaman ikon: modul mobile memakai SVG, halaman portal memakai font
// ikon. Bila font itu gagal dimuat, nama ikon disembunyikan agar tidak muncul
// sebagai tulisan di layar.
watchSymbolFont()