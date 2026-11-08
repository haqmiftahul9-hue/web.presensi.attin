import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { toast } from 'react-hot-toast'

function AdminPresensiManualPage() {
  const { state, dispatch } = useSimPres()
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [formData, setFormData] = useState({
    tanggal: '',
    jamMasuk: '',
    jamPulang: '',
    catatan: '',
    method: 'Manual'
  })
  const [submitting, setSubmitting] = useState(false)
  const [approvals, setApprovals] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)

  useEffect(() => {
    loadStaff()
    loadMyApprovals()
  }, [])

  const loadStaff = async () => {
    try {
      const unitId = state.currentUser?.unitId || 'sd'
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/staff?unit_id=eq.${unitId}&status=eq.Aktif&order=name.asc`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()
      setStaffList(data || [])
    } catch (err) {
      console.error('Gagal memuat daftar pegawai:', err)
    }
  }

  const loadMyApprovals = async () => {
    try {
      setApprovalsLoading(true)
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance_approvals?requested_by=eq.${state.currentUser?.id}&order=created_at.desc`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()
      setApprovals(data || [])
    } catch (err) {
      console.error('Gagal memuat riwayat persetujuan:', err)
    } finally {
      setApprovalsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStaff || !formData.tanggal) {
      toast.error('Pilih pegawai dan tanggal terlebih dahulu')
      return
    }
    if (!formData.jamMasuk && !formData.jamPulang) {
      toast.error('Minimal isi jam masuk atau jam pulang')
      return
    }

    setSubmitting(true)
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const approvalData = {
        staff_id: selectedStaff.id,
        unit_id: selectedStaff.unitId,
        requested_by: state.currentUser.id,
        requested_by_role: state.currentUser.role,
        tanggal: formData.tanggal,
        jam_masuk: formData.jamMasuk || null,
        jam_pulang: formData.jamPulang || null,
        status: 'pending',
        method: 'Manual',
        catatan: formData.catatan || ''
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance_approvals`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(approvalData)
      })

      if (!res.ok) throw new Error('Gagal mengajukan presensi manual')

      // Log aktivitas
      try {
        await addLog(dispatch, state, 'Tambah', 'Presensi Manual', `Presensi manual untuk ${selectedStaff.name} pada ${formData.tanggal} diajukan, menunggu persetujuan Superadmin`)
      } catch { /* ignore log error */ }

      toast.success('Presensi manual diajukan, menunggu persetujuan Superadmin')
      setFormData({ tanggal: '', jamMasuk: '', jamPulang: '', catatan: '', method: 'Manual' })
      setSelectedStaff(null)
      loadMyApprovals()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = (id) => {
    if (!window.confirm('Batalkan permintaan presensi manual ini?')) return
    setSubmitting(true)
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance_approvals?id=eq.${id}&status=eq.pending`, {
      method: 'DELETE',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${state.session?.access_token || localStorage.getItem('simpres.token') || ''}`,
      }
    })
      .then(() => {
        toast.success('Permintaan presensi manual dibatalkan')
        loadMyApprovals()
      })
      .catch(() => toast.error('Gagal membatalkan permintaan'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="px-space-xl py-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presensi Manual</h1>
          <p className="text-muted-foreground">
            Ajukan presensi masuk/pulang untuk pegawai. Perlu persetujuan Superadmin untuk mencegah penyalahgunaan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadStaff(); loadMyApprovals() }}
            className="h-10 px-4 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-sm font-medium"
          >
            Segarkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Form Presensi Manual</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Pegawai</label>
                  <select
                    value={selectedStaff?.id || ''}
                    onChange={(e) => setSelectedStaff(staffList.find(s => s.id === Number(e.target.value)) || null)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  >
                    <option value="">Pilih pegawai...</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.niy})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    value={formData.jamMasuk}
                    onChange={(e) => setFormData({...formData, jamMasuk: e.target.value})}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    value={formData.jamPulang}
                    onChange={(e) => setFormData({...formData, jamPulang: e.target.value})}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Catatan / Alasan</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                  rows={3}
                  className="w-full h-32 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="Alasan presensi manual (contoh: lupa absen, sistem error, dll)..."
                  disabled={submitting}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedStaff || !formData.tanggal || (!formData.jamMasuk && !formData.jamPulang)}
                  className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Mengajukan...' : 'Ajukan Presensi Manual'}
                </button>
              </div>
            </form>
          </div>

          {/* Riwayat Permintaan */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Riwayat Permintaan Presensi Manual Saya</h2>
            {approvalsLoading ? (
              <div className="animate-pulse flex items-center justify-center py-8">
                <span className="text-muted-foreground">Memuat riwayat...</span>
              </div>
            ) : approvals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada permintaan presensi manual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="pb-2 font-medium text-muted-foreground">Pegawai</th>
                      <th className="pb-2 font-medium text-muted-foreground">Tanggal</th>
                      <th className="pb-2 font-medium text-muted-foreground">Jam Masuk</th>
                      <th className="pb-2 font-medium text-muted-foreground">Jam Pulang</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Diajukan</th>
                      <th className="pb-2 font-medium text-muted-foreground">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map(a => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2 text-foreground font-medium">{a.staff_name || 'Tidak diketahui'}</td>
                        <td className="py-2 text-muted-foreground">{a.tanggal}</td>
                        <td className="py-2 text-muted-foreground">{a.jam_masuk || '-'}</td>
                        <td className="py-2 text-muted-foreground">{a.jam_pulang || '-'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            a.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {a.status === 'pending' ? 'Menunggu' : a.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="py-2">
                          {a.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(a.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700"
                            >
                              Batalkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-bold text-foreground mb-3">Cara Penggunaan</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Pilih pegawai dari daftar</li>
              <li>Masukkan tanggal dan jam presensi (masuk atau pulang)</li>
              <li>Tambahkan catatan alasan presensi manual</li>
              <li>Klik "Ajukan Presensi Manual"</li>
              <li>Superadmin akan menyetujui atau menolak permintaan</li>
              <li>Jika disetujui, data presensi akan tersimpan otomatis</li>
            </ol>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <h3 className="font-bold text-amber-900 mb-2">Peringatan Keamanan</h3>
            <p className="text-sm text-amber-800">
              Semua presensi manual memerlukan persetujuan Superadmin untuk mencegah penyalahgunaan dan kecurangan data kehadiran.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function addLog(dispatch, state, action, target, desc) {
  const logId = (state.logs?.length || 0) === 0 ? 1 : Math.max(0, ...(state.logs || []).map((l) => l.id)) + 1
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const time = `${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const log = {
    id: logId,
    time,
    actor: state.currentUser?.name || 'Sistem',
    role: state.currentUser?.role || 'Sistem',
    unit: state.currentUser?.unitId || '-',
    action,
    target,
    desc,
  }
  dispatch({ type: 'ADD_LOG', payload: log })
}

export default AdminPresensiManualPage
