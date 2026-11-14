import { useEffect, useRef, useState } from 'react'
import {
  useSimPres,
  selectCurrentUser,
  selectCurrentUserRole,
  selectActiveUnitLabel,
  selectCanChangeOwnPassword,
  selectMinPasswordLength,
  selectMustChangePassword,
  validatePasswordChange,
  performLogout,
} from '../store/simPresStore.jsx'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'

const LABEL_CLASS = 'text-[10px] font-semibold text-foreground uppercase tracking-wider'
const ERROR_CLASS = 'animate-sp-rise text-[10px] font-medium text-destructive'
const FIELD_WRAP =
  'group relative rounded-xl border border-input bg-card transition-all duration-200 ' +
  'hover:border-border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring'
const FIELD_WRAP_ERROR = 'border-destructive focus-within:border-destructive focus-within:ring-destructive/30'
const INPUT_CLASS =
  'w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none'
const TOGGLE_CLASS =
  'absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg ' +
  'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer'

function passwordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  return score
}

function strengthLabel(score) {
  return ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][score] || 'Sangat lemah'
}

function strengthColor(score) {
  return [
    'bg-destructive text-destructive',
    'bg-amber-500 text-amber-600 dark:text-amber-400',
    'bg-blue-500 text-blue-600 dark:text-blue-400',
    'bg-emerald-500 text-emerald-600 dark:text-emerald-400',
    'bg-emerald-600 text-emerald-700 dark:text-emerald-300',
  ][score] || 'bg-destructive text-destructive'
}

function ChangePasswordGate() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()

  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const unitLabel = selectActiveUnitLabel(state)
  const minLength = selectMinPasswordLength(state)
  const dipaksa = Boolean(currentUser?.mustChangePassword)
  const dimintaSendiri = Boolean(state.passwordChangeRequested)
  const terbuka = selectCanChangeOwnPassword(state) && selectMustChangePassword(state)
  const bisaTutup = Boolean(state.notice) || (dimintaSendiri && !dipaksa)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const inputRef = useRef(null)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setError(null)
    setNotice(null)
    setFieldErrors({})
  }

  const tutup = () => {
    if (!bisaTutup) return
    reset()
    dispatch({ type: 'CANCEL_PASSWORD_CHANGE' })
  }

  const handleLogout = () => {
    reset()
    performLogout(dispatch)
    navigate('/login', { replace: true })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const localErrors = {}
    if (!currentPassword) localErrors.currentPassword = 'Wajib diisi.'
    if (!newPassword) localErrors.newPassword = 'Wajib diisi.'
    else if (newPassword.length < minLength) localErrors.newPassword = `Minimal ${minLength} karakter.`
    if (!confirmPassword) localErrors.confirmPassword = 'Wajib diisi.'
    else if (confirmPassword !== newPassword) localErrors.confirmPassword = 'Konfirmasi tidak cocok.'
    setFieldErrors(localErrors)
    if (Object.keys(localErrors).length > 0) return

    const result = validatePasswordChange(state, { currentPassword, newPassword, confirmPassword })
    if (!result.ok) {
      setError(result.error)
      return
    }

    setError(null)
    dispatch({ type: 'CHANGE_PASSWORD', payload: { account: currentUser, password: newPassword } })
    setNotice('Kata sandi berhasil diperbarui. Gunakan kata sandi baru untuk login berikutnya.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
  }

  useEffect(() => {
    if (terbuka) inputRef.current?.focus()
  }, [terbuka])

  useEffect(() => {
    if (!terbuka || !bisaTutup) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') tutup()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [terbuka, bisaTutup])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (!terbuka && !notice) return undefined
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [terbuka, notice])

  if (!terbuka && !notice) return null

  const togglePassword = (field) => {
    setError(null)
    if (field === 'current') setShowCurrent((v) => !v)
    if (field === 'new') setShowNew((v) => !v)
    if (field === 'confirm') setShowConfirm((v) => !v)
  }

  return (
    <div
      onClick={tutup}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 px-4 sm:px-6 backdrop-blur-sm sm:backdrop-blur-md"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ubah-sandi-judul"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[92dvh] overflow-y-auto overscroll-contain animate-sp-rise rounded-2xl bg-card border border-border p-6 pb-8 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Icon name="lock_reset" className="text-[26px] text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ubah-sandi-judul" className="text-lg font-bold text-foreground tracking-tight">
              {dipaksa ? 'Ganti Kata Sandi Anda' : 'Ubah Kata Sandi'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {dipaksa
                ? 'Kata sandi bawaan hanya berlaku sekali. Buat kata sandi baru sebelum melanjutkan ke sistem.'
                : 'Masukkan kata sandi saat ini, lalu buat kata sandi baru untuk akun ini.'}
            </p>
          </div>
          {bisaTutup && (
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup modal ubah kata sandi"
              className="sp-press -mt-1 -mr-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-muted/50 border border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className={LABEL_CLASS}>Akun</span>
            <span className="text-sm font-semibold text-foreground truncate">
              {currentUser?.name || currentUser?.username || currentUser?.niy || currentUser?.email || '-'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={LABEL_CLASS}>Role &amp; Unit</span>
            <span className="text-sm font-semibold text-foreground truncate">{currentRole} &middot; {unitLabel}</span>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-sm leading-relaxed text-destructive"
          >
            <Icon name="error" className="mt-0.5 text-[20px]" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3.5 text-sm leading-relaxed text-emerald-600 dark:text-emerald-400"
          >
            <Icon name="check_circle" className="mt-0.5 text-[20px]" />
            <span>{notice}</span>
          </div>
        ) : null}

        {notice ? (
          <button
            type="button"
            onClick={tutup}
            className="mt-6 w-full h-11 rounded-xl bg-primary hover:bg-primary/90 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors cursor-pointer"
          >
            Selesai
          </button>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="currentPassword" className={LABEL_CLASS}>Kata Sandi Saat Ini</label>
                {fieldErrors.currentPassword && <span className={ERROR_CLASS}>{fieldErrors.currentPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-2 ${fieldErrors.currentPassword ? FIELD_WRAP_ERROR : ''}`}>
                <input
                  ref={inputRef}
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi saat ini"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setError(null)
                    if (fieldErrors.currentPassword) setFieldErrors((p) => ({ ...p, currentPassword: '' }))
                  }}
                  aria-invalid={Boolean(fieldErrors.currentPassword)}
                  className={INPUT_CLASS}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword('current')}
                  aria-label={showCurrent ? 'Sembunyikan kata sandi saat ini' : 'Tampilkan kata sandi saat ini'}
                  className={TOGGLE_CLASS}
                >
                  <Icon name={showCurrent ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="newPassword" className={LABEL_CLASS}>Kata Sandi Baru</label>
                {fieldErrors.newPassword && <span className={ERROR_CLASS}>{fieldErrors.newPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-2 ${fieldErrors.newPassword ? FIELD_WRAP_ERROR : ''}`}>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={`Minimal ${minLength} karakter`}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setError(null)
                    if (fieldErrors.newPassword) setFieldErrors((p) => ({ ...p, newPassword: '' }))
                  }}
                  aria-invalid={Boolean(fieldErrors.newPassword)}
                  className={INPUT_CLASS}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword('new')}
                  aria-label={showNew ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                  className={TOGGLE_CLASS}
                >
                  <Icon name={showNew ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-2.5 flex w-full items-center gap-2">
                  <div className="flex-1 h-2 rounded-full border border-border/60 overflow-hidden">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-full w-1/4 ${i < passwordStrength(newPassword) ? strengthColor(passwordStrength(newPassword)) : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${strengthColor(passwordStrength(newPassword)).split(' ')[1]}`}>
                    {strengthLabel(passwordStrength(newPassword))}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="confirmPassword" className={LABEL_CLASS}>Konfirmasi Kata Sandi Baru</label>
                {fieldErrors.confirmPassword && <span className={ERROR_CLASS}>{fieldErrors.confirmPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-2 ${fieldErrors.confirmPassword ? FIELD_WRAP_ERROR : ''}`}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError(null)
                    if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: '' }))
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  className={INPUT_CLASS}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePassword('confirm')}
                  aria-label={showConfirm ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                  className={TOGGLE_CLASS}
                >
                  <Icon name={showConfirm ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Syarat: minimal {minLength} karakter, harus berbeda dari kata sandi saat ini, dan konfirmasi cocok.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors cursor-pointer"
              >
                Simpan Kata Sandi
              </button>
              {dipaksa ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-11 rounded-xl border border-border bg-card hover:bg-muted px-4 text-sm font-semibold text-foreground transition-colors cursor-pointer shadow-sm"
                >
                  Keluar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={tutup}
                  className="h-11 rounded-xl border border-border bg-card hover:bg-muted px-4 text-sm font-semibold text-foreground transition-colors cursor-pointer shadow-sm"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ChangePasswordGate
