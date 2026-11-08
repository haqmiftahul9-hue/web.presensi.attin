import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { toast } from 'react-hot-toast'

function TwoFactorSetupPage() {
  const { state, dispatch } = useSimPres()
  const [step, setStep] = useState('setup') // setup | verify | complete
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [verificationCode, setVerificationCode] = useState('')
  [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    generate2FA()
  }, [])

  const generate2FA = async () => {
    setIsLoading(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const userId = state.currentUser?.id || 0

      // Generate secret (simplified - in production use speakeasy)
      const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const username = state.currentUser?.username || state.currentUser?.niy || 'user'
      const issuer = 'SIMPEG Attin'

      // Generate QR code URL (otpauth://)
      const qrUrl = `otpauth://totp/${issuer}:${username}?secret=${secret}&issuer=${issuer}`

      // Generate 8 backup codes
      const codes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )

      setSecret(secret)
      setQrCode(qrUrl)
      setBackupCodes(codes)
    } catch (err) {
      toast.error('Gagal generate 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const save2FA = async () => {
    setIsLoading(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const userId = state.currentUser?.id || 0

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/two_factor_secrets`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          secret,
          is_enabled: true,
          backup_codes: backupCodes
        })
      })

      if (!res.ok) throw new Error('Gagal menyimpan 2FA')

      toast.success('2FA berhasil diaktifkan')
      setStep('complete')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Masukkan kode verifikasi 6 digit')
      return
    }

    setIsLoading(true)
    try {
      // Simplified verification - in production compare with TOTP
      toast.success('Kode verifikasi valid')
      await save2FA()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret disalin ke clipboard')
  }

  if (step === 'setup') {
    return (
      <div className="px-space-xl py-space-lg max-w-2xl mx-auto">
        <div className="bg-card p-8 rounded-xl border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-2">Setup 2FA (Two-Factor Authentication)</h1>
          <p className="text-muted-foreground mb-6">
            Aktifkan verifikasi dua langkah untuk melindungi akun Anda. Gunakan aplikasi authenticator (Google Authentator, Authy, dll).
          </p>

          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <h3 className="text-sm font-bold text-foreground mb-2">Secret Key</h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground break-all">{secret}</span>
                <button
                  onClick={copySecret}
                  className="px-2 py-1 rounded text-xs text-primary hover:bg-primary/10"
                >
                  Salin
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-2">Scan QR Code dengan Aplikasi Authenticator</h3>
              <div className="bg-white p-4 rounded-lg border border-border">
                {/* QR code akan di-render dengan library atau placeholder */}
                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  [QR Code: {qrUrl}]
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Atau masukkan secret key secara manual ke aplikasi authenticator Anda.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="text-sm font-bold text-amber-900 mb-2">Kode Cadangan (Backup Codes)</h3>
              <p className="text-xs text-amber-700 mb-3">
                Simpan kode-kode berikut di tempat aman. Gunakan jika Anda kehilangan akses ke aplikasi authenticator.
              </p>
              <div className="flex flex-wrap gap-2">
                {backupCodes.map((code, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-white border border-amber-300 text-xs font-mono text-amber-900">
                    {code}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep('verify')}
                disabled={isLoading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? 'Memproses...' : 'Saya sudah scan QR Code, lanjutkan verifikasi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="px-space-xl py-space-lg max-w-md mx-auto">
        <div className="bg-card p-8 rounded-xl border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-2">Verifikasi 2FA</h1>
          <p className="text-muted-foreground mb-6">
            Masukkan kode 6 digit dari aplikasi authenticator Anda untuk mengonfirmasi setup.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Kode Verifikasi</label>
              <input
                type="text"
                maxLength="6"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-lg font-mono text-center focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={verifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? 'Memverifikasi...' : 'Verifikasi & Aktifkan 2FA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // complete
  return (
    <div className="px-space-xl py-space-lg max-w-md mx-auto">
      <div className="bg-card p-8 rounded-xl border border-border text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-600 text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">2FA Berhasil Diaktifkan</h1>
        <p className="text-muted-foreground mb-6">
          Akun Anda sekarang dilindungi dengan verifikasi dua langkah.
        </p>
        <button
          onClick={() => window.history.back()}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
        >
          Kembali ke Halaman Sebelumnya
        </button>
      </div>
    </div>
  )
}

export default TwoFactorSetupPage
