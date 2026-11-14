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

const LABEL_CLASS = 'text-[11px] font-semibold text-foreground'
const ERROR_CLASS = 'animate-sp-rise text-[11px] font-medium text-destructive'
const FIELD_WRAP =
  'group relative rounded-lg border border-input bg-card transition-all duration-200 ' +
  'hover:border-border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring'
const FIELD_WRAP_ERROR = 'border-destructive focus-within:border-destructive focus-within:ring-destructive/30'
const INPUT_CLASS =
  'w-full px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none'
const TOGGLE_CLASS =
  'absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md ' +
  'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer'

// Kekuatan kata sandi (0-4): panjang, huruf besar, huruf kecil, angka, simbol.
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

/**
 * Modal ganti kata sandi.
 *
 * Dua mode dalam satu komponen:
 *  - DIPAKSA   : akun portal hasil reset admin. Tidak bisa ditutup sebelum
 *                kata sandi baru disimpan.
 *  - SUKRELA   : pengguna membuka lewat menu "Ubah password". Bisa ditutup
 *                dengan klik di luar kartu, tombol X, Batal, atau Escape.
 *
 * Setiap penutupan mengembalikan form ke state awal agar tidak ada sisa
 * input yang "nyangkut" di layar belakangnya.
 */
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

  // `notice` harus dideklarasikan sebelum `bisaTutup` (referensi di bawah).
  const bisaTutup = Boolean(notice) || (dimintaSendiri && !dipaksa)

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
    // Pengaman lapis komponen: aksi yang tidak berwenang tidak mengubah apa pun.
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
    else if (confirmPassword !== newPassword) localErrors.confirmPassword = 'Belum sama dengan kata sandi baru.'
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

  // Fokus otomatis ke field pertama saat modal dibuka.
  useEffect(() => {
    if (terbuka) inputRef.current?.focus()
  }, [terbuka])

  // Escape menutup modal (hanya yang boleh ditutup).
  useEffect(() => {
    if (!terbuka || !bisaTutup) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') tutup()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [terbuka, bisaTutup])

  // Kunci scroll body selama modal terbuka; kembalikan seperti semula saat ditutup.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (!terbuka && !notice) return undefined
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [terbuka, notice])

  // Gerbang tidak berhak (mis. Superadmin) tidak pernah menampilkan modal ini.
  if (!terbuka && !notice) return null

  const togglePassword = (field) => {
    setError(null)
    if (field === 'current') setShowCurrent((v) => !v)
    if (field === 'new') setShowNew((v) => !v)
    if (field === 'confirm') setShowConfirm((v) => !v)
  }

  return (
    <div
      // Area di luar kartu = menutup modal (hanya yang memang boleh ditutup).
      onClick={tutup}
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-black/60 px-3 pt-6 backdrop-blur-xs sm:items-center sm:px-5 sm:py-8"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ubah-sandi-judul"
        // Klik di dalam kartu tidak boleh menutup modal.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto overscroll-contain animate-sp-rise rounded-2xl bg-card border border-border p-5 pb-7 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Icon name="lock_reset" className="text-[24px] text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ubah-sandi-judul" className="text-base font-bold text-foreground tracking-tight">
              {dipaksa ? 'Ganti Kata Sandi Anda' : 'Ubah Kata Sandi'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {dipaksa
                ? 'Kata sandi bawaan hanya berlaku sekali. Buat kata sandi baru sebelum melanjutkan ke sistem.'
                : 'Masukkan kata sandi sekarang, lalu buat kata sandi baru untuk akun ini.'}
            </p>
          </div>
          {bisaTutup && (
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup modal ubah kata sandi"
              className="sp-press -mt-1 -mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-muted/40 border border-border px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Akun</span>
            <span className="text-xs font-semibold text-foreground truncate">
              {currentUser?.name || currentUser?.username || currentUser?.niy || currentUser?.email || '-'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Role &amp; Unit</span>
            <span className="text-xs font-semibold text-foreground truncate">{currentRole} &middot; {unitLabel}</span>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs leading-relaxed text-destructive"
          >
            <Icon name="error" className="mt-px text-[18px]" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-600 dark:text-emerald-400"
          >
            <Icon name="check_circle" className="mt-px text-[18px]" />
            <span>{notice}</span>
          </div>
        ) : null}

        {/* Setelah berhasil: satu tombol untuk menutup dan kembali ke sistem. */}
        {notice ? (
          <button
            type="button"
            onClick={tutup}
            className="mt-5 w-full h-10 rounded-lg bg-primary hover:bg-primary/90 px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors cursor-pointer"
          >
            Selesai
          </button>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="currentPassword" className={LABEL_CLASS}>Kata Sandi Sekarang</label>
                {fieldErrors.currentPassword && <span className={ERROR_CLASS}>{fieldErrors.currentPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.currentPassword ? FIELD_WRAP_ERROR : ''}`}>
                <input
                  ref={inputRef}
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Kata sandi yang saat ini digunakan"
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
                  aria-label={showCurrent ? 'Sembunyikan kata sandi sekarang' : 'Tampilkan kata sandi sekarang'}
                  className={TOGGLE_CLASS}
                >
                  <Icon name={showCurrent ? 'visibility_off' : 'visibility'} className="text-[15px]" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="newPassword" className={LABEL_CLASS}>Kata Sandi Baru</label>
                {fieldErrors.newPassword && <span className={ERROR_CLASS}>{fieldErrors.newPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.newPassword ? FIELD_WRAP_ERROR : ''}`}>
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
                  <Icon name={showNew ? 'visibility_off' : 'visibility'} className="text-[15px]" />
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-1 flex w-full">
                  <div className="flex-1 h-1.5 rounded-full border border-border/60 overflow-hidden">
                    {[
                      { ratio: 25 },
                      { ratio: 50 },
                      { ratio: 75 },
                      { ratio: 100 },
                    ].map((seg, i) => (
                      <div
                        key={i}
                        className={`h-full w-1/4 ${i < passwordStrength(newPassword) ? strengthColor(passwordStrength(newPassword)) : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2.5 text-[10px] font-semibold {strengthColor(passwordStrength(newPassword)).split(' ')[1]}">
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
              <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.confirmPassword ? FIELD_WRAP_ERROR : ''}`}>
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
                  <Icon name={showConfirm ? 'visibility_off' : 'visibility'} className="text-[15px]" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Syarat: minimal {minLength} karakter, harus berbeda dari kata sandi saat ini, dan konfirmasi cocok.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors cursor-pointer"
              >
                Simpan Kata Sandi
              </button>
              {dipaksa ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-10 rounded-lg border border-border bg-card hover:bg-muted px-4 text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-sm"
                >
                  Keluar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={tutup}
                  className="h-10 rounded-lg border border-border bg-card hover:bg-muted px-4 text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-sm"
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
