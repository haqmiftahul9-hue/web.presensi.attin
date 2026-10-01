import { useEffect } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  useSimPres, selectSelfStaff, selectAppMode, selectAppHomePath, MODE_MOBILE,
} from '../../store/simPresStore.jsx'
import StaffAvatar from './StaffAvatar.jsx'
import MobileErrorBoundary from './MobileErrorBoundary.jsx'

// Bottom navigation modul mobile. Empat menu ini adalah seluruh navigasi
// role Guru/Pegawai; tidak ada sidebar dan tidak ada tautan ke portal desktop.
const NAV_ITEMS = [
  { to: '/mobile/home', label: 'Beranda', icon: 'home', end: true },
  { to: '/mobile/presensi', label: 'Presensi', icon: 'face_retouch_natural' },
  { to: '/mobile/riwayat', label: 'Riwayat', icon: 'calendar_month' },
  { to: '/mobile/profil', label: 'Profil', icon: 'person' },
]

/**
 * Kerangka aplikasi mobile untuk role Guru/Pegawai: header lengket, konten, dan
 * bottom navigation. Lebar kolom dikunci 390px (ukuran layar iPhone 12/13/14)
 * supaya di Android maupun iOS tampil sama; di desktop kolomnya tetap berada
 * di tengah dengan latar netral di sekitarnya.
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
    <div className="sp-mobile-root min-h-[100dvh] bg-surface text-body-md text-body-md text-on-surface">
      <div className="sp-mobile-column relative mx-auto min-h-[100dvh] w-full max-w-[390px] bg-surface shadow-[0_24px_60px_-30px_rgba(11,31,61,0.35)]">
        <header className="sp-mobile-header sp-hide-print fixed top-0 z-50 mx-auto w-full max-w-[390px] bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
          <div className="h-16 px-2 flex items-center justify-between gap-1">
            <NavLink to="/mobile/home" className="flex items-center gap-2 min-w-0 h-11 px-2 -ml-2 rounded-xl">
              <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[20px]">fingerprint</span>
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">SimPres</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Kepegawaian</span>
              </span>
            </NavLink>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                aria-label="Notifikasi"
                className="sp-press relative w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
              </button>
              <NavLink
                to="/mobile/profil"
                aria-label="Profil saya"
                className="sp-press w-11 h-11 rounded-full flex items-center justify-center"
              >
                <StaffAvatar
                  staff={selectSelfStaff(state)}
                  size="w-9 h-9"
                  textClass="font-label-sm text-label-sm"
                  ring="ring-0"
                />
              </NavLink>
            </div>
          </div>
        </header>

        <main data-mobile-scroll className="w-full pt-16 pb-24 min-h-[100dvh]">
          <MobileErrorBoundary>
            <Outlet />
          </MobileErrorBoundary>
        </main>

        <nav className="sp-mobile-nav sp-hide-print fixed bottom-0 z-50 mx-auto w-full max-w-[390px] bg-surface/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(11,31,61,0.08)] pb-safe">
          <div className="flex items-stretch justify-around h-16 px-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-path={item.to}
                className={({ isActive }) =>
                  `sp-nav-item flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-secondary' : 'text-on-surface-variant'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive ? 'bg-primary-container shadow-sm' : 'bg-transparent'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isActive ? 'text-on-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.icon}
                      </span>
                    </span>
                    <span
                      className={`font-label-sm text-label-sm ${
                        isActive ? 'text-primary-container font-semibold' : ''
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
      </div>
    </div>
  )
}

export default MobileLayout