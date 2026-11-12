import { isSupabaseConfigured } from '../lib/supabaseClient.js'

const APPROVALS_KEY = 'simpres.attendanceApprovals'
const ATTENDANCE_KEY = 'simpres.attendanceTable'

function getToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem('simpres.token') || window.localStorage.getItem('simpres.token') || ''
}

function headers() {
  return {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }
}

function baseUrl() {
  return import.meta.env.VITE_SUPABASE_URL || ''
}

async function jsonOrText(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text().then((t) => { try { return JSON.parse(t) } catch { return t } })
}

// Operasi localStorage (fallback / mode offline)
function lsRead(store) {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(store) || '[]') } catch { return [] }
}
function lsWrite(store, data) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(store, JSON.stringify(data)) } catch { /* storage full/disabled */ }
}

async function supabaseRequest(path, opts = {}) {
  const url = `${baseUrl()}/rest/v1${path}`
  const headersObj = { ...headers(), ...(opts.headers || {}) }
  const res = await fetch(url, { ...opts, headers: headersObj })
  if (!res.ok) {
    const err = await jsonOrText(res).catch(() => ({}))
    throw new Error((err && err.message) || `Gagal ${opts.method || 'GET'} ${path}`)
  }
  return jsonOrText(res)
}

async function request(path, opts = {}) {
  const method = opts.method || 'GET'
  const body = opts.body ? JSON.parse(opts.body) : null

  // Coba Supabase jika terkonfigurasi
  if (isSupabaseConfigured && baseUrl()) {
    try {
      return await supabaseRequest(path, opts)
    } catch (err) {
      // Fallback diam-dalam ke localStorage jika remote gagal (tabel belum ada, token kosong, RLS, dll.)
      console.warn(`Supabase request gagal (${path}), fallback ke localStorage:`, err.message)
    }
  }

  // === LocalStorage fallback ===
  const store = path.includes('attendance_approvals') ? APPROVALS_KEY : ATTENDANCE_KEY

  if (method === 'GET') {
    let data = lsRead(store)
    const qs = new URLSearchParams((path.match(/\?(.*)$/) || [, ''])[1])
    if (qs.has('staff_id')) data = data.filter((d) => String(d.staff_id) === qs.get('staff_id'))
    if (qs.has('status')) data = data.filter((d) => d.status === qs.get('status'))
    if (qs.has('id')) {
      const idVal = qs.get('id').replace('eq.', '')
      data = data.filter((d) => String(d.id) === idVal)
    }
    if (qs.has('order')) {
      const field = qs.get('order').replace('.asc', '').replace('.desc', '')
      const desc = qs.get('order').includes('.desc')
      data.sort((a, b) => {
        const av = a[field], bv = b[field]
        if (av < bv) return desc ? 1 : -1
        if (av > bv) return desc ? -1 : 1
        return 0
      })
    }
    return data
  }

  if (method === 'POST') {
    const data = lsRead(store)
    const id = body.id || `loc-${Date.now()}`
    const row = { ...body, id, created_at: body.created_at || new Date().toISOString() }
    data.push(row)
    lsWrite(store, data)
    return [row]
  }

  if (method === 'PATCH') {
    const data = lsRead(store)
    const qs = new URLSearchParams((path.match(/\?(.*)$/) || [, ''])[1])
    const idVal = qs.get('id').replace('eq.', '')
    const idx = data.findIndex((d) => String(d.id) === idVal)
    if (idx === -1) throw new Error('Data tidak ditemukan')
    const updated = { ...data[idx], ...body, updated_at: new Date().toISOString() }
    data[idx] = updated
    lsWrite(store, data)
    return [updated]
  }

  if (method === 'DELETE') {
    const data = lsRead(store)
    const qs = new URLSearchParams((path.match(/\?(.*)$/) || [, ''])[1])
    const idVal = qs.get('id').replace('eq.', '')
    const statusVal = qs.get('status')
    const next = data.filter((d) => {
      if (String(d.id) !== idVal) return true
      if (statusVal && d.status !== statusVal) return true
      return false
    })
    lsWrite(store, next)
    return []
  }

  throw new Error(`Metode ${method} tidak didukung`)
}

export const attendanceApprovalService = {
  async listApprovals(params = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.order) qs.set('order', params.order)
    return request(`/attendance_approvals?${qs.toString()}`, { method: 'GET' })
  },
  async createApproval(payload) {
    return request('/attendance_approvals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
  },
  async updateApproval(id, changes) {
    return request(`/attendance_approvals?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(changes),
    })
  },
  async deleteApproval(id) {
    return request(`/attendance_approvals?id=eq.${id}&status=eq.pending`, { method: 'DELETE' })
  },
  async listAttendance(params = {}) {
    const qs = new URLSearchParams()
    if (params.unit_id) qs.set('unit_id', params.unit_id)
    if (params.order) qs.set('order', params.order)
    return request(`/attendance?${qs.toString()}`, { method: 'GET' })
  },
  async upsertAttendance(payload) {
    return request('/attendance', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
  },
  async patchAttendance(id, changes) {
    return request(`/attendance?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(changes),
    })
  },
  async deleteAttendance(id) {
    return request(`/attendance?id=eq.${id}`, { method: 'DELETE' })
  },
}
