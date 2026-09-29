import { useState } from 'react'
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

const INPUT_CLASS =
  'w-full bg-transparent px-3.5 py-2.5 text-[15px] leading-6 text-on-surface placeholder:text-outline outline-none'
const FIELD_WRAP =
  'group relative rounded-xl border border-[color:var(--sp-line)] bg-white transition-all duration-200 ease-out ' +
  '[--sp-line:#E2E8F1] [--sp-line-hover:#CBD5E4] [--sp-focus:#2563EB] [--sp-ring:rgba(37,99,235,0.12)] ' +
  'hover:border-[color:var(--sp-line-hover)] focus-within:border-[color:var(--sp-focus)] ' +
  'focus-within:ring-4 focus-within:ring-[color:var(--sp-ring)]'
const FIELD_WRAP_ERROR = '[--sp-line:#F2C3CD] [--sp-line-hover:#EDA9B6] [--sp-focus:#E11D48]'
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant'
const ERROR_CLASS = 'animate-sp-rise text-[11px] font-medium text-rose-600'

// Gerbang ganti kata sandi. Dirender ProtectedRoute sebagai pengganti isi
// halaman saat akun ber-mustChangePassword (akun Guru/Pegawai hasil seed,
// akun hasil reset admin) atau saat pengguna menekan tombol "Ganti Password"
// di sidebar. Tidak ada rute baru: guard yang sama dengan Bollan redirect login
// yang sudah ada, jadi sidebar dan header tetap terlihat di belakang.
function ChangePasswordGate() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()

  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const unitLabel = selectActiveUnitLabel(state)
  const minLength = selectMinPasswordLength(state)
  const isForced = Boolean(currentUser?.mustChangePassword)
  const isOpen = selectCanChangeOwnPassword(state) && selectMustChangePassword(state)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setFieldErrors({})
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
    reset()
  }

  // Pengaman lapis komponen: meski pun gerbang diminta tanpa hak (mis. aksi
  // REQUEST_PASSWORD_CHANGE yang lolos ke store), role tanpa izin tidak
  // pernah melihat modal ini. Diletakkan setelah semua hook supaya urutan
  // pemanggilan hook tetap stabil antar render.
  if (!isOpen && !notice) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-primary/70 px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[480px] animate-sp-rise rounded-2xl bg-surface-container-lowest p-6 shadow-[0_40px_80px_-32px_rgba(11,31,61,0.7)] sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <span className="material-symbols-outlined text-amber-600 text-[22px]">lock_reset</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {isForced ? 'Ganti Kata Sandi Anda' : 'Ganti Kata Sandi'}
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {isForced
                ? 'Demi keamanan, kata sandi bawaan hanya berlaku sekali. Buat kata sandi baru untuk melanjutkan.'
                : 'Masukkan kata sandi lama lalu pilih kata sandi baru untuk akun ini.'}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-surface-container-low px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Akun</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">
              {currentUser?.username || currentUser?.niy || currentUser?.email || '-'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Role &amp; Unit</span>
            <span className="font-body-md text-body-md text-on-surface truncate">{currentRole} &middot; {unitLabel}</span>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex animate-sp-rise items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 font-body-md text-body-md leading-relaxed text-rose-700"
          >
            <span className="material-symbols-outlined text-[18px] mt-px">error</span>
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            role="status"
            className="mt-4 flex animate-sp-rise items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 font-body-md text-body-md leading-relaxed text-emerald-700"
          >
            <span className="material-symbols-outlined text-[18px] mt-px">check_circle</span>
            <span>{notice}</span>
          </div>
        ) : null}

        <form className="mt-5 space-y-3.5" onSubmit={handleSubmit} noValidate>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="currentPassword" className={LABEL_CLASS}>Kata Sandi Lama</label>
              {fieldErrors.currentPassword && <span className={ERROR_CLASS}>{fieldErrors.currentPassword}</span>}
            </div>
            <div className={`${FIELD_WRAP} mt-1.5 ${fieldErrors.currentPassword ? FIELD_WRAP_ERROR : ''}`}>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                placeholder="Kata sandi bawaan / lama"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setError(null)
                  setNotice(null)
                  if (fieldErrors.currentPassword) setFieldErrors((p) => ({ ...p, currentPassword: '' }))
                }}
                aria-invalid={Boolean(fieldErrors.currentPassword)}
                className={INPUT_CLASS}
                required
                disabled={!isOpen || Boolean(notice)}
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
                  setNotice(null)
                  if (fieldErrors.newPassword) setFieldErrors((p) => ({ ...p, newPassword: '' }))
                }}
                aria-invalid={Boolean(fieldErrors.newPassword)}
                className={INPUT_CLASS}
                required
                disabled={!isOpen || Boolean(notice)}
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
                  setNotice(null)
                  if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: '' }))
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                className={INPUT_CLASS}
                required
                disabled={!isOpen || Boolean(notice)}
              />
            </div>
          </div>

          {isOpen && !notice ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Syarat: minimal {minLength} karakter dan berbeda dari kata sandi lama.
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={!isOpen || Boolean(notice)}
              className="flex-1 rounded-xl bg-primary px-4 py-3 font-body-md-medium text-body-md-medium text-on-primary transition-colors duration-200 hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-surface-container-highest disabled:text-on-surface-variant"
            >
              Simpan Kata Sandi
            </button>
            {isForced ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-outline/30 px-4 py-3 font-body-md-medium text-body-md-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low"
              >
                Keluar
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordGate
