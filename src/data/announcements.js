// Pengumuman (broadcast) superadmin/admin → mobile user.
// Disimpan di localStorage agar sinkron antar-tab tanpa backend.
const KEY = 'simpres.announcements'

export function loadAnnouncements() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAnnouncements(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function addAnnouncement(item) {
  const list = loadAnnouncements()
  const next = [{ id: Date.now(), createdAt: new Date().toISOString(), ...item }, ...list].slice(0, 50)
  saveAnnouncements(next)
  return next
}

export function deleteAnnouncement(id) {
  const list = loadAnnouncements().filter((a) => a.id !== id)
  saveAnnouncements(list)
  return list
}