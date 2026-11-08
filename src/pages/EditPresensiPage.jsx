import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { toast } from 'react-hot-toast'

function EditPresensiPage() {
  const { state, dispatch } = useSimPres()
  const [attendance, setAttendance] = useState([])
  const [editing, setEditing] = useState(null)
  const [editData, setEditData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(new Set())

  useEffect(() => {
    loadAttendance()
  }, [])

  const loadAttendance = async () => {
    try {
      setLoading(true)
      const activeUnitId = state.selectedUnitId || state.currentUser?.unitId || 'sd'
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const url = state.selectedUnitId === 'all' || state.selectedUnitId === 'Semua Unit'
        ? `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance?order=tanggal.desc`
        : `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance?unit_id=eq.${activeUnitId}&order=tanggal.desc`
      const res = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()
      setAttendance(data || [])
    } catch (err) {
      toast.error('Gagal memuat data presensi')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (record) => {
    setEditing(record.id)
    setEditData({
      jam_masuk: record.jam_masuk || '',
      jam_pulang: record.jam_pulang || '',
      status: record.status || 'Tepat Waktu',
      catatan: record.catatan || ''
    })
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          ...editData,
          updated_at: new Date().toISOString(),
          edited_by: state.currentUser.id
        })
      })

      if (!res.ok) throw new Error('Gagal menyimpan perubahan')

      // Log aktivitas
      try {
        const logId = (state.logs?.length || 0) === 0 ? 1 : Math.max(0, ...(state.logs || []).map((l) => l.id)) + 1
        const now = new Date()
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        const time = `${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
        dispatch({ type: 'ADD_LOG', payload: {
          id: logId,
          time,
          actor: state.currentUser?.name || 'Sistem',
          role: state.currentUser?.role || 'Sistem',
          unit: state.currentUser?.unitId || '-',
          action: 'Ubah',
          target: 'Presensi',
          desc: `Edit data presensi ID ${id}: ${editData.jam_masuk || '-'} s/d ${editData.jam_pulang || '-'} (${editData.status})`
        }})
      } catch { /* ignore */ }

      toast.success('Data presensi berhasil diperbarui')
      setEditing(null)
      loadAttendance()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteAttendance = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data presensi ini? Tindakan tidak dapat dibatalkan.')) return

    setDeleting(prev => new Set([...prev, id]))
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!res.ok) throw new Error('Gagal menghapus data presensi')

      toast.success('Data presensi berhasil dihapus')
      loadAttendance()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const statusColor = (status) => {
    switch (status) {
      case 'Tepat Waktu': return 'bg-emerald-100 text-emerald-700'
      case 'Terlambat': return 'bg-amber-100 text-amber-700'
      case 'Alpha': return 'bg-rose-100 text-rose-700'
      case 'Izin': return 'bg-blue-100 text-blue-700'
      case 'Sakit': return 'bg-purple-100 text-purple-700'
      default: return 'bg-muted text-foreground'
    }
  }

  return (
    <div className="px-space-xl py-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit & Hapus Presensi</h1>
          <p className="text-muted-foreground">
            Koreksi data presensi yang salah tercatat. Hanya Superadmin dan Admin Unit berwenang.
          </p>
        </div>
        <button
          onClick={loadAttendance}
          className="h-10 px-4 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-sm font-medium"
        >
          Segarkan
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex items-center justify-center py-20">
          <span className="text-muted-foreground">Memuat data presensi...</span>
        </div>
      ) : attendance.length === 0 ? (
        <div className="bg-card p-12 rounded-xl border border-border text-center">
          <p className="text-muted-foreground">Tidak ada data presensi ditemukan.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 font-medium text-muted-foreground">Pegawai</th>
                <th className="pb-3 font-medium text-muted-foreground">Tanggal</th>
                <th className="pb-3 font-medium text-muted-foreground">Jam Masuk</th>
                <th className="pb-3 font-medium text-muted-foreground">Jam Pulang</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
                <th className="pb-3 font-medium text-muted-foreground">Metode</th>
                <th className="pb-3 font-medium text-muted-foreground text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(a => {
                const isEditing = editing === a.id
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 text-foreground font-medium">{a.staff_name || 'Tidak diketahui'}</td>
                    <td className="py-3 text-muted-foreground">{a.tanggal}</td>
                    <td className="py-3 text-muted-foreground">{a.jam_masuk || '-'}</td>
                    <td className="py-3 text-muted-foreground">{a.jam_pulang || '-'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{a.method || 'Manual'}</td>
                    <td className="py-3 text-center">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => saveEdit(a.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving ? '...' : 'Simpan'}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => startEdit(a)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAttendance(a.id)}
                            disabled={deleting.has(a.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                          >
                            {deleting.has(a.id) ? '...' : 'Hapus'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Form Overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card p-6 rounded-xl border border-border max-w-md w-full">
            <h2 className="text-lg font-bold text-foreground mb-4">Edit Presensi</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(editing) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Jam Masuk</label>
                <input
                  type="time"
                  value={editData.jam_masuk}
                  onChange={(e) => setEditData({...editData, jam_masuk: e.target.value})}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Jam Pulang</label>
                <input
                  type="time"
                  value={editData.jam_pulang}
                  onChange={(e) => setEditData({...editData, jam_pulang: e.target.value})}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({...editData, status: e.target.value})}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                >
                  <option value="Tepat Waktu">Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Alpha">Alpha</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Catatan</label>
                <textarea
                  value={editData.catatan}
                  onChange={(e) => setEditData({...editData, catatan: e.target.value})}
                  rows={3}
                  className="w-full h-32 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="h-10 px-4 rounded-lg bg-muted text-foreground hover:bg-muted/80"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditPresensiPage
