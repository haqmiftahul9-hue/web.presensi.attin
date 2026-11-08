/**
 * PasswordPolicyService - Validasi dan manajemen kebijakan password
 * Membaca policy dari Supabase tabel password_policies
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function getPasswordPolicy(token = '') {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/password_policies?is_active=eq.true&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })
    if (!res.ok) return null
    const data = await res.json()
    return data && data[0] ? data[0] : null
  } catch (err) {
    console.error('Gagal memuat password policy:', err)
    return null
  }
}

export function validatePassword(password, policy) {
  const errors = []

  if (!password) {
    errors.push('Password tidak boleh kosong')
    return { valid: false, errors, score: 0 }
  }

  if (password.length < policy.min_length) {
    errors.push(`Minimal ${policy.min_length} karakter`)
  }

  if (policy.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Minimal 1 huruf besar')
  }

  if (policy.require_lowercase && !/[a-z]/.test(password)) {
    errors.push('Minimal 1 huruf kecil')
  }

  if (policy.require_numbers && !/[0-9]/.test(password)) {
    errors.push('Minimal 1 angka')
  }

  if (policy.require_symbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Minimal 1 simbol (!@#$%^&*)')
  }

  // Hitung kekuatan password (0-4)
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(score, 4)
  }
}

export function getPasswordStrengthLabel(score) {
  switch (score) {
    case 0: return { label: 'Sangat Lemah', color: 'text-rose-500' }
    case 1: return { label: 'Lemah', color: 'text-rose-600' }
    case 2: return { label: 'Sedang', color: 'text-amber-600' }
    case 3: return { label: 'Kuat', color: 'text-emerald-600' }
    case 4: return { label: 'Sangat Kuat', color: 'text-emerald-700' }
    default: return { label: 'Tidak diketahui', color: 'text-muted-foreground' }
  }
}

export async function checkPasswordHistory(password, userId, token = '') {
  // Cek apakah password pernah digunakan sebelumnya
  // Implementasi sederhana - dalam produksi simpan hash password history
  return { isReused: false }
}

export async function recordPasswordChange(userId, newPasswordHash, token = '') {
  // Catat perubahan password untuk audit trail
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/password_change_history`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        password_hash: newPasswordHash,
        changed_at: new Date().toISOString()
      })
    })
    return res.ok
  } catch (err) {
    console.error('Gagal mencatat perubahan password:', err)
    return false
  }
}
