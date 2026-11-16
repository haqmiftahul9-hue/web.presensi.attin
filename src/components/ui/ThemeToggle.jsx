import React from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'
import { cn } from '../../lib/utils.js'

/**
 * Sun Icon sesuai referensi desain
 * Lingkaran tengah dengan 8 sinar (garis bulat presisi)
 */
function SunIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2.5" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="21.5" />
      <line x1="4.5" y1="4.5" x2="6" y2="6" />
      <line x1="18" y1="18" x2="19.5" y2="19.5" />
      <line x1="2.5" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="21.5" y2="12" />
      <line x1="4.5" y1="19.5" x2="6" y2="18" />
      <line x1="18" y1="6" x2="19.5" y2="4.5" />
    </svg>
  )
}

/**
 * Moon & Stars Icon sesuai referensi desain
 * Bulan sabit elegan dengan 2 bintang berkilau (sparkles)
 */
function MoonStarsIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Bulan sabit */}
      <path d="M12 3a8.5 8.5 0 1 0 8.5 8.5 7 7 0 0 1-8.5-8.5z" />
      {/* Bintang kecil atas */}
      <path
        d="M19 4v2m-1-1h2"
        strokeWidth="2"
      />
      {/* Bintang kecil bawah */}
      <path
        d="M17 9v1.5m-.75-.75h1.5"
        strokeWidth="1.8"
      />
    </svg>
  )
}

/**
 * Neumorphic Dark/Light Mode Switch Toggle
 * Sesuai referensi gambar:
 * - Light Mode: Inset pill cerah, thumb bulat timbul di kiri berisi icon matahari, teks "LIGHT MODE" di kanan.
 * - Dark Mode: Inset pill gelap, teks "DARK MODE" di kiri, thumb bulat timbul di kanan berisi icon bulan sabit + bintang.
 *
 * Mendukung varian size:
 * - 'sm': Cocok untuk topbar / header (kompak: 88px x 34px)
 * - 'md': Ukuran standar referensi (104px x 40px)
 * - 'lg': Ukuran besar untuk showcase/login (116px x 46px)
 */
export function ThemeToggle({
  size = 'md',
  className = '',
  showLabel = true,
  onClick,
  ...props
}) {
  const { isDark, toggleTheme } = useTheme()

  const handleClick = (e) => {
    toggleTheme()
    if (onClick) onClick(e)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleTheme()
    }
  }

  // Pengaturan dimensi berdasarkan prop size
  const sizeStyles = {
    sm: {
      track: 'w-[86px] h-[34px] p-[3px]',
      thumb: 'w-[28px] h-[28px]',
      icon: 'w-4 h-4',
      translate: 'translate-x-[52px]',
      textContainer: 'w-[52px]',
      text: 'text-[8.5px] leading-[1.05]',
    },
    md: {
      track: 'w-[104px] h-[40px] p-[4px]',
      thumb: 'w-[32px] h-[32px]',
      icon: 'w-[18px] h-[18px]',
      translate: 'translate-x-[64px]',
      textContainer: 'w-[64px]',
      text: 'text-[10px] leading-[1.1]',
    },
    lg: {
      track: 'w-[118px] h-[46px] p-[4px]',
      thumb: 'w-[38px] h-[38px]',
      icon: 'w-[21px] h-[21px]',
      translate: 'translate-x-[72px]',
      textContainer: 'w-[72px]',
      text: 'text-[11px] leading-[1.15]',
    },
  }[size] || sizeStyles.md

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      title={isDark ? 'Mode Gelap Aktif (Klik untuk Mode Terang)' : 'Mode Terang Aktif (Klik untuk Mode Gelap)'}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex items-center select-none rounded-full cursor-pointer outline-none transition-all duration-300 group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        sizeStyles.track,
        // Style track Neumorphic Inset (Cekung ke dalam)
        isDark
          ? 'bg-[#1b222d] shadow-[inset_3px_3px_6px_#10151c,inset_-2px_-2px_5px_#27303f] border border-slate-700/30'
          : 'bg-[#e3e7ee] shadow-[inset_3px_3px_6px_#c7cdd8,inset_-3px_-3px_6px_#ffffff] border border-white/60',
        className
      )}
      {...props}
    >
      {/* Label Teks Sesuai Mode di Dalam Pill */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2.5">
          {/* Teks Sisi Kiri (Hanya Muncul saat Mode Gelap) */}
          <div
            className={cn(
              'flex flex-col items-center justify-center transition-all duration-300',
              sizeStyles.textContainer,
              isDark
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2'
            )}
          >
            <span
              className={cn(
                'font-extrabold tracking-wider text-[#63748d] dark:text-[#7688a4] uppercase transition-colors',
                sizeStyles.text
              )}
            >
              Dark
            </span>
            <span
              className={cn(
                'font-extrabold tracking-wider text-[#63748d] dark:text-[#7688a4] uppercase transition-colors',
                sizeStyles.text
              )}
            >
              Mode
            </span>
          </div>

          {/* Teks Sisi Kanan (Hanya Muncul saat Mode Terang) */}
          <div
            className={cn(
              'flex flex-col items-center justify-center ml-auto transition-all duration-300',
              sizeStyles.textContainer,
              !isDark
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-2'
            )}
          >
            <span
              className={cn(
                'font-extrabold tracking-wider text-[#8b9bb2] uppercase transition-colors',
                sizeStyles.text
              )}
            >
              Light
            </span>
            <span
              className={cn(
                'font-extrabold tracking-wider text-[#8b9bb2] uppercase transition-colors',
                sizeStyles.text
              )}
            >
              Mode
            </span>
          </div>
        </div>
      )}

      {/* Thumb Bulat Neumorphic Timbul (Extruded) dengan Icon */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          sizeStyles.thumb,
          isDark
            ? cn(
                sizeStyles.translate,
                'bg-[#4c586e] text-[#cbd5e1] shadow-[2px_3px_6px_rgba(10,14,20,0.6),-1px_-1px_3px_rgba(120,140,170,0.25)] border border-slate-500/20'
              )
            : 'translate-x-0 bg-[#f4f6fa] text-[#8696ad] shadow-[2px_3px_6px_rgba(160,172,190,0.45),-2px_-2px_5px_#ffffff] border border-white/80'
        )}
      >
        {isDark ? (
          <MoonStarsIcon className={cn(sizeStyles.icon, 'transition-transform duration-300 rotate-0 scale-100')} />
        ) : (
          <SunIcon className={cn(sizeStyles.icon, 'transition-transform duration-300 rotate-0 scale-100')} />
        )}
      </div>
    </button>
  )
}

export default ThemeToggle
