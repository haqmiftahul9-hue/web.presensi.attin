import Icon from '../Icon.jsx'
import { NavLink } from 'react-router-dom'
import StaffAvatar from './StaffAvatar.jsx'
import { ThemeToggle } from '../ui/ThemeToggle.jsx'
import { AppearanceSettings } from '../ui/AppearanceSettings.jsx'
import { useSimPres } from '../../store/simPresStore.jsx'

/**
 * Elemen visual bersama untuk aplikasi mobile Guru/Pegawai.
 *
 * File ini hanya berisi tampilan — tidak ada fetch, dispatch, atau aturan
 * bisnis. Semua data masuk lewat props, sehingga halaman tetap bebas mengatur
 * datanya sendiri dan komponen ini bisa dipakai ulang tanpa efek samping.
 */

/** Mobile App Shell: frame perangkat mobile yang membungkus seluruh aplikasi.
 *  Desktop: width 430px, centered, height 100dvh.
 *  Mobile: width 100%, tinggi penuh, tanpa bingkai.
 *
 *  Shell ini yang membatasi seluruh aplikasi — termasuk bottom navigation —
 *  supaya di desktop ia terlihat seperti pratinjau perangkat, bukan website
 *  yang melebar mengikuti jendela browser.
 */
export function MobileAppShell({ children }) {
  return (
    <div className="sp-mobile-root">
      <div className="sp-mobile-app-shell">
        <div className="sp-mobile-device-frame">
          <AppBackground>{children}</AppBackground>
        </div>
      </div>
    </div>
  )
}

/** Latar modul: navy -> abu soft, dengan blob dekoratif di dalamnya. */
export function AppBackground({ children }) {
  return (
    <div className="sp-app-bg">
      <span className="sp-blob sp-blob-a" aria-hidden="true" />
      <span className="sp-blob sp-blob-b" aria-hidden="true" />
      <div className="relative z-[1] flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  )
}

/**
 * Bar atas melayang: logo SIMPEG, notifikasi, dan tombol profil.
 * Transparan karena hero setiap halaman berwarna gelap, jadi kontrasnya
 * selalu aman tanpa perlu varian lain.
 */
export function GlassTopBar({ staff }) {
  const { state } = useSimPres()
  const logo = state?.settings?.logo || '/icons/logo-simpeg.png'
  const appName = state?.settings?.namaAplikasi || 'SIMPEG'
  return (
    <div className="h-14 px-3.5 flex items-center justify-between gap-2 sp-glass-bar">
      <NavLink
        to="/mobile/home"
        className="sp-press flex items-center gap-2.5 min-w-0 h-11 px-1 rounded-xl"
        aria-label="SIMPEG Kepegawaian"
      >
        <span className="w-9 h-9 rounded-xl bg-white p-1.5 shadow-2xs border border-border/40 flex items-center justify-center shrink-0">
          <img src={logo} alt={appName} className="w-full h-full object-contain" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-sp-ink dark:text-white font-bold tracking-tight leading-tight truncate">
            SIMPEG
          </span>
          <span className="font-label-sm text-label-sm text-primary-muted dark:text-slate-400 font-medium truncate">Kepegawaian</span>
        </span>
      </NavLink>

       <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeToggle size="sm" />
        <AppearanceSettings size="sm" />
        <button
          type="button"
          aria-label="Notifikasi"
          className="sp-press w-9 h-9 rounded-full flex items-center justify-center bg-primary-soft hover:bg-primary-soft/80 border border-primary-border text-sp-ink dark:text-white relative transition-colors"
        >
          <Icon name="notifications" className="text-primary text-[19px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-status-success ring-2 ring-white" />
        </button>
        <NavLink to="/mobile/profil" aria-label="Profil saya" className="sp-press w-9 h-9 rounded-full flex items-center justify-center">
          <StaffAvatar
            staff={staff}
            size="w-9 h-9"
            textClass="font-label-sm text-label-sm font-semibold"
            ring="ring-2 ring-primary-border"
          />
        </NavLink>
      </div>
    </div>
  )
}

/**
 * Grid shortcut 2x2 atau 3-kolom kompak. Tidak memakai list: tiap menu adalah kotak dengan ikon
 * lingkaran dan judul kecil, seperti aplikasi presensi pada umumnya.
 */
export function ShortcutGrid({ items, columns = 2, compact = false }) {
  const isCompact = compact || columns >= 3
  return (
    <div
      className={`grid ${isCompact ? 'gap-2' : 'gap-2.5'}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => (
        <NavLink
          key={item.to + i}
          to={item.to}
          className={`${isCompact ? 'sp-shortcut-compact' : 'sp-shortcut'} sp-rise sp-rise-${Math.min(i + 1, 4)} hover:border-primary/30 transition-all`}
        >
          <div className="relative">
            <span className={`${isCompact ? 'sp-shortcut-compact-icon' : 'sp-shortcut-icon'} ${item.warna || 'bg-primary-soft text-primary'}`}>
              <Icon name={item.ikon} className={isCompact ? 'text-[20px]' : 'text-[22px]'} />
            </span>
            {Boolean(item.badge && item.badge > 0) && (
              <span className="absolute -top-1 -right-1 bg-status-danger text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center shadow-xs">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
          <span className="text-center leading-tight">
            <span className={`block font-semibold text-sp-ink dark:text-slate-100 ${isCompact ? 'text-[11px] line-clamp-2' : 'font-label-md text-label-md'}`}>
              {item.judul}
            </span>
            {item.sub && (
              <span className={`block text-primary-muted dark:text-slate-400 ${isCompact ? 'text-[9.5px] mt-0.5 line-clamp-1' : 'font-label-sm text-label-sm mt-0.5'}`}>
                {item.sub}
              </span>
            )}
          </span>
        </NavLink>
      ))}
    </div>
  )
}

/** Judul seksi dengan ikon, dipakai memisahkan blok kartu. */
export function SectionTitle({ ikon, judul, aksi }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 min-w-0">
        {ikon && (
          <span className="w-8 h-8 rounded-xl bg-primary-soft border border-primary/15 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name={ikon} className="text-[17px] text-primary" />
          </span>
        )}
        <span className="font-headline-sm text-headline-sm text-sp-ink dark:text-white font-bold tracking-tight truncate">{judul}</span>
      </span>
      {aksi}
    </div>
  )
}

/** Satu sensor pada baris "Status Sensor" (lokasi / waktu / kamera).
 *
 * Latar konsisten soft blue dan ikon seragam navy; status hanya disampaikan
 * melalui warna teks nilai (bukan bingkai/ikon berbeda-beda per sensor) agar
 * tidak terlihat dekoratif dan tetap terarah.
 */
export function Sensor({ ikon, label, nilai, tone = 'netral' }) {
  const nilaiWarna = {
    baik: 'text-status-success-text',
    lambat: 'text-status-warning-text',
    netral: 'text-sp-ink dark:text-slate-100',
  }[tone] || 'text-sp-ink'
  return (
    <div className="rounded-2xl bg-primary-soft border border-primary/15 p-3 flex flex-col items-center gap-1.5 min-w-0 shadow-2xs">
      <span className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Icon name={ikon} className="text-[18px] text-primary" />
      </span>
      <span className="font-label-sm text-label-sm text-primary-muted dark:text-slate-400 font-medium">{label}</span>
      <span className={`font-label-md text-label-md font-semibold text-center leading-snug break-words ${nilaiWarna}`}>
        {nilai}
      </span>
    </div>
  )
}
