import React, { useState, useRef, useEffect } from 'react'
import { useAppearance, COLOR_THEMES, FONT_THEMES } from '../../context/AppearanceContext.jsx'
import { cn } from '../../lib/utils.js'

export function AppearanceSettings({ size = 'md', className = '' }) {
  const { colorTheme, fontTheme, setColorTheme, setFontTheme } = useAppearance()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sizeStyles = {
    sm: { btn: 'w-9 h-9', icon: 'text-[18px]' },
    md: { btn: 'w-10 h-10', icon: 'text-[20px]' },
    lg: { btn: 'w-11 h-11', icon: 'text-[22px]' },
  }[size] || { btn: 'w-10 h-10', icon: 'text-[20px]' }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pengaturan warna tema dan font"
        title="Pengaturan Warna & Font"
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all shadow-2xs',
          sizeStyles.btn
        )}
      >
        <span className={cn('material-symbols-outlined', sizeStyles.icon)}>palette</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-lg z-[60]">
          <p className="text-xs font-semibold text-foreground mb-2">Warna Tema</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setColorTheme(t.id)}
                title={t.label}
                aria-label={t.label}
                className={cn(
                  'h-9 w-9 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-105',
                  colorTheme === t.id ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                )}
                style={{ backgroundColor: t.swatch }}
              >
                {colorTheme === t.id && (
                  <span className="material-symbols-outlined text-white text-[16px]">check</span>
                )}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-foreground mb-2">Gaya Font</p>
          <div className="flex flex-col gap-1">
            {FONT_THEMES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontTheme(f.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border',
                  fontTheme === f.id
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                )}
                style={{ fontFamily: f.family }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AppearanceSettings
