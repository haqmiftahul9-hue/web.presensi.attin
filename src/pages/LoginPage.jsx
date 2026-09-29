import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useSimPres,
  performLogin,
  selectIsAuthenticating,
  selectAuthError,
  INITIAL_ACCOUNT_PASSWORD,
} from '../store/simPresStore.jsx'

// Warna border/ring tiap field disimpan sebagai CSS variable pada wrapper-nya.
// Karena itu blok focus hanya perlu satu aturan, dan varian error cukup
// menimpa variabelnya (tidak perlu mengulang properti border-color).
const FIELD_WRAP =
  'group relative rounded-xl border border-[color:var(--sp-line)] bg-white transition-all duration-200 ease-out ' +
  '[--sp-line:#E2E8F1] [--sp-line-hover:#CBD5E4] [--sp-focus:#2563EB] [--sp-ring:rgba(37,99,235,0.12)] ' +
  'hover:border-[color:var(--sp-line-hover)] focus-within:-translate-y-px focus-within:border-[color:var(--sp-focus)] ' +
  'focus-within:ring-4 focus-within:ring-[color:var(--sp-ring)] focus-within:shadow-[0_12px_28px_-18px_rgba(11,31,61,0.55)]'
const FIELD_WRAP_ERROR =
  '[--sp-line:#F2C3CD] [--sp-line-hover:#EDA9B6] [--sp-focus:#E11D48] [--sp-ring:rgba(225,29,72,0.10)]'
const FIELD_CONTROL =
  'w-full bg-transparent py-3 pl-11 text-[15px] leading-6 text-[#0B1B33] placeholder:text-[#9AA6B8] outline-none'
const FIELD_ICON =
  'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#7C8AA0] transition-colors duration-200 group-focus-within:text-[color:var(--sp-focus)]'
const LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.07em] text-[#5A6675] transition-colors duration-200 group-focus-within:text-[color:var(--sp-focus)]'
const FIELD_ERROR_CLASS = 'animate-sp-rise text-[11px] font-medium text-rose-600'
const LINK_CLASS =
  'text-[12px] font-semibold text-[#2563EB] underline-offset-2 transition-colors duration-200 hover:text-[#1D4ED8] hover:underline'

const FEATURES = ['Presensi Real-Time', 'Multi Unit Sekolah', 'Rekap Otomatis', 'Monitoring Kehadiran']

function Icon({ children, className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function BrandMark({ tone = 'dark', size = 'md' }) {
  const isLight = tone === 'light'
  const box = size === 'sm' ? 'h-9 w-9 rounded-[11px]' : 'h-10 w-10 rounded-[12px]'
  const glyph = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center ${box} ${
        isLight ? 'border border-white/15 bg-white/10' : 'bg-[#0B1F3D] shadow-[0_8px_18px_-12px_rgba(11,31,61,0.9)]'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className={glyph} aria-hidden="true">
        <path
          d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
          stroke={isLight ? '#8FBBFF' : '#5B93F8'}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path d="m8.8 10.2 2.2 2.2 4.2-4.4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Wordmark({ tone = 'dark', size = 'md', className = '', style }) {
  const isLight = tone === 'light'
  return (
    <div className={className} style={style}>
      <div className="flex items-center gap-3">
        <BrandMark tone={tone} size={size} />
        <div className="flex flex-col">
          <span
            className={`font-display-lg-mobile flex items-center gap-1.5 font-bold leading-none tracking-[-0.02em] ${
              size === 'sm' ? 'text-[18px]' : 'text-[20px]'
            } ${isLight ? 'text-white' : 'text-[#0B1F3D]'}`}
          >
            SimPres
            <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`} />
          </span>
          {size === 'md' && (
            <span className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#7C8AA0]">
              Sistem Presensi Digital
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PageBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#EFF2F8]" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(110% 80% at 10% -10%, rgba(37,99,235,0.16), transparent 58%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 95% 110%, rgba(11,31,61,0.16), transparent 60%)' }}
      />
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="sp-page-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0V64" fill="none" stroke="#0B1F3D" strokeWidth="1" opacity="0.045" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sp-page-grid)" />
      </svg>
      <div className="absolute -inset-20 animate-sp-drift-x will-change-transform">
        <svg className="h-full w-full">
          <path d="M-100 720 L1400 300" stroke="#0B1F3D" strokeWidth="1.2" opacity="0.05" />
          <path d="M-100 780 L1400 360" stroke="#0B1F3D" strokeWidth="1.2" strokeDasharray="9 11" opacity="0.045" />
        </svg>
      </div>
    </div>
  )
}

// Siluet garis (line-art) sekolah digital: gedung, geofence + pegawai, dan
// dashboard presensi. Monochrome navy dengan opacity rendah; hanya garis dan
// bidang transparan, bukan ilustrasi figuratif, supaya menyatu dengan panel dan
// tidak mengalihkan perhatian dari teks. max_h membuat proporsinya tetap rapi
// di layar pendek maupun tinggi.
function SchoolScene() {
  return (
    <svg
      viewBox="0 0 640 200"
      fill="none"
      className="h-auto w-full max-h-[clamp(96px,15vh,150px)] animate-sp-rise"
      style={{ animationDelay: '620ms' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sp-scene-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="330" cy="172" rx="300" ry="58" fill="url(#sp-scene-glow)" />

      <g stroke="#8FBBFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.42">
        {/* Bangunan sekolah modern */}
        <path d="M10 96 110 44l100 52" strokeOpacity="0.5" />
        <rect x="24" y="96" width="176" height="80" rx="5" fill="#FFFFFF" fillOpacity="0.04" strokeOpacity="0.5" />
        <path d="M44 124h26M86 124h26M128 124h26M170 124h26" strokeOpacity="0.4" />
        <path d="M44 156h26M170 156h26" strokeOpacity="0.4" />
        <rect x="88" y="140" width="44" height="36" rx="3" strokeOpacity="0.5" />
        <path d="M110 44V22" strokeOpacity="0.45" />
        <path d="M110 22h26l-8 7 8 7h-26" strokeOpacity="0.45" />

        {/* Geofence: dua cincin + pin lokasi */}
        <circle cx="290" cy="118" r="58" strokeOpacity="0.34" strokeDasharray="4 8" />
        <path d="M216 118a74 74 0 0 1 148 0" strokeOpacity="0.26" strokeDasharray="3 9" />
        <path d="M290 32c-8 0-14 6-14 13 0 10 14 22 14 22s14-12 14-22c0-7-6-13-14-13Z" fill="#8FBBFF" fillOpacity="0.12" strokeOpacity="0.5" />
        <circle cx="290" cy="45" r="4" strokeOpacity="0.55" />
        <path d="M266 67a24 24 0 0 1 48 0" strokeOpacity="0.22" />
        <path d="M254 67a36 36 0 0 1 72 0" strokeOpacity="0.16" />

        {/* Pegawai di dalam area geofence */}
        <circle cx="270" cy="126" r="10" fill="#8FBBFF" fillOpacity="0.12" strokeOpacity="0.5" />
        <path d="M250 176v-24a20 20 0 0 1 40 0v24" fill="#8FBBFF" fillOpacity="0.1" strokeOpacity="0.5" />
        <circle cx="316" cy="132" r="8" fill="#8FBBFF" fillOpacity="0.1" strokeOpacity="0.42" />
        <path d="M302 176v-20a14 14 0 0 1 28 0v20" fill="#8FBBFF" fillOpacity="0.08" strokeOpacity="0.42" />
        <rect x="300" y="148" width="20" height="26" rx="3" fill="#FFFFFF" fillOpacity="0.05" strokeOpacity="0.42" />
        <path d="M305 156h10" strokeOpacity="0.4" />

        {/* Dashboard presensi */}
        <rect x="380" y="62" width="204" height="114" rx="12" fill="#FFFFFF" fillOpacity="0.05" strokeOpacity="0.4" />
        <path d="M380 88h204" strokeOpacity="0.22" />
        <circle cx="396" cy="75" r="3" strokeOpacity="0.35" />
        <circle cx="408" cy="75" r="3" strokeOpacity="0.35" />
        <path d="M424 75h40" strokeOpacity="0.4" />
        <circle cx="558" cy="75" r="11" strokeOpacity="0.4" />
        <path d="m552 75 4 4 8-8" strokeOpacity="0.5" />
        <path d="M396 156h172" strokeOpacity="0.2" />
        <rect x="396" y="128" width="14" height="28" rx="2" fill="#8FBBFF" fillOpacity="0.14" strokeOpacity="0.4" />
        <rect x="420" y="112" width="14" height="44" rx="2" fill="#8FBBFF" fillOpacity="0.18" strokeOpacity="0.4" />
        <rect x="444" y="136" width="14" height="20" rx="2" fill="#8FBBFF" fillOpacity="0.12" strokeOpacity="0.4" />
        <rect x="468" y="120" width="14" height="36" rx="2" fill="#8FBBFF" fillOpacity="0.16" strokeOpacity="0.4" />
        <rect x="492" y="102" width="14" height="54" rx="2" fill="#8FBBFF" fillOpacity="0.22" strokeOpacity="0.4" />
        <path d="M528 104v52" strokeOpacity="0.24" />
        <path d="M540 156h20" strokeOpacity="0.3" />

        {/* Garis tanah dan partikel data */}
        <path d="M10 176h620" strokeOpacity="0.28" />
      </g>

      <g fill="#8FBBFF">
        <circle cx="240" cy="40" r="2" opacity="0.3" />
        <circle cx="352" cy="34" r="1.8" opacity="0.26" />
        <circle cx="622" cy="42" r="2" opacity="0.24" />
        <circle cx="200" cy="60" r="1.6" opacity="0.22" />
        <circle cx="614" cy="130" r="1.8" opacity="0.22" />
      </g>
    </svg>
  )
}

function BrandingPanel() {
  return (
    <aside className="order-1 relative flex flex-col justify-center overflow-hidden bg-[#0B1F3D] p-6 text-white sm:p-8 lg:order-2 lg:p-7">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full opacity-30">
          <defs>
            <pattern id="sp-panel-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sp-panel-grid)" />
        </svg>
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]">
          <circle cx="330" cy="120" r="210" stroke="#FFFFFF" strokeWidth="1.4" />
          <circle cx="60" cy="430" r="170" stroke="#FFFFFF" strokeWidth="1.4" />
        </svg>
        <div className="absolute -inset-16 animate-sp-drift-x will-change-transform">
          <svg className="h-full w-full opacity-[0.08]">
            <path d="M-40 220 L520 120" stroke="#FFFFFF" strokeWidth="1.3" />
            <path d="M-40 268 L520 168" stroke="#FFFFFF" strokeWidth="1.3" strokeDasharray="7 9" />
            <circle cx="330" cy="120" r="210" stroke="#FFFFFF" strokeWidth="1.3" strokeDasharray="6 8" />
          </svg>
        </div>
        <div className="absolute inset-x-0 -top-16 h-56 overflow-hidden opacity-[0.06]">
          <div className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent animate-sp-scan" />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(105% 78% at 12% 0%, rgba(37,99,235,0.28), transparent 58%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(200deg, rgba(19,44,84,0.55) 0%, transparent 45%)' }}
        />
      </div>

      <div className="relative z-10">
        <Wordmark tone="light" size="sm" className="animate-sp-rise" style={{ animationDelay: '180ms' }} />

        <h2 className="font-headline-lg mt-6 text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-white lg:text-[25px]">
          Presensi Digital Sekolah
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-300/90">
          Sistem presensi multi-unit untuk mengelola kehadiran guru dan pegawai secara real-time.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-white/10 pt-4 sm:grid-cols-1 lg:mt-7 lg:gap-y-3">
          {FEATURES.map((feature, index) => (
            <li
              key={feature}
              className="flex animate-sp-rise items-center gap-2.5 text-[12.5px] font-medium text-slate-200"
              style={{ animationDelay: `${400 + index * 80}ms` }}
            >
              <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-md border border-[#3B82F6]/35 bg-[#2563EB]/15">
                <Icon className="h-2.5 w-2.5 text-[#8FBBFF]">
                  <polyline points="20 6 9 17 4 12" />
                </Icon>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 hidden lg:block">
          <SchoolScene />
        </div>
      </div>
    </aside>
  )
}

function LoginPage() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const location = useLocation()

  const isAuthenticating = selectIsAuthenticating(state)
  const authError = selectAuthError(state)

  const [identifier, setIdentifier] = useState('049005069')
  const [password, setPassword] = useState(INITIAL_ACCOUNT_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isAuthenticating) return

    const errors = {}
    if (!identifier.trim()) errors.identifier = 'NIY atau email dinas wajib diisi.'
    if (!password) errors.password = 'Kata sandi wajib diisi.'
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

    if (result.ok) navigate(result.path, { replace: true })
  }

  return (
    <div className="sp-motion sp-login-root relative flex min-h-screen flex-col overflow-hidden bg-[#EFF2F8] font-body antialiased selection:bg-[#2563EB] selection:text-white lg:h-screen">
      <PageBackdrop />

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-6 sm:px-8 lg:py-6">
        <div className="w-full max-w-[960px] animate-sp-fade">
          <div className="grid overflow-hidden rounded-[24px] bg-white ring-1 ring-[#DCE4F0] shadow-[0_2px_4px_rgba(16,24,40,0.04),0_36px_72px_-32px_rgba(11,31,61,0.45)] lg:h-[560px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] [@media(min-width:1024px)_and_(min-height:900px)]:h-[600px]">
            <section className="order-2 flex flex-col justify-center px-6 py-7 sm:px-9 sm:py-8 lg:order-1 lg:px-12">
              <div className="animate-sp-slide" style={{ animationDelay: '90ms' }}>
                <Wordmark />
              </div>

              <div className="mt-7 animate-sp-slide" style={{ animationDelay: '150ms' }}>
                <h1 className="font-display-lg-mobile text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-[#0B1F3D] sm:text-[30px]">
                  Masuk ke SimPres
                </h1>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-[#5A6675]">
                  Kelola presensi digital sekolah secara aman dan terintegrasi.
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="group animate-sp-slide" style={{ animationDelay: '210ms' }}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="identifier" className={LABEL_CLASS}>
                      NIY / Email Dinas
                    </label>
                    {fieldErrors.identifier && <span className={FIELD_ERROR_CLASS}>{fieldErrors.identifier}</span>}
                  </div>
                  <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.identifier ? FIELD_WRAP_ERROR : ''}`}>
                    <div className={FIELD_ICON}>
                      <Icon>
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </Icon>
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      placeholder="Contoh: 049005069 atau nama@sekolah.sch.id"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value)
                        if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: '' }))
                      }}
                      aria-invalid={Boolean(fieldErrors.identifier)}
                      className={`${FIELD_CONTROL} pr-4`}
                      required
                      disabled={isAuthenticating}
                    />
                  </div>
                </div>

                <div className="group animate-sp-slide" style={{ animationDelay: '260ms' }}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="password" className={LABEL_CLASS}>
                      Kata Sandi
                    </label>
                    {fieldErrors.password && <span className={FIELD_ERROR_CLASS}>{fieldErrors.password}</span>}
                  </div>
                  <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.password ? FIELD_WRAP_ERROR : ''}`}>
                    <div className={FIELD_ICON}>
                      <Icon>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </Icon>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                      className={`${FIELD_CONTROL} pr-12`}
                      required
                      disabled={isAuthenticating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#94A3B8] transition-colors duration-200 hover:text-[#0B1B33] focus:outline-none focus-visible:text-[#2563EB] disabled:cursor-not-allowed"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      aria-pressed={showPassword}
                      disabled={isAuthenticating}
                    >
                      {showPassword ? (
                        <Icon>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </Icon>
                      ) : (
                        <Icon>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </Icon>
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className="flex animate-sp-slide items-center justify-between gap-3 pt-1"
                  style={{ animationDelay: '310ms' }}
                >
                  <label className="group/check inline-flex cursor-pointer select-none items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={isAuthenticating}
                      className="peer sr-only"
                    />
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border border-[#CBD5E1] bg-white transition-all duration-200 group-hover/check:border-[#94A3B8] peer-checked:border-[#0B1F3D] peer-checked:bg-[#0B1F3D] peer-checked:[&_svg]:scale-100 peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563EB] peer-focus-visible:ring-offset-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3 scale-50 text-white opacity-0 transition-all duration-200"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="text-[12.5px] text-[#5A6675] transition-colors duration-200 group-hover/check:text-[#0B1B33]">
                      Ingat saya di perangkat ini
                    </span>
                  </label>
                  <a href="#lupa-password" className={LINK_CLASS}>
                    Lupa password?
                  </a>
                </div>

                <div className="animate-sp-slide pt-1" style={{ animationDelay: '360ms' }}>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#0B1F3D] px-4 py-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_2px_rgba(11,31,61,0.20)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#132C54] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_30px_-18px_rgba(11,31,61,0.75)] active:translate-y-0 active:bg-[#08172E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#16304F] disabled:shadow-none"
                  >
                    {isAuthenticating ? (
                      <>
                        <Spinner />
                        <span>Memverifikasi akun...</span>
                        <span
                          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sp-sweep"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Akun</span>
                        <Icon className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </Icon>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {authError ? (
                <div
                  role="alert"
                  className="mt-5 flex animate-sp-rise items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-rose-700"
                >
                  <Icon className="mt-[1px] h-4 w-4 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </Icon>
                  <span>{authError}</span>
                </div>
              ) : (
                <p className="mt-5 text-center text-[12px] text-[#5A6675] animate-sp-rise" style={{ animationDelay: '410ms' }}>
                  Belum memiliki akun?{' '}
                  <a
                    href="#kontak-admin"
                    className="font-semibold text-[#2563EB] underline-offset-2 transition-colors hover:text-[#1D4ED8] hover:underline"
                  >
                    Hubungi Biro Kepegawaian
                  </a>
                </p>
              )}
            </section>

            <BrandingPanel />
          </div>

          <p className="mt-5 text-center text-[11px] text-[#8A94A6] animate-sp-fade" style={{ animationDelay: '320ms' }}>
            &copy; 2026 SimPres &middot; Seluruh hak cipta dilindungi
          </p>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
