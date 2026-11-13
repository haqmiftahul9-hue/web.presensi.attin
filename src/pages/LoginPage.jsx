import { useState, useEffect } from 'react'
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
   SIMPEG Login — Desktop 2-Panel & Mobile Reference 2 Architecture
   ============================================================================
   1. Desktop (lg+): Tetap mempertahankan desain dua panel kurva organik,
      showcase terminal biometrik presisi di sisi kiri putih, dan form login
      navy di sisi kanan tanpa ada garis yang bertabrakan.
   2. Mobile (< lg): Mengadaptasi penuh UI/UX kartu "referensi halaman login 2.jpg":
      - Header banner atas dengan lengkungan organik bernuansa warna SIMPEG
        (Royal Navy #323D8F) memuat logo resmi SIMPEG dan judul.
      - Kartu putih rounded-t-[32px] yang bertumpuk (-mt-4) memuat kolom input
        bergaya soft pill (#F3F5FC), tombol pill rounded-full solid #323D8F,
        serta atribusi developer di bagian bawah.
   3. Bebas AI Slop, tipografi presisi, ramah jempol (min-h 48px, text-base iOS).
   4. Business logic auth, lockout 5 menit, dan session store utuh 100%.
   ============================================================================ */

/* -------------------------------------------------------------------------- */
/*  CONTROLLER — Auth & Lockout Logic (UTUH 100%)                             */
/* -------------------------------------------------------------------------- */
function useLoginController() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const location = useLocation()

  const isAuthenticating = selectIsAuthenticating(state)
  const authError = selectAuthError(state)
  const authErrorCode = selectAuthErrorCode(state)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(() => {
    try {
      const raw = localStorage.getItem('simpres.loginAttempts')
      return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 }
    } catch {
      return { count: 0, lockedUntil: 0 }
    }
  })
  const [lockRemaining, setLockRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      if (loginAttempts.lockedUntil > now) {
        setLockRemaining(Math.ceil((loginAttempts.lockedUntil - now) / 1000))
      } else {
        setLockRemaining(0)
        if (loginAttempts.lockedUntil && loginAttempts.lockedUntil <= now && loginAttempts.count >= 5) {
          const next = { count: 0, lockedUntil: 0 }
          setLoginAttempts(next)
          try { localStorage.setItem('simpres.loginAttempts', JSON.stringify(next)) } catch { /* ignore */ }
        }
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [loginAttempts])

  const [remember, setRemember] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [forgotMsg, setForgotMsg] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isAuthenticating || isNavigating) return
    if (lockRemaining > 0) {
      toast.error(`Akun terkunci. Coba lagi dalam ${lockRemaining} detik.`)
      return
    }

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
      const next = { count: 0, lockedUntil: 0 }
      setLoginAttempts(next)
      try { localStorage.setItem('simpres.loginAttempts', JSON.stringify(next)) } catch { /* ignore */ }
      setIsNavigating(true)
      toast.success('Login berhasil')
      setTimeout(() => {
        navigate(result.path, { replace: true })
      }, 500)
    } else {
      const count = (loginAttempts.count || 0) + 1
      const lockedUntil = count >= 5 ? Date.now() + 5 * 60 * 1000 : 0
      const next = { count, lockedUntil }
      setLoginAttempts(next)
      try { localStorage.setItem('simpres.loginAttempts', JSON.stringify(next)) } catch { /* ignore */ }
      if (lockedUntil) toast.error('Terlalu banyak percobaan. Akun terkunci 5 menit.')
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
    lockRemaining,
  }
}

/* -------------------------------------------------------------------------- */
/*  CSS KEYFRAMES — MOTION SISTEM ELEGAN                                      */
/* -------------------------------------------------------------------------- */
function LoginStyles() {
  return (
    <style>{`
      @keyframes simpeg-scan-line {
        0%, 100% { transform: translateY(0); opacity: 0.9; }
        50% { transform: translateY(105px); opacity: 0.4; }
      }
      @keyframes simpeg-card-hover {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }
      @keyframes simpeg-bubble-drift {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(6px, -10px); }
      }
      @keyframes simpeg-fade-up {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .anim-simpeg-scan   { animation: simpeg-scan-line 3.2s ease-in-out infinite; }
      .anim-simpeg-float  { animation: simpeg-card-hover 6s ease-in-out infinite; }
      .anim-simpeg-drift  { animation: simpeg-bubble-drift 8s ease-in-out infinite; }
      .anim-simpeg-appear { animation: simpeg-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

      @media (prefers-reduced-motion: reduce) {
        .anim-simpeg-scan,
        .anim-simpeg-float,
        .anim-simpeg-drift,
        .anim-simpeg-appear {
          animation: none !important;
        }
      }
    `}</style>
  )
}

/* -------------------------------------------------------------------------- */
/*  SPINNER                                                                   */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*  PANEL KIRI DESKTOP — SMART PRESENCE TERMINAL SHOWCASE                     */
/* -------------------------------------------------------------------------- */
function DesktopVisualShowcase() {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 xl:p-10 select-none">
      {/* 1. Header Identitas: Logo Diperbesar & Teks SIMPEG Murni */}
      <div className="relative z-20 flex items-center gap-3.5">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E0E6F2] p-2 shadow-md flex items-center justify-center shrink-0">
          <img
            src="/icons/logo-simpeg.png"
            alt="Logo SIMPEG"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-[28px] font-black tracking-tight text-[#323D8F] leading-none">
            SIMPEG
          </h2>
          <p className="text-[10.5px] sm:text-[11px] font-medium text-[#77819A] leading-snug mt-1 max-w-[170px]">
            Sistem Informasi<br />Kepegawaian &amp; Presensi
          </p>
        </div>
      </div>

      {/* 2. Visual Inti: Terminal Biometrik Modern yang Presisi */}
      <div className="relative z-10 flex items-center justify-center my-auto py-5">
        {/* Soft Organic Background Blob */}
        <div
          className="absolute w-[290px] h-[250px] rounded-[44px] -rotate-2 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #EEF0FC 0%, #E3E7FA 60%, #D8DFF8 100%)',
          }}
        />

        {/* Ambient Floating Particle */}
        <div
          className="absolute -top-2 left-6 w-9 h-9 rounded-full anim-simpeg-drift"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(224, 230, 242, 0.9)',
            boxShadow: '0 4px 12px rgba(50, 61, 143, 0.06)',
          }}
        />

        {/* Central Terminal Card */}
        <div className="relative z-10 w-[235px] rounded-2xl bg-white border border-[#DCE3F5] shadow-xl p-3.5 anim-simpeg-float">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-[#323D8F]">Terminal Presensi</span>
            </div>
            <span className="text-[9px] font-semibold text-[#77819A]">Aktif</span>
          </div>

          {/* Biometric Viewfinder Area */}
          <div className="relative w-full h-[120px] rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800">
            {/* Viewfinder Target Frame */}
              <div className="absolute inset-2.5 border border-[#323D8F]/30 rounded-lg pointer-events-none">
                <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-2 border-l-2 border-[#323D8F]" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 border-[#323D8F]" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 border-[#323D8F]" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 border-[#323D8F]" />
            </div>

            {/* Scanning Beam */}
            <div className="absolute left-2.5 right-2.5 top-2.5 h-[2px] bg-gradient-to-r from-transparent via-[#323D8F] to-transparent anim-simpeg-scan shadow-[0_0_8px_#323D8F]" />

            {/* Silhouette & Biometric Face Landmarks */}
            <div className="relative flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border border-[#323D8F]/40 bg-[#323D8F]/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#323D8F] text-[24px]">
                  face
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8.5px] font-medium">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Wajah Terverifikasi</span>
              </div>
            </div>
          </div>

          {/* Bottom Card Summary */}
          <div className="mt-2.5 pt-2 flex items-center justify-between">
            <div>
              <p className="text-[8.5px] font-medium text-[#77819A]">Jam Masuk Kerja</p>
              <p className="text-xs font-bold text-[#323D8F]">07:10 WIB</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
              Tepat Waktu
            </span>
          </div>
        </div>

        {/* Floating Unit Integration Badge */}
        <div className="absolute -bottom-2 left-6 z-20 bg-white border border-[#E0E6F2] shadow-md rounded-xl px-3 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#323D8F]" />
          <span className="text-[10px] font-bold text-[#323D8F]">
            Portal Terintegrasi Presensi Pegawai
          </span>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  FORM LOGIN DESKTOP (SISI KANAN — SOLID BLUE #323D8F)                      */
/* -------------------------------------------------------------------------- */
function DesktopLoginForm({
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
  lockRemaining,
}) {
  return (
    <div className="w-full max-w-[340px] sm:max-w-[360px] mx-auto py-2">
      {/* Header Form */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight leading-tight">
          Masuk ke Akun
        </h1>
        <p className="mt-1 text-xs text-indigo-100/80 leading-normal">
          Gunakan username atau NIY dan kata sandi Anda.
        </p>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {/* Kolom Username / NIY */}
        <div>
          <label
            htmlFor="desktop-identifier"
            className="block text-xs font-semibold text-white/95 mb-1.5"
          >
            Username atau NIY
          </label>
          <div className="relative">
            <input
              autoComplete="username"
              id="desktop-identifier"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                clearFieldError('identifier')
              }}
              placeholder="Contoh: 029011052"
              disabled={isAuthenticating}
              aria-invalid={Boolean(fieldErrors.identifier)}
              className={[
                'w-full h-11 px-3.5 rounded-xl text-sm text-white placeholder-white/45',
                'bg-[#262F6F] border transition-all duration-200 outline-none',
                fieldErrors.identifier
                  ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                  : 'border-white/20 focus:border-white focus:ring-2 focus:ring-white/25 focus:bg-[#1E2557]',
              ].join(' ')}
            />
          </div>
          {fieldErrors.identifier && (
            <span className="text-[11px] font-medium text-red-300 mt-1 block">
              {fieldErrors.identifier}
            </span>
          )}
        </div>

        {/* Kolom Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="desktop-password"
              className="block text-xs font-semibold text-white/95"
            >
              Kata Sandi
            </label>
          </div>
          <div className="relative">
            <input
              autoComplete="current-password"
              id="desktop-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
              }}
              placeholder="Masukkan kata sandi Anda"
              disabled={isAuthenticating}
              aria-invalid={Boolean(fieldErrors.password)}
              className={[
                'w-full h-11 pl-3.5 pr-10 rounded-xl text-sm text-white placeholder-white/45',
                'bg-[#262F6F] border transition-all duration-200 outline-none',
                fieldErrors.password
                  ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                  : 'border-white/20 focus:border-white focus:ring-2 focus:ring-white/25 focus:bg-[#1E2557]',
              ].join(' ')}
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              disabled={isAuthenticating}
            >
              <span className="material-symbols-outlined text-[19px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {fieldErrors.password && (
            <span className="text-[11px] font-medium text-red-300 mt-1 block">
              {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Baris Ingat Saya & Lupa Password */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/90">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isAuthenticating}
              className="w-3.5 h-3.5 rounded border-white/30 bg-[#262F6F] text-[#323D8F] accent-white cursor-pointer"
            />
            <span>Ingat saya</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotMsg((v) => !v)}
            className="text-xs font-semibold text-[#323D8F] hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
          >
            Lupa kata sandi?
          </button>
        </div>

        {/* Banner Info Lupa Password */}
        {forgotMsg && (
          <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-400/30 text-indigo-100 text-xs leading-relaxed flex items-start gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[15px] text-indigo-300 shrink-0 mt-0.5">info</span>
            <p className="text-[11px]">
              Silakan hubungi administrator Tata Usaha (TU) unit sekolah atau HRD untuk melakukan reset kata sandi akun Anda.
            </p>
          </div>
        )}

        {/* Banner Kesalahan Autentikasi */}
        {authError && (
          <div
            role="alert"
            className="p-2.5 rounded-xl border border-red-400/40 bg-red-950/50 text-red-200 text-xs flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0 mt-0.5">error</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-xs">{authError}</span>
              {authErrorCode && AUTH_ERROR_CODES[authErrorCode] && (
                <span className="text-[10px] opacity-80">
                  Penyebab: {AUTH_ERROR_CODES[authErrorCode]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tombol Aksi Masuk Utama (Putih Kontras Tinggi, Teks Navy #323D8F) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAuthenticating || isNavigating || lockRemaining > 0}
            className={[
              'w-full h-11 sm:h-12 rounded-xl font-bold text-xs sm:text-sm',
              'bg-white text-[#323D8F] hover:bg-[#EEF0FC] active:scale-[0.98]',
              'shadow-md shadow-black/20 transition-all duration-200',
              'flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isAuthenticating || isNavigating ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>{isNavigating ? 'Login berhasil, mengalihkan...' : 'Memverifikasi akun...'}</span>
              </>
            ) : lockRemaining > 0 ? (
              <>
                <span>Terkunci {lockRemaining}s</span>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </>
            ) : (
              <>
                <span>Masuk ke SIMPEG</span>
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Bersih: Atribusi Developer */}
      <div className="mt-8 pt-4 border-t border-white/15 text-center">
        <p className="text-xs text-white/80 font-medium tracking-wide">
          Developer:{' '}
          <span className="font-bold text-white">Miftahul haq, S.Pd</span>
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  FORM LOGIN MOBILE — MENGADAPTASI UI/UX REFERENSI HALAMAN LOGIN 2          */
/* -------------------------------------------------------------------------- */
function MobileLoginForm({
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
  lockRemaining,
}) {
  return (
    <div className="w-full">
      {/* Form Title Sesuai Referensi 2 */}
      <div className="mb-5 text-left">
        <h2 className="text-xl sm:text-2xl font-black text-[#20243A] tracking-tight">
          Masuk ke Akun
        </h2>
        <p className="text-xs text-[#77819A] mt-1 leading-normal">
          Gunakan username atau NIY dan kata sandi Anda.
        </p>
      </div>

      {/* Form Fields — Gaya Soft Input Pill Sesuai Referensi 2 */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Kolom Username / NIY */}
        <div>
          <label
            htmlFor="mobile-identifier"
            className="block text-xs font-bold text-[#20243A] mb-1.5"
          >
            Username atau NIY
          </label>
          <div className="relative">
            <input
              autoComplete="username"
              id="mobile-identifier"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                clearFieldError('identifier')
              }}
              placeholder="Contoh: 029011052"
              disabled={isAuthenticating}
              aria-invalid={Boolean(fieldErrors.identifier)}
              className={[
                'w-full h-12 px-4 rounded-xl text-base text-[#20243A] placeholder-[#77819A]',
                'bg-[#F3F5FC] border transition-all duration-200 outline-none',
                fieldErrors.identifier
                  ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-[#E0E6F2] focus:border-[#323D8F] focus:bg-white focus:ring-2 focus:ring-[#323D8F]/15',
              ].join(' ')}
            />
          </div>
          {fieldErrors.identifier && (
            <span className="text-[11px] font-semibold text-red-500 mt-1 block">
              {fieldErrors.identifier}
            </span>
          )}
        </div>

        {/* Kolom Kata Sandi */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="mobile-password"
              className="block text-xs font-bold text-[#20243A]"
            >
              Kata Sandi
            </label>
          </div>
          <div className="relative">
            <input
              autoComplete="current-password"
              id="mobile-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearFieldError('password')
              }}
              placeholder="Masukkan kata sandi"
              disabled={isAuthenticating}
              aria-invalid={Boolean(fieldErrors.password)}
              className={[
                'w-full h-12 pl-4 pr-11 rounded-xl text-base text-[#20243A] placeholder-[#77819A]',
                'bg-[#F3F5FC] border transition-all duration-200 outline-none',
                fieldErrors.password
                  ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-[#E0E6F2] focus:border-[#323D8F] focus:bg-white focus:ring-2 focus:ring-[#323D8F]/15',
              ].join(' ')}
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#323D8F] transition-colors p-1"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              disabled={isAuthenticating}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {fieldErrors.password && (
            <span className="text-[11px] font-semibold text-red-500 mt-1 block">
              {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Baris Ingat Saya & Lupa Password */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#77819A]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isAuthenticating}
              className="w-4 h-4 rounded border-[#D5DCF7] text-[#323D8F] accent-[#323D8F] cursor-pointer"
            />
            <span className="font-medium">Ingat saya</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotMsg((v) => !v)}
            className="text-xs font-semibold text-[#323D8F] hover:text-[#283273] underline-offset-2 hover:underline transition-colors cursor-pointer"
          >
            Lupa kata sandi?
          </button>
        </div>

        {/* Banner Info Lupa Password */}
        {forgotMsg && (
          <div className="p-3 rounded-xl bg-[#EEF0FC] border border-[#D5DCF7] text-[#323D8F] text-xs leading-relaxed flex items-start gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px] text-[#323D8F] shrink-0 mt-0.5">info</span>
            <p className="text-[11px]">
              Silakan hubungi administrator Tata Usaha (TU) unit sekolah atau HRD untuk melakukan reset kata sandi akun Anda.
            </p>
          </div>
        )}

        {/* Banner Kesalahan Autentikasi */}
        {authError && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-[17px] text-red-500 shrink-0 mt-0.5">error</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-xs">{authError}</span>
              {authErrorCode && AUTH_ERROR_CODES[authErrorCode] && (
                <span className="text-[10.5px] opacity-90">
                  Penyebab: {AUTH_ERROR_CODES[authErrorCode]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tombol Aksi Masuk Sesuai Referensi 2: Rounded Pill Button Solid #323D8F */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAuthenticating || isNavigating || lockRemaining > 0}
            className={[
              'w-full h-12 rounded-full font-bold text-sm text-white',
              'bg-[#323D8F] hover:bg-[#283273] active:scale-[0.98]',
              'shadow-lg shadow-[#323D8F]/25 transition-all duration-200',
              'flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isAuthenticating || isNavigating ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>{isNavigating ? 'Login berhasil, mengalihkan...' : 'Memverifikasi akun...'}</span>
              </>
            ) : lockRemaining > 0 ? (
              <>
                <span>Terkunci {lockRemaining}s</span>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </>
            ) : (
              <>
                <span>Masuk ke SIMPEG</span>
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Bawah: Atribusi Developer */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-[#77819A] font-medium tracking-wide">
          Developer:{' '}
          <span className="font-bold text-[#20243A]">Miftahul haq, S.Pd</span>
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ENTRY POINT HALAMAN LOGIN                                                 */
/* -------------------------------------------------------------------------- */
function LoginPage() {
  const controller = useLoginController()

  return (
    <div
      className="relative min-h-screen h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#323D8F] selection:text-white sp-login-root"
      style={{
        background: 'radial-gradient(ellipse at center, #323D8F 0%, #252D6A 60%, #161B3D 100%)',
      }}
    >
      <LoginStyles />

      {/* ==================================================================== */}
      {/* 1. TAMPILAN DESKTOP (lg:flex): KARTU DUA PANEL (ANTI-TABRAKAN)        */}
      {/* ==================================================================== */}
      <div
        className={[
          'hidden lg:flex relative w-full max-w-[860px] min-h-[490px] rounded-[28px]',
          'shadow-2xl shadow-[#0c1236]/70 overflow-hidden',
          'border border-white/15 anim-simpeg-appear',
        ].join(' ')}
        style={{
          background: '#323D8F',
        }}
      >
        {/* SVG Lengkungan Kurva Organik Putih di Panel Kiri */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <svg
            className="w-full h-full"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            <path
              d="M 0,0
                 L 360,0
                 C 360,0 385,60 410,120
                 C 435,180 460,230 465,300
                 C 470,370 440,430 415,490
                 C 390,550 365,600 365,600
                 L 0,600 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Sisi Kiri: Showcase Kepegawaian & Presensi (Bidang Putih 46%) */}
        <div className="w-[46%] bg-transparent relative z-10 flex flex-col justify-center">
          <DesktopVisualShowcase />
        </div>

        {/* Sisi Kanan: Form Login Desktop (Bidang Navy 54%, Padding Aman Anti-Tabrakan) */}
        <div className="w-[54%] flex items-center justify-center p-8 lg:p-10 pl-6 lg:pl-10 relative z-10">
          <DesktopLoginForm {...controller} />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TAMPILAN MOBILE (< lg): ADAPTASI CARD UI/UX REFERENSI 2           */}
      {/* ==================================================================== */}
      <div className="flex lg:hidden flex-col items-center justify-center w-full max-w-[380px] sm:max-w-[400px] mx-auto anim-simpeg-appear my-auto">
        {/* Card Container Sesuai Referensi 2 */}
        <div className="w-full rounded-[36px] overflow-hidden shadow-2xl bg-white border border-slate-100 flex flex-col">
          {/* Header Banner Atas dengan Lengkungan Organik & Warna SIMPEG (#323D8F) */}
          <div className="relative bg-[#323D8F] pt-7 pb-9 px-6 text-center overflow-hidden">
            {/* Latar Belakang Lengkungan Organik Abstrak Sesuai Referensi 2 */}
            <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-[#323D8F]/60 blur-lg pointer-events-none" />
            <div className="absolute top-2 right-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-6 left-1/4 w-24 h-24 rounded-full bg-[#EEF0FC]/10 pointer-events-none" />

            {/* Logo Resmi SIMPEG & Judul Utama */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg mb-2.5 flex items-center justify-center">
                <img
                  src="/icons/logo-simpeg.png"
                  alt="Logo SIMPEG"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                SIMPEG
              </h1>
              <p className="text-[11px] font-medium text-indigo-100/80 mt-1 max-w-[220px]">
                Sistem Informasi Kepegawaian &amp; Presensi
              </p>
            </div>
          </div>

          {/* Lembar Kartu Putih yang Bertumpuk Sesuai Referensi 2 (-mt-4) */}
          <div className="relative z-20 bg-white rounded-t-[32px] -mt-4 px-6 pt-6 pb-6 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
            <MobileLoginForm {...controller} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
