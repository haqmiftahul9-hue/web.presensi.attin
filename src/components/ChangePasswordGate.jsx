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

const INPUT_CLASS =
  'w-full bg-transparent px-3.5 py-2.5 text-[16px] leading-6 text-on-surface placeholder:text-outline outline-none'
const FIELD_WRAP =
  'group relative rounded-xl border border-[color:var(--sp-line)] bg-white transition-all duration-200 ease-out ' +
  '[--sp-line:#E2E8F1] [--sp-line-hover:#CBD5E4] [--sp-focus:#2563EB] [--sp-ring:rgba(37,99,235,0.12)] ' +
  'hover:border-[color:var(--sp-line-hover)] focus-within:border-[color:var(--sp-focus)] ' +
  'focus-within:ring-4 focus-within:ring-[color:var(--sp-ring)]'
const FIELD_WRAP_ERROR = '[--sp-line:#F2C3CD] [--sp-line-hover:#EDA9B6] [--sp-focus:#E11D48]'
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant'
const ERROR_CLASS = 'animate-sp-rise text-[11px] font-medium text-rose-600'

/**
 * Modal ganti kata sandi.
 *
 * Dipakai dua mode dalam satu komponen:
 *  - DIPAKSA   : akun portal hasil reset admin. Tidak bisa ditutup — memang
 *                harus ganti sandi sebelum memakai sistem.
 *  - SUKRELA   : pengguna yang memakai tombol "Ganti Password"/"Ubah password".
 *                Ber behaving seperti modal biasa: klik di luar kartu, tekan X,
 *                tekan Batal, atau tekan Escape akan menutupnya.
 *
 * Menutup selalu mengembalikan state ke awal: seluruh field dikosongkan dan
 * permintaan ganti sandi dibatalkan di store, sehingga tidak ada modal yang
 * "nyangkut" dan halaman di belakangnya bisa disentuh lagi.
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
  // Bisa ditutup hanya bila pengguna yang membuka sendiri form ini.
  const bisaTutup = dimintaSendiri && !dipaksa

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const inputRef = useRef(null)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
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
    setNotice('Kata sandi berhasil diperbarui. Selamat datang kembali di SimPres.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  // Fokus otomatis ke field pertama saat modal dibuka, supaya pengguna mobile
  // bisa langsung mengetik tanpa menyentuh layar dulu.
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
  })

  // Latar tidak boleh bergulir selama modal terbuka; nilainya dikembalikan
  // persis seperti semula saat modal ditutup atau halaman dilepas, supaya
  // halaman di belakang tidak terkunci selamanya.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (!terbuka && !notice) return undefined
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [terbuka, notice])

  // Pengaman lapis komponen: meski pun gerbang diminta tanpa hak (mis. aksi
  // REQUEST_PASSWORD_CHANGE yang lolos ke store), role tanpa izin tidak pernah
  // melihat modal ini.
  if (!terbuka && !notice) return null

  return (
    <div
      // Area di luar kartu = menutup modal (hanya yang memang boleh ditutup).
      onClick={tutup}
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-primary/60 px-3 pt-6 backdrop-blur-sm sm:items-center sm:px-5 sm:py-8"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ubah-sandi-judul"
        // Klik di dalam kartu tidak boleh menutup modal.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] sm:max-w-[480px] max-h-[90dvh] overflow-y-auto overscroll-contain animate-sp-rise rounded-t-3xl sm:rounded-2xl bg-surface-container-lowest p-5 pb-6 shadow-[0_40px_80px_-32px_rgba(11,31,61,0.7)] sm:p-7"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Icon name="lock_reset" className="text-[22px] text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ubah-sandi-judul" className="font-headline-sm text-headline-sm text-on-surface">
              {dipaksa ? 'Ganti Kata Sandi Anda' : 'Ganti Kata Sandi'}
            </h2>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {dipaksa
                ? 'Demi keamanan, kata sandi bawaan hanya berlaku sekali. Buat kata sandi baru untuk melanjutkan.'
                : 'Masukkan kata sandi lama lalu pilih kata sandi baru untuk akun ini.'}
            </p>
          </div>
          {bisaTutup && (
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup modal ganti kata sandi"
              className="sp-press -mt-1 -mr-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-surface-container-low px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Akun</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">
              {currentUser?.username || currentUser?.niy || currentUser?.email || '-'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Role &amp; Unit</span>
            <span className="font-body-sm text-body-sm text-on-surface truncate">{currentRole} &middot; {unitLabel}</span>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex animate-sp-rise items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 font-body-sm text-body-sm leading-relaxed text-rose-700"
          >
            <Icon name="error" className="mt-px text-[18px]" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            className="mt-4 flex animate-sp-rise items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 font-body-sm text-body-sm leading-relaxed text-emerald-700"
          >
            <Icon name="check_circle" className="mt-px text-[18px]" />
            <span>{notice}</span>
          </div>
        ) : null}

        {/* Setelah berhasil: cukup satu tombol untuk menutup, supaya modal
            tidak menggantung di layar. */}
        {notice ? (
          <button
            type="button"
            onClick={tutup}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-3.5 font-body-md-medium text-body-md-medium text-on-primary transition-colors duration-200 active:scale-[0.99]"
          >
            Selesai
          </button>
        ) : (
          <form className="mt-5 space-y-3.5" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="currentPassword" className={LABEL_CLASS}>Kata Sandi Lama</label>
                {fieldErrors.currentPassword && <span className={ERROR_CLASS}>{fieldErrors.currentPassword}</span>}
              </div>
              <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.currentPassword ? FIELD_WRAP_ERROR : ''}`}>
                <input
                  ref={inputRef}
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Kata sandi bawaan / lama"
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
                  type="password"
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
              </div>
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
                  type="password"
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
              </div>
            </div>

            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Syarat: minimal {minLength} karakter dan berbeda dari kata sandi lama.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-primary px-4 py-3.5 font-body-md-medium text-body-md-medium text-on-primary transition-colors duration-200 hover:bg-primary-container active:scale-[0.99]"
              >
                Simpan Kata Sandi
              </button>
              {dipaksa ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-outline/30 px-4 py-3.5 font-body-md-medium text-body-md-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low"
                >
                  Keluar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={tutup}
                  className="rounded-xl border border-outline/30 px-4 py-3.5 font-body-md-medium text-body-md-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low active:scale-[0.99]"
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