import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useSimPres,
  performLogin,
  selectIsAuthenticating,
  selectAuthError,
  selectAuthErrorCode,
  AUTH_ERROR_CODES,
  AUTH_ERRORS,
} from '../store/simPresStore.jsx'

/* ============================================================================
   SIMPEG Login — High-End Compact Card & Centered Logo Architecture
   ============================================================================
   - Dirancang presisi tanpa scroll (compact viewport-fit).
   - Logo terpusat (centered) di tengah kartu login.
   - Skewed gradient backdrop layer menggunakan warna utama #323d8f.
   - Floating label inputs dengan class `peer placeholder-transparent`.
   - Bebas bloatware: tanpa tombol Google SSO dan tanpa akordion demo testing.
   - Notifikasi sukses login dirender oleh <Toaster position="top-center" reverseOrder={true} /> di App.jsx.
   ============================================================================ */

function useLoginController() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const location = useLocation()

  const isAuthenticating = selectIsAuthenticating(state)
  const authError = selectAuthError(state)
  const authErrorCode = selectAuthErrorCode(state)

  const [identifier, setIdentifier] = useState('superadmin')
  const [password, setPassword] = useState('superadmin1234!')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [forgotMsg, setForgotMsg] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isAuthenticating || isNavigating) return

    const errors = {}
    if (!identifier.trim()) errors.identifier = AUTH_ERRORS.EMPTY_IDENTIFIER
    if (!password) errors.password = AUTH_ERRORS.EMPTY_PASSWORD
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await performLogin({
      state,
      dispatch,
      identifier,
      password,
      remember,
      requestedPath: location.state?.from?.pathname,
    })

    if (result.ok) {
      setIsNavigating(true)
      toast.success('Login berhasil')
      setTimeout(() => {
        navigate(result.path, { replace: true })
      }, 500)
    }
  }

  const clearFieldError = (field) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  return {
    isAuthenticating,
    authError,
    authErrorCode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
    remember,
    setRemember,
    fieldErrors,
    handleSubmit,
    clearFieldError,
    forgotMsg,
    setForgotMsg,
    isNavigating,
  }
}

/**
 * Background dekoratif halus untuk kedalaman visual
 */
function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--primary) 35%, transparent)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--primary) 40%, transparent)' }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-25">
        <defs>
          <pattern id="sp-login-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="var(--border)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sp-login-grid)" />
      </svg>
    </div>
  )
}

/**
 * Spinner indikator proses autentikasi
 */
function Spinner({ className = 'h-4 w-4' }) {
  return (
    <span className={`inline-block ${className}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" className="h-full w-full animate-spin">
        <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
        <path d="M14.4 8A6.4 6.4 0 0 0 8 1.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/**
 * Halaman Login SIMPEG — Desain Compact, Centered Logo, Presisi Tanpa Scroll
 */
function SimpegLoginCard(props) {
  const {
    isAuthenticating,
    authError,
    authErrorCode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    toggleShowPassword,
    remember,
    setRemember,
    fieldErrors,
    handleSubmit,
    clearFieldError,
    forgotMsg,
    setForgotMsg,
    isNavigating,
  } = props

  return (
    <div className="min-h-screen h-[100dvh] flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden selection:bg-[#323d8f] selection:text-white">
      <LoginBackdrop />

      <div className="relative w-full max-w-[390px] mx-auto z-10 animate-sp-fade">
        {/* Lapisan Latar Miring (Skewed Gradient Layer) - Menggunakan Warna Utama #323d8f */}
        <div
          className="absolute inset-0 shadow-2xl transform -skew-y-3 sm:skew-y-0 sm:-rotate-3 rounded-2xl sm:rounded-3xl transition-transform duration-500 ease-out"
          style={{
            background: 'linear-gradient(135deg, #323d8f 0%, #4352b8 50%, #20275e 100%)',
          }}
          aria-hidden="true"
        />

        {/* Kartu Inti / Double-Bezel Architecture */}
        <div className="relative px-6 py-7 sm:px-8 sm:py-8 bg-card border border-border/80 text-card-foreground shadow-2xl rounded-2xl sm:rounded-3xl">
          {/* Header Brand & Logo Ditengah Secara Presisi */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md mb-2.5 transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: '#323d8f' }}
            >
              <span className="material-symbols-outlined text-[26px]">verified</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
              SIMPEG
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Sistem Informasi Kepegawaian & Presensi
            </p>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {/* Identifier Input dengan Floating Label */}
            <div className="relative">
              <input
                autoComplete="off"
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  clearFieldError('identifier')
                }}
                placeholder="Username / NIY / Email"
                disabled={isAuthenticating}
                aria-invalid={Boolean(fieldErrors.identifier)}
                className={`peer placeholder-transparent h-10 w-full border-b-2 bg-transparent text-sm text-foreground focus:outline-none transition-colors ${
                  fieldErrors.identifier
                    ? 'border-destructive focus:border-destructive'
                    : 'border-border focus:border-[#323d8f]'
                }`}
              />
              <label
                htmlFor="identifier"
                className={`absolute left-0 -top-3.5 text-xs transition-all cursor-text peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold ${
                  fieldErrors.identifier
                    ? 'text-destructive peer-focus:text-destructive'
                    : 'text-muted-foreground peer-placeholder-shown:text-muted-foreground/70 peer-focus:text-[#323d8f]'
                }`}
              >
                Username / NIY / Email
              </label>
              {fieldErrors.identifier && (
                <span className="text-[11px] font-medium text-destructive mt-1 block">
                  {fieldErrors.identifier}
                </span>
              )}
            </div>

            {/* Password Input dengan Floating Label */}
            <div className="relative">
              <input
                autoComplete="off"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                }}
                placeholder="Password"
                disabled={isAuthenticating}
                aria-invalid={Boolean(fieldErrors.password)}
                className={`peer placeholder-transparent h-10 w-full border-b-2 bg-transparent text-sm text-foreground pr-10 focus:outline-none transition-colors ${
                  fieldErrors.password
                    ? 'border-destructive focus:border-destructive'
                    : 'border-border focus:border-[#323d8f]'
                }`}
              />
              <label
                htmlFor="password"
                className={`absolute left-0 -top-3.5 text-xs transition-all cursor-text peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold ${
                  fieldErrors.password
                    ? 'text-destructive peer-focus:text-destructive'
                    : 'text-muted-foreground peer-placeholder-shown:text-muted-foreground/70 peer-focus:text-[#323d8f]'
                }`}
              >
                Password
              </label>

              {/* Tombol Toggle Show / Hide Password */}
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-0 top-2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                disabled={isAuthenticating}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>

              {fieldErrors.password && (
                <span className="text-[11px] font-medium text-destructive mt-1 block">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Remember Me & Lupa Password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={isAuthenticating}
                  className="w-3.5 h-3.5 rounded border-border text-[#323d8f] focus:ring-[#323d8f] accent-[#323d8f] cursor-pointer"
                />
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Ingat saya
                </span>
              </label>

              <button
                type="button"
                onClick={() => setForgotMsg((v) => !v)}
                className="text-xs font-semibold hover:underline transition-colors cursor-pointer"
                style={{ color: '#323d8f' }}
              >
                Lupa password?
              </button>
            </div>

            {/* Notifikasi Lupa Password Info */}
            {forgotMsg && (
              <div className="p-2.5 rounded-xl bg-accent/60 border border-accent text-accent-foreground text-xs leading-relaxed flex items-start gap-2 animate-sp-rise">
                <span
                  className="material-symbols-outlined text-[16px] shrink-0 mt-0.5"
                  style={{ color: '#323d8f' }}
                >
                  info
                </span>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Silakan hubungi administrator unit sekolah atau HRD untuk mereset kata sandi akun Anda.
                </p>
              </div>
            )}

            {/* Auth Error Alert (shadcn destructive style) */}
            {authError && (
              <div
                role="alert"
                className="p-2.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-start gap-2 animate-sp-rise"
              >
                <span className="material-symbols-outlined text-[17px] text-destructive shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-xs">{authError}</span>
                  {authErrorCode && AUTH_ERROR_CODES[authErrorCode] && (
                    <span className="text-[10.5px] opacity-80">
                      Penyebab: {AUTH_ERROR_CODES[authErrorCode]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button (Warna Utama #323d8f) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isAuthenticating || isNavigating}
                className="w-full text-white font-semibold rounded-xl px-4 py-2.5 text-sm shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: '#323d8f' }}
              >
                {isAuthenticating || isNavigating ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>{isNavigating ? 'Login berhasil, mengalihkan...' : 'Memverifikasi akun...'}</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Ringkas */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          &copy; 2026 SIMPEG &middot; Yayasan Islam Attin Indonesia
        </p>
      </div>
    </div>
  )
}

/**
 * Entry point halaman login
 */
function LoginPage() {
  const controller = useLoginController()
  return <SimpegLoginCard {...controller} />
}

export default LoginPage
