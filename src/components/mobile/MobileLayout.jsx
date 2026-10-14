import { useEffect } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import Icon from '../Icon.jsx'
import {
  useSimPres, selectSelfStaff, selectAppMode, selectAppHomePath, MODE_MOBILE,
} from '../../store/simPresStore.jsx'
import MobileErrorBoundary from './MobileErrorBoundary.jsx'
import InstallPrompt from './InstallPrompt.jsx'
import { GlassTopBar, MobileAppShell } from './AppShell.jsx'

// Bottom navigation modul mobile. Empat menu ini adalah seluruh navigasi
// role Guru/Pegawai; tidak ada sidebar dan tidak ada tautan ke portal desktop.
const NAV_ITEMS = [
  { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
  { to: '/mobile/presensi', label: 'Presensi', icon: 'face_retouch_natural' },
  { to: '/mobile/riwayat', label: 'Riwayat', icon: 'calendar_month' },
  { to: '/mobile/profil', label: 'Profil', icon: 'person' },
]

/**
 * Kerangka aplikasi mobile untuk role Guru/Pegawai: device shell, bar atas
 * melayang di dalam hero, konten yang bisa digulir, dan bottom navigation
 * berupa kartu putih melayang.
 *
 * Seluruh modul dibungkus `MobileAppShell` sehingga lebarnya berhenti di
 * 430px: di desktop ia tampil sebagai pratinjau perangkat di tengah layar,
 * sedangkan di HP (<=430px) shell melar mengikuti layar. Karena itu bottom
 * navigation memakai `position: absolute` terhadap kolom aplikasi — kalau
 * `fixed`, ia akan melebar mengikuti viewport laptop dan keluar dari shell.
 *
 * Role portal yang membuka path /mobile/* dialihkan ke beranda desktop-nya di
 * sini, jadi tidak mungkin ada dua bentuk aplikasi yang tampil bersamaan.
 */
function MobileLayout() {
  const { state } = useSimPres()
  const location = useLocation()

  // Setiap kali berpindah tab, halaman dimulai dari atas — perilaku yang
  // familier di aplikasi native, bukan menyisakan posisi scroll lama.
  useEffect(() => {
    const isi = document.querySelector('[data-mobile-scroll]')
    if (isi) isi.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (selectAppMode(state) !== MODE_MOBILE) {
    return <Navigate to={selectAppHomePath(state)} replace />
  }

  return (
    <MobileAppShell>
      {/* Kolom aplikasi: mengisi tinggi shell, jadi bottom navigation dan
          bar atas selalu terlihat tanpa keluar dari bingkai perangkat. */}
      <div className="sp-mobile-column text-body-md text-on-surface">
        {/* Bar atas melayang di atas konten (bukan ikut flow), jadi konten
            menyisakan ruang lewat `pt-16` pada `main` di bawah. Transparan-glass
            karena hero setiap halaman berwarna gelap, jadi kontrasnya selalu aman. */}
        <header className="sp-mobile-header sp-hide-print pt-safe">
          <GlassTopBar staff={selectSelfStaff(state)} />
        </header>

        {/* Konten: satu-satunya wadah scroll di dalam shell.
            - `pt-16`: ruang untuk bar atas yang melayang (64px), ditambah
              tinggi notch/status bar yang ditambahkan `.sp-mobile-main` dari CSS.
            - `padding-bottom` safe-area handled CSS.
            - Spacer `sp-nav-space` di akhir konten menyisakan ruang agar kartu
              navigasi tidak menutupi baris terakhir dan halaman tetap bisa
              digulir sampai paling bawah. */}
        <main data-mobile-scroll className="sp-mobile-main pt-16">
          <MobileErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </MobileErrorBoundary>
          <div className="sp-nav-space" aria-hidden="true" />
        </main>

        {/* Navigasi bawah: mengambang 16px dari tepi shell, tinggi 76px,
            radius 24px. Isinya satu baris horizontal (sp-nav-row) berisi
            empat menu — tidak pernah menumpuk ke bawah. */}
        <nav className="sp-mobile-nav sp-hide-print sp-nav-float" aria-label="Navigasi utama">
          <div className="sp-nav-row">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-path={item.to}
                className="sp-nav-float-item"
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      name={item.icon}
                      className={`text-[22px] ${isActive ? 'text-white' : 'text-on-surface-variant'}`}
                    />
                    <span
                      className={`font-label-sm text-label-sm ${
                        isActive ? 'text-white' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Ajakan pasang aplikasi. Hanya di modul mobile, jadi dashboard admin
            tetap web murni. */}
        <InstallPrompt />
      </div>
    </MobileAppShell>
  )
}

export default MobileLayout
