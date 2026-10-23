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
    <div className="h-14 px-3.5 flex items-center justify-between gap-2 sp-glass-bar">
      <NavLink
        to="/mobile/home"
        className="sp-press flex items-center gap-2.5 min-w-0 h-11 px-1 rounded-xl"
        aria-label="SIMPEG Kepegawaian"
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
          style={{ backgroundColor: '#323d8f' }}
        >
          <Icon name="fingerprint" className="text-white text-[20px]" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight leading-tight truncate">
            SIMPEG
          </span>
          <span className="font-label-sm text-label-sm text-[#77819a] font-medium truncate">Kepegawaian</span>
        </span>
      </NavLink>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Notifikasi"
          className="sp-press w-9 h-9 rounded-full flex items-center justify-center bg-[#f3f5fc] hover:bg-[#eef0fc] border border-[#e0e6f2] text-[#20243a] relative transition-colors"
        >
          <Icon name="notifications" className="text-[#323d8f] text-[19px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>
        <NavLink to="/mobile/profil" aria-label="Profil saya" className="sp-press w-9 h-9 rounded-full flex items-center justify-center">
          <StaffAvatar
            staff={staff}
            size="w-9 h-9"
            textClass="font-label-sm text-label-sm font-semibold"
            ring="ring-2 ring-[#e0e6f2]"
          />
        </NavLink>
      </div>
    </div>
  )
}

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
          className={`sp-shortcut sp-rise sp-rise-${Math.min(i + 1, 4)} hover:border-[#323d8f]/30 transition-all`}
        >
          <span className={`sp-shortcut-icon ${item.warna || 'bg-[#eef0fc] text-[#323d8f]'}`}>
            <Icon name={item.ikon} className="text-[22px]" />
          </span>
          <span className="text-center leading-tight">
            <span className="block font-label-md text-label-md text-[#20243a] font-semibold">{item.judul}</span>
            {item.sub && <span className="block font-label-sm text-label-sm text-[#77819a] mt-0.5">{item.sub}</span>}
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
          <span className="w-8 h-8 rounded-xl bg-[#eef0fc] border border-[#323d8f]/15 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name={ikon} className="text-[17px] text-[#323d8f]" />
          </span>
        )}
        <span className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight truncate">{judul}</span>
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
    baik: 'text-emerald-600',
    lambat: 'text-amber-600',
    netral: 'text-[#20243a]',
  }[tone] || 'text-[#20243a]'
  return (
    <div className="rounded-2xl bg-[#eef0fc] border border-[#323d8f]/15 p-3 flex flex-col items-center gap-1.5 min-w-0 shadow-2xs">
      <span className="w-9 h-9 rounded-full bg-[#323d8f]/15 flex items-center justify-center shrink-0">
        <Icon name={ikon} className="text-[18px] text-[#323d8f]" />
      </span>
      <span className="font-label-sm text-label-sm text-[#77819a] font-medium">{label}</span>
      <span className={`font-label-md text-label-md font-semibold text-center leading-snug break-words ${nilaiWarna}`}>
        {nilai}
      </span>
    </div>
  )
}
