import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export const COLOR_THEMES = [
  { id: 'blue', label: 'Biru SIMPEG (Utama)', swatch: '#323d8f' },
  { id: 'green', label: 'Hijau Emerald', swatch: '#16a34a' },
  { id: 'rose', label: 'Merah Delima', swatch: '#e11d48' },
  { id: 'amber', label: 'Amber Emas', swatch: '#d97706' },
  { id: 'purple', label: 'Ungu Royal', swatch: '#7c3aed' },
  { id: 'teal', label: 'Teal Samudra', swatch: '#0d9488' },
]

export const FONT_THEMES = [
  { id: 'inter', label: 'Inter', family: 'Inter' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans' },
  { id: 'system', label: 'System Modern', family: 'system-ui' },
]

const STORAGE_COLOR_KEY = 'simpres.colorTheme.v2'
const STORAGE_FONT_KEY = 'simpres.fontTheme'

const AppearanceContext = createContext({
  colorTheme: 'blue',
  fontTheme: 'inter',
  setColorTheme: () => {},
  setFontTheme: () => {},
  COLOR_THEMES,
  FONT_THEMES,
})

function getInitialColor() {
  if (typeof window === 'undefined') return 'blue'
  try {
    const v = localStorage.getItem(STORAGE_COLOR_KEY) || localStorage.getItem('simpres.colorTheme')
    if (COLOR_THEMES.some((t) => t.id === v)) return v
  } catch (err) {
    console.error('Failed to read color theme:', err)
  }
  return 'blue'
}

function getInitialFont() {
  if (typeof window === 'undefined') return 'inter'
  try {
    const v = localStorage.getItem(STORAGE_FONT_KEY)
    if (FONT_THEMES.some((t) => t.id === v)) return v
  } catch (err) {
    console.error('Failed to read font theme:', err)
  }
  return 'inter'
}

export function AppearanceProvider({ children }) {
  const [colorTheme, setColorThemeState] = useState(getInitialColor)
  const [fontTheme, setFontThemeState] = useState(getInitialFont)

  const apply = useCallback((c, f) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.setAttribute('data-color-theme', c)
    root.setAttribute('data-font-theme', f)
  }, [])

  const setColorTheme = useCallback((newVal) => {
    const resolved = typeof newVal === 'function' ? newVal(colorTheme) : newVal
    if (!COLOR_THEMES.some((t) => t.id === resolved)) return
    setColorThemeState(resolved)
    try { localStorage.setItem(STORAGE_COLOR_KEY, resolved) } catch (err) { console.error('Failed to save color theme:', err) }
    apply(resolved, fontTheme)
  }, [colorTheme, fontTheme, apply])

  const setFontTheme = useCallback((newVal) => {
    const resolved = typeof newVal === 'function' ? newVal(fontTheme) : newVal
    if (!FONT_THEMES.some((t) => t.id === resolved)) return
    setFontThemeState(resolved)
    try { localStorage.setItem(STORAGE_FONT_KEY, resolved) } catch (err) { console.error('Failed to save font theme:', err) }
    apply(colorTheme, resolved)
  }, [colorTheme, fontTheme, apply])

  useEffect(() => { apply(colorTheme, fontTheme) }, [colorTheme, fontTheme, apply])

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_COLOR_KEY && e.newValue && COLOR_THEMES.some((t) => t.id === e.newValue)) {
        setColorThemeState(e.newValue)
        apply(e.newValue, fontTheme)
      } else if (e.key === STORAGE_FONT_KEY && e.newValue && FONT_THEMES.some((t) => t.id === e.newValue)) {
        setFontThemeState(e.newValue)
        apply(colorTheme, e.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [colorTheme, fontTheme, apply])

  return (
    <AppearanceContext.Provider value={{ colorTheme, fontTheme, setColorTheme, setFontTheme, COLOR_THEMES, FONT_THEMES }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('useAppearance must be used within an AppearanceProvider')
  return context
}

export default AppearanceContext
