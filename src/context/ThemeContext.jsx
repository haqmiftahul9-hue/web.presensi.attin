import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
})

const STORAGE_THEME_KEY = 'simpres.theme'
const STORAGE_LEGACY_KEY = 'simpres.darkMode'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY)
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme

    const legacy = localStorage.getItem(STORAGE_LEGACY_KEY)
    if (legacy === '1') return 'dark'
    if (legacy === '0') return 'light'

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch (err) {
    console.error('Failed to read theme preference:', err)
  }
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  const isDark = theme === 'dark'

  const applyThemeToDOM = useCallback((currentTheme) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (currentTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    }

    // Perbarui meta theme-color untuk mobile browser
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#181f2c' : '#323d8f')
    }
  }, [])

  const setTheme = useCallback((newTheme) => {
    const resolvedTheme = typeof newTheme === 'function' ? newTheme(theme) : newTheme
    setThemeState(resolvedTheme)
    try {
      localStorage.setItem(STORAGE_THEME_KEY, resolvedTheme)
      localStorage.setItem(STORAGE_LEGACY_KEY, resolvedTheme === 'dark' ? '1' : '0')
    } catch (err) {
      console.error('Failed to save theme preference:', err)
    }
    applyThemeToDOM(resolvedTheme)
  }, [theme, applyThemeToDOM])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [setTheme])

  // Terapkan saat inisialisasi
  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme, applyThemeToDOM])

  // Dengarkan perubahan antartab (storage event)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_THEME_KEY && e.newValue) {
        setThemeState(e.newValue)
        applyThemeToDOM(e.newValue)
      } else if (e.key === STORAGE_LEGACY_KEY && e.newValue) {
        const next = e.newValue === '1' ? 'dark' : 'light'
        setThemeState(next)
        applyThemeToDOM(next)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [applyThemeToDOM])

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
