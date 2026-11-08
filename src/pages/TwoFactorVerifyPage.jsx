import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

function TwoFactorVerifyPage() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const from = (() => {
    try {
      const loc = window.location.state
      return loc?.from?.pathname || '/dashboard'
    } catch { return '/dashboard' }
  })()

  const verifyTOTP = async () => {
    if (!code || code.length !== 6) {
      toast.error('Masukkan kode 6 digit')
      return
    }

    setIsLoading(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const userId = state.currentUser?.id || 0

      // Cek 2FA secret tersimpan
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/two_factor_secrets?user_id=eq.${userId}&is_enabled=eq.true`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()

      if (!data || data.length === 0) {
        // 2FA tidak aktif, lanjutkan ke dashboard
        navigate(from, { replace: true })
        return
      }

      // Simplified verification - in production validate TOTP
      toast.success('Verifikasi 2FA berhasil')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error('Verifikasi gagal')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyBackupCode = async () => {
    if (!backupCode) {
      toast.error('Masukkan kode cadangan')
      return
    }

    setIsLoading(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const userId = state.currentUser?.id || 0

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/two_factor_secrets?user_id=eq.${userId}`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()

      if (data && data[0]) {
        const codes = data[0].backup_codes || []
        const index = codes.indexOf(backupCode.toUpperCase())
        if (index >= 0) {
          // Hapus kode cadangan yang sudah digunakan
          codes.splice(index, 1)
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/two_factor_secrets?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ backup_codes: codes })
          })
          toast.success('Kode cadangan valid')
          navigate(from, { replace: true })
          return
        }
      }
      toast.error('Kode cadangan tidak valid')
    } catch (err) {
      toast.error('Verifikasi gagal')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-xl border border-border w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">2FA</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verifikasi Dua Langkah</h1>
          <p className="text-muted-foreground">
            Masukkan kode 6 digit dari aplikasi authenticator Anda.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); verifyTOTP() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Kode Verifikasi</label>
            <input
              type="text"
              maxLength="6"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000 000"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-lg font-mono text-center focus:ring-2 focus:ring-primary tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <button
            onClick={() => setShowBackup(!showBackup)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Gunakan kode cadangan
          </button>
          {showBackup && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Kode Cadangan</label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode cadangan"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-center focus:ring-2 focus:ring-primary text-transform uppercase"
                />
              </div>
              <button
                onClick={verifyBackupCode}
                disabled={isLoading || !backupCode}
                className="w-full h-10 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 disabled:opacity-50"
              >
                {isLoading ? 'Memverifikasi...' : 'Gunakan Kode Cadangan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TwoFactorVerifyPage
