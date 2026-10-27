import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

const LOCAL_KEY = 'simpres.announcements'

function localLoad() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function localSave(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export async function loadAnnouncements({ unitId, niy } = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      let q = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      const { data, error } = await q
      if (error) throw error
      const rows = (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        author: r.author,
        target: r.target || 'all',
        targetUnit: r.target_unit,
        createdAt: r.created_at,
      }))
      // filter client-side by target
      return rows.filter((a) => {
        if (a.targetUnit && a.targetUnit !== unitId && a.targetUnit !== 'all') return false
        if (a.target && a.target !== 'all' && a.target !== niy) return false
        return true
      })
    } catch (err) {
      console.warn('[Announcement] Supabase load gagal, fallback localStorage:', err?.message)
    }
  }
  const list = localLoad()
  return list.filter((a) => {
    if (a.targetUnit && a.targetUnit !== unitId && a.targetUnit !== 'all') return false
    if (a.target && a.target !== 'all' && a.target !== niy) return false
    return true
  })
}

export async function addAnnouncement(item) {
  const payload = {
    title: item.title,
    body: item.body,
    author: item.author || 'Superadmin',
    target: item.target || 'all',
    target_unit: item.targetUnit || null,
  }
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('announcements').insert(payload).select().single()
      if (error) throw error
      return {
        id: data.id,
        title: data.title,
        body: data.body,
        author: data.author,
        target: data.target,
        targetUnit: data.target_unit,
        createdAt: data.created_at,
      }
    } catch (err) {
      console.warn('[Announcement] Supabase insert gagal, fallback localStorage:', err?.message)
    }
  }
  const list = localLoad()
  const next = [{ id: Date.now(), createdAt: new Date().toISOString(), ...item, targetUnit: item.targetUnit || null }, ...list].slice(0, 50)
  localSave(next)
  return next[0]
}

export async function deleteAnnouncement(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      return true
    } catch (err) {
      console.warn('[Announcement] Supabase delete gagal, fallback localStorage:', err?.message)
    }
  }
  const list = localLoad().filter((a) => a.id !== id)
  localSave(list)
  return true
}

export async function loadAllAnnouncements() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        author: r.author,
        target: r.target || 'all',
        targetUnit: r.target_unit,
        createdAt: r.created_at,
      }))
    } catch (err) {
      console.warn('[Announcement] Supabase load all gagal, fallback localStorage:', err?.message)
    }
  }
  return localLoad()
}