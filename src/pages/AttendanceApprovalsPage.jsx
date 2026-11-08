import { useState, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { toast } from 'react-hot-toast'

function AttendanceApprovalsPage() {
  const { state, dispatch } = useSimPres()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(new Set())

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance_approvals?status=eq.pending&order=created_at.asc`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        }
      })
      const data = await res.json()
      setApprovals(data || [])
    } catch (err) {
      toast.error('Gagal memuat persetujuan presensi')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (approvalId, action, rejectionReason = '') => {
    if (action === 'rejected' && !rejectionReason) {
      const reason = prompt('Masukkan alasan penolakan:')
      if (!reason) return
      rejectionReason = reason
    }

    setProcessing(prev => new Set([...prev, approvalId]))
    try {
      const token = state.session?.access_token || localStorage.getItem('simpres.token') || ''
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance_approvals?id=eq.${approvalId}`, {
        method: 'PATCH',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: action,
          approved_by: state.currentUser.id,
          approved_at: new Date().toISOString(),
          rejection_reason: action === 'rejected' ? rejectionReason : null,
          updated_at: new Date().toISOString()
        })
      })

      if (!res.ok) throw new Error(`Gagal ${action} persetujuan`)

      const updated = await res.json()

      // Jika disetujui, buat record attendance
      if (action === 'approved' && updated && updated[0]) {
        const approval = updated[0]
        const attendanceRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attendance`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            staff_id: approval.staff_id,
            unit_id: approval.unit_id,
            tanggal: approval.tanggal,
            jam_masuk: approval.jam_masuk,
            jam_pulang: approval.jam_pulang,
            status: 'Tepat Waktu',
            method: 'Manual',
            presensi_id: `${approval.staff_id}-${approval.tanggal}`,
            catatan: `Disetujui oleh Superadmin: ${approval.catatan || '-'}`,
            photo_bucket: null,
            updated_at: new Date().toISOString()
          })
        })

        if (!attendanceRes.ok) {
          console.warn('Persetujuan tersimpan tapi gagal membuat record attendance')
        }
      }

      // Log aktivitas
      try {
        const logId = (state.logs?.length || 0) === 0 ? 1 : Math.max(0, ...(state.logs || []).map((l) => l.id)) + 1
        const now = new Date()
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        const time = `${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
        dispatch({ type: 'ADD_LOG', payload: {
          id: logId,
          time,
          actor: state.currentUser?.name || 'Superadmin',
          role: 'Superadmin',
          unit: state.currentUser?.unitId || '-',
          action: action === 'approved' ? 'Setujui' : 'Tolak',
          target: 'Presensi Manual',
          desc: `Presensi manual ${action === 'approved' ? 'disetujui' : 'ditolak'} (ID: ${approvalId})${action === 'rejected' ? ` - Alasan: ${rejectionReason}` : ''}`
        }})
      } catch { /* ignore log error */ }

      toast.success(`Presensi manual ${action === 'approved' ? 'disetujui' : 'ditolak'}`)
      loadApprovals()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(approvalId)
        return next
      })
    }
  }

  return (
    <div className="px-space-xl py-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Persetujuan Presensi Manual</h1>
          <p className="text-muted-foreground">
            Tinjau dan setujui atau tolak permintaan presensi manual dari Admin Unit.
          </p>
        </div>
        <button
          onClick={loadApprovals}
          className="h-10 px-4 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-sm font-medium"
        >
          Segarkan
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="text-muted-foreground">Memuat persetujuan...</span>
          </div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-card p-12 rounded-xl border border-border text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-600">✓</span>
          </div>
          <h3 className="text-lg font-medium text-foreground">Tidak ada permintaan persetujuan</h3>
          <p className="text-muted-foreground">Semua presensi manual sudah diproses.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 font-medium text-muted-foreground">Pegawai</th>
                <th className="pb-3 font-medium text-muted-foreground">Unit</th>
                <th className="pb-3 font-medium text-muted-foreground">Tanggal</th>
                <th className="pb-3 font-medium text-muted-foreground">Jam Masuk</th>
                <th className="pb-3 font-medium text-muted-foreground">Jam Pulang</th>
                <th className="pb-3 font-medium text-muted-foreground">Diajukan Oleh</th>
                <th className="pb-3 font-medium text-muted-foreground">Tanggal Ajukan</th>
                <th className="pb-3 font-medium text-muted-foreground text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map(a => (
                <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 text-foreground font-medium">{a.staff_name || 'Tidak diketahui'}</td>
                  <td className="py-3 text-muted-foreground">{a.unit_id}</td>
                  <td className="py-3 text-muted-foreground">{a.tanggal}</td>
                  <td className="py-3 text-muted-foreground">{a.jam_masuk || '-'}</td>
                  <td className="py-3 text-muted-foreground">{a.jam_pulang || '-'}</td>
                  <td className="py-3 text-muted-foreground">{a.requested_by_name || '-'}</td>
                  <td className="py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={() => handleAction(a.id, 'approved')}
                        disabled={processing.has(a.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {processing.has(a.id) ? '...' : 'Setujui'}
                      </button>
                      <button
                        onClick={() => handleAction(a.id, 'rejected', '')}
                        disabled={processing.has(a.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                      >
                        {processing.has(a.id) ? '...' : 'Tolak'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AttendanceApprovalsPage
