import Icon from '../Icon.jsx'
import { NavLink } from 'react-router-dom'
import StaffAvatar from './StaffAvatar.jsx'

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
 * Bar atas melayang: logo SimPres, notifikasi, dan tombol profil.
 * Transparan karena hero setiap halaman berwarna gelap, jadi kontrasnya
 * selalu aman tanpa perlu varian lain.
 */
export function GlassTopBar({ staff }) {
  return (
    <div className="h-14 px-3 flex items-center justify-between gap-2 sp-glass-bar">
      <NavLink
        to="/mobile/home"
        className="sp-press flex items-center gap-2 min-w-0 h-11 px-1.5 rounded-xl"
        aria-label="SimPres Kepegawaian"
      >
        <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
          <Icon name="fingerprint" className="text-white text-[20px]" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-white leading-tight truncate">SimPres</span>
          <span className="font-label-sm text-label-sm text-white/70 truncate">Kepegawaian</span>
        </span>
      </NavLink>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label="Notifikasi"
          className="sp-press w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/15"
        >
          <Icon name="notifications" className="text-white text-[22px]" />
        </button>
        <NavLink to="/mobile/profil" aria-label="Profil saya" className="sp-press w-11 h-11 rounded-full flex items-center justify-center">
          <StaffAvatar
            staff={staff}
            size="w-9 h-9"
            textClass="font-label-sm text-label-sm"
            ring="ring-2 ring-white/25"
          />
        </NavLink>
      </div>
    </div>
  )
}

/**
/**
 * Grid shortcut 2x2. Tidak memakai list: tiap menu adalah kotak dengan ikon
 * lingkaran dan judul kecil, seperti aplikasi presensi pada umumnya.
 */
export function ShortcutGrid({ items, columns = 2 }) {
  return (
    <div
      className="grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={`sp-shortcut sp-rise sp-rise-${Math.min(i + 1, 4)}`}
        >
          <span className={`sp-shortcut-icon ${item.warna || 'bg-surface-container'}`}>
            <Icon name={item.ikon} className="text-[22px] text-on-surface" />
          </span>
          <span className="text-center leading-tight">
            <span className="block font-label-md text-label-md text-on-surface">{item.judul}</span>
            {item.sub && <span className="block font-label-sm text-label-sm text-on-surface-variant">{item.sub}</span>}
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
          <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <Icon name={ikon} className="text-[18px] text-on-surface-variant" />
          </span>
        )}
        <span className="font-headline-sm text-headline-sm text-on-surface truncate">{judul}</span>
      </span>
      {aksi}
    </div>
  )
}

/** Satu sensor pada baris "Status Sensor" (lokasi / waktu / kamera).
 *
 *  Setiap kotak punya padding 12px dan radius 16px, dan jarak antar kotak
 *  diatur oleh `gap` grid di pemanggil (10px) — jadi tidak pernah saling
 *  menempel dan tidak pernah menyentuh sisi kartu. */
export function Sensor({ ikon, label, nilai, tone = 'netral' }) {
  const warna = {
    baik: 'bg-emerald-50 text-emerald-700',
    lambat: 'bg-amber-50 text-amber-800',
    netral: 'bg-surface-container-low text-on-surface-variant',
  }[tone] || 'bg-surface-container-low text-on-surface-variant'
  return (
    <div className="rounded-2xl bg-surface-container-low p-3 flex flex-col items-center gap-1.5 min-w-0">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${warna}`}>
        <Icon name={ikon} className="text-[18px]" />
      </span>
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <span className="font-label-md text-label-md text-on-surface text-center leading-snug break-words">
        {nilai}
      </span>
    </div>
  )
}
