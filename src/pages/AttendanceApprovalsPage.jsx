import { useState, useEffect, useCallback } from 'react'
import { useSimPres, selectScopedStaff, selectCurrentUser, selectCurrentUserRole, addActivityLog } from '../store/simPresStore.jsx'
import { attendanceApprovalService } from '../services/attendanceApprovalService.js'
import { toast } from 'react-hot-toast'
import { calculateAttendanceStatus } from '../data/jamKerja.js'

function AttendanceApprovalsPage() {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const isSuperadmin = currentRole === 'Superadmin'

  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(new Set())

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    try {
      let data = await attendanceApprovalService.listApprovals({ status: 'pending', order: 'created_at.asc' })
      if (!Array.isArray(data)) data = []

      const staffMap = new Map((selectScopedStaff(state) || []).map((s) => [s.id, s]))
      const enriched = data.map((a) => {
        const staff = staffMap.get(a.staff_id || a.staffId)
        return {
          ...a,
          id: a.id,
          staff_id: a.staff_id || a.staffId,
          unit_id: a.unit_id || a.unitId,
          staff_name: staff ? staff.name : (a.staff_name || a.requested_by_name || '-'),
          unit_name: staff ? (selectUnitNameById(state, staff.unitId) || staff.unitId) : (a.unit_id || a.unitId || '-'),
          requested_by_name: a.requested_by_name || (staff ? staff.name : '-'),
        }
      })
      setApprovals(enriched)
    } catch (err) {
      toast.error('Gagal memuat persetujuan presensi')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [state, dispatch])

  const handleAction = async (approvalId, action, rejectionReason = '') => {
    if (action === 'rejected' && !rejectionReason) {
      const reason = prompt('Masukkan alasan penolakan:')
      if (!reason) return
      rejectionReason = reason
    }

    setProcessing(prev => new Set([...prev, approvalId]))
    try {
      const updated = await attendanceApprovalService.updateApproval(approvalId, {
        status: action,
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        rejection_reason: action === 'rejected' ? rejectionReason : null,
        updated_at: new Date().toISOString(),
      })

      const approval = updated && updated[0] ? updated[0] : (approvals.find((a) => a.id === approvalId) || {})

      // Jika disetujui, buat record attendance di tabel + history agar Rekap terbaca
      if (action === 'approved' && approval.staff_id) {
        const staff = selectScopedStaff(state).find((s) => s.id === approval.staff_id || String(s.id) === String(approval.staff_id))
        const tanggal = approval.tanggal
        const jamMasuk = approval.jam_masuk || null
        const jamPulang = approval.jam_pulang || null
        const hasil = calculateAttendanceStatus(new Date(tanggal), jamMasuk, { jamPulang })

        // Simpan ke tabel attendance Supabase (idempotent via presensi_id)
        const presensiId = `${approval.staff_id}-${tanggal}`
        const attendancePayload = {
          staff_id: approval.staff_id,
          unit_id: approval.unit_id,
          tanggal,
          jam_masuk: jamMasuk,
          jam_pulang: jamPulang,
          status: hasil.status,
          late_minutes: hasil.lateMinutes,
          method: 'Manual',
          presensi_id,
          catatan: `Disetujui oleh Superadmin: ${approval.catatan || '-'}`,
          photo_bucket: null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
        try {
          await attendanceApprovalService.upsertAttendance(attendancePayload)
        } catch (err) {
          console.warn('Gagal upsert attendance ke tabel:', err)
        }

        // Tambah ke attendanceHistory agar Rekap/Ranking langsung terupdate
        const historyEntry = {
          id: `approval-${approval.id}`,
          staffId: approval.staff_id,
          unitId: approval.unit_id,
          name: staff ? staff.name : (approval.staff_name || '-'),
          niy: staff ? staff.niy : (approval.staff_niy || '-'),
          role: staff ? staff.role : (approval.staff_role || '-'),
          date: tanggal,
          tanggal,
          hari: hasil.hari,
          jamKerja: hasil.jamKerja,
          jamMasuk: hasil.jamMasuk,
          jamPulang: hasil.jamPulang,
          masuk: jamMasuk,
          pulang: jamPulang,
          method: 'Manual',
          lateMinutes: hasil.lateMinutes,
          status: hasil.status,
          source: 'manual_approval',
          approvalId: approval.id,
          createdAt: new Date().toISOString(),
        }
        dispatch({ type: 'ADD_ATTENDANCE_HISTORY', payload: historyEntry })

        addActivityLog(dispatch, state, 'Setujui', 'Presensi Manual',
          `Presensi manual ${staff ? staff.name : approval.staff_name} pada ${tanggal} disetujui`,
          currentUser.name, currentRole, currentUser.unitId)
      } else if (action === 'rejected') {
        addActivityLog(dispatch, state, 'Tolak', 'Presensi Manual',
          `Presensi manual ID ${approvalId} ditolak - Alasan: ${rejectionReason}`,
          currentUser.name, currentRole, currentUser.unitId)
      }

      // Update status approval di store
      dispatch({ type: 'UPDATE_ATTENDANCE_APPROVAL_STATUS', payload: { id: approvalId, changes: { status: action, rejection_reason: action === 'rejected' ? rejectionReason : null } } })

      toast.success(`Presensi manual ${action === 'approved' ? 'disetujui' : 'ditolak'}`)
      loadApprovals()
    } catch (err) {
      toast.error(err.message || `Gagal ${action} persetujuan`)
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
            Tinjau dan setujui atau tolak permintaan presensi manual dari Admin Unit. Disetujui otomatis tercatat ke Rekap.
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
                  <td className="py-3 text-muted-foreground">{a.unit_name || '-'}</td>
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

function getToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem('simpres.token') || window.localStorage.getItem('simpres.token') || ''
}

function selectUnitNameById(state, unitId) {
  if (!unitId) return '-'
  const u = state.units.find((un) => un.id === unitId)
  return u ? u.nama : unitId
}

export default AttendanceApprovalsPage
