import { useState } from 'react'
import { DEFAULT_STAFF_PASSWORD } from '../data/seed.js'

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Attin@${pass}`
}

function ResetStaffPasswordModal({ staff, onClose, onConfirm }) {
  const [passwordMode, setPasswordMode] = useState('default') // 'default' | 'custom'
  const [customPassword, setCustomPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetAttendance, setResetAttendance] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const activePassword = passwordMode === 'default' ? DEFAULT_STAFF_PASSWORD : customPassword

  const handleCopy = (text) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = () => {
    const generated = generateRandomPassword()
    setCustomPassword(generated)
    setPasswordMode('custom')
    setError('')
  }

  const handleSave = () => {
    if (passwordMode === 'custom') {
      if (!customPassword.trim()) {
        setError('Kata sandi baru tidak boleh kosong.')
        return
      }
      if (customPassword.trim().length < 6) {
        setError('Kata sandi minimal 6 karakter.')
        return
      }
    }
    const finalPassword = passwordMode === 'default' ? DEFAULT_STAFF_PASSWORD : customPassword.trim()
    onConfirm({
      staff,
      password: finalPassword,
      resetAttendance,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resetModalTitle"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">lock_reset</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-snug" id="resetModalTitle">
                Reset Kata Sandi Pegawai
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kredensial login mobile akan langsung aktif setelah direset.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Info Pegawai Card */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground text-sm">{staff?.name}</span>
              <span className="text-muted-foreground text-xs">{staff?.role}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border">
              <span className="text-[11px] font-mono text-foreground font-semibold">NIY: {staff?.niy}</span>
              <button
                type="button"
                onClick={() => handleCopy(staff?.niy)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Salin NIY"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            </div>
          </div>

          {/* Opsi Kata Sandi */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground block">
              Pilih Kata Sandi Baru
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opsi 1: Default */}
              <button
                type="button"
                onClick={() => {
                  setPasswordMode('default')
                  setError('')
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  passwordMode === 'default'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs">Sandi Standar</span>
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      passwordMode === 'default' ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  >
                    {passwordMode === 'default' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Gunakan sandi bawaan sistem: <code className="font-mono font-bold text-foreground">Attin123!</code>
                </span>
              </button>

              {/* Opsi 2: Custom */}
              <button
                type="button"
                onClick={() => {
                  setPasswordMode('custom')
                  if (!customPassword) setCustomPassword(generateRandomPassword())
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  passwordMode === 'custom'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs">Sandi Kustom / Acak</span>
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      passwordMode === 'custom' ? 'text-primary' : 'text-muted-foreground/40'
                    }`}
                  >
                    {passwordMode === 'custom' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Tentukan atau buat kata sandi acak baru
                </span>
              </button>
            </div>

            {/* Input Sandi Kustom */}
            {passwordMode === 'custom' && (
              <div className="space-y-1.5 pt-1 animate-sp-fade">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={(e) => {
                        setCustomPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Masukkan kata sandi baru..."
                      className="w-full h-9 px-3 pr-9 rounded-lg bg-card border border-input focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 text-xs text-foreground placeholder:text-muted-foreground font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Buat kata sandi acak"
                  >
                    <span className="material-symbols-outlined text-[16px]">shuffle</span>
                    <span>Acak</span>
                  </button>
                </div>
                {error && <span className="text-[11px] text-destructive block font-medium">{error}</span>}
              </div>
            )}
          </div>

          {/* Opsi Reset Presensi Hari Ini */}
          <div className="pt-2 border-t border-border">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={resetAttendance}
                onChange={(e) => setResetAttendance(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">
                  Reset status presensi hari ini
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Hapus jam masuk & pulang hari ini agar pegawai dapat melakukan presensi ulang jika diperlukan.
                </span>
              </div>
            </label>
          </div>

          {/* Kredensial Summary Banner */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">key</span>
                Informasi Login Mobile Guru:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(`NIY: ${staff?.niy}\nPassword: ${activePassword}`)}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {copied ? 'done' : 'content_copy'}
                </span>
                <span>{copied ? 'Tersalin' : 'Salin Kredensial'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-card/60 p-2 rounded-lg border border-border/50">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Username / NIY</span>
                <span className="font-bold text-foreground">{staff?.niy}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Kata Sandi</span>
                <span className="font-bold text-foreground">{activePassword}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            <span>Reset &amp; Simpan Sandi</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetStaffPasswordModal

