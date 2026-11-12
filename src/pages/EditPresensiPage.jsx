import { useState, useEffect, useCallback } from 'react'
import {
  useSimPres,
  selectScopedStaff,
  selectCurrentUser,
  selectCurrentUserRole,
  selectActiveUnitId,
  addActivityLog,
} from '../store/simPresStore.jsx'
import { attendanceApprovalService } from '../services/attendanceApprovalService.js'
import { toast } from 'react-hot-toast'
import { calculateAttendanceStatus } from '../data/jamKerja.js'

function EditPresensiPage() {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const activeUnitId = selectActiveUnitId(state)
  const isSuperadmin = currentRole === 'Superadmin'

  const [attendance, setAttendance] = useState([])
  const [staffMap, setStaffMap] = useState(new Map())
  const [editing, setEditing] = useState(null)
  const [editData, setEditData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(new Set())

  const loadStaff = useCallback(() => {
    const scoped = selectScopedStaff(state)
    const map = new Map(scoped.map((s) => [s.id, s]))
    setStaffMap(map)
  }, [state])

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const data = await attendanceApprovalService.listAttendance({ order: 'tanggal.desc' })
      const rows = Array.isArray(data) ? data : []

      let filtered = rows
      if (!isSuperadmin && activeUnitId) {
        filtered = rows.filter((a) => (a.unit_id || a.unitId) === activeUnitId)
      }

      loadStaff()
      setAttendance(filtered)
    } catch (err) {
      toast.error('Gagal memuat data presensi')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [state, isSuperadmin, activeUnitId, loadStaff])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const startEdit = (record) => {
    setEditing(record.id)
    setEditData({
      jam_masuk: record.jam_masuk || '',
      jam_pulang: record.jam_pulang || '',
      status: record.status || 'Tepat Waktu',
      catatan: record.catatan || '',
      method: record.method || 'Manual',
      late_minutes: record.late_minutes != null ? record.late_minutes : '',
    })
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      const record = attendance.find((a) => a.id === id || String(a.id) === String(id))
      if (!record) throw new Error('Data presensi tidak ditemukan')

      const staff = staffMap.get(record.staff_id || record.staffId)
      const tanggal = record.tanggal
      const jamMasuk = editData.jam_masuk || null
      const jamPulang = editData.jam_pulang || null
      const lateMinutesInput = editData.late_minutes != null ? Number(editData.late_minutes) : null
      const hasil = calculateAttendanceStatus(new Date(tanggal), jamMasuk, {
        jamPulang,
        lateMinutes: lateMinutesInput != null ? lateMinutesInput : undefined,
      })

      const changes = {
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        status: editData.status || hasil.status,
        catatan: editData.catatan || '',
        method: editData.method || 'Manual',
        late_minutes: hasil.lateMinutes,
        updated_at: new Date().toISOString(),
        edited_by: currentUser.id,
      }

      await attendanceApprovalService.patchAttendance(id, changes)

      const historyEntry = {
        id: `edit-${id}-${tanggal}`,
        staffId: record.staff_id || record.staffId,
        unitId: record.unit_id || record.unitId,
        name: staff ? staff.name : (record.staff_name || '-'),
        niy: staff ? staff.niy : (record.staff_niy || '-'),
        role: staff ? staff.role : (record.staff_role || '-'),
        date: tanggal,
        tanggal,
        hari: hasil.hari,
        jamKerja: hasil.jamKerja,
        jamMasuk: hasil.jamMasuk,
        jamPulang: hasil.jamPulang,
        masuk: jamMasuk,
        pulang: jamPulang,
        method: changes.method,
        lateMinutes: hasil.lateMinutes,
        status: changes.status,
        source: 'manual_edit',
        editId: id,
        updatedAt: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_ATTENDANCE_HISTORY', payload: historyEntry })

      const today = new Date().toISOString().slice(0, 10)
      if (tanggal === today) {
        const staffRecord = state.staff.find(
          (s) => s.id === record.staff_id || s.id === record.staffId
        )
        if (staffRecord) {
          dispatch({
            type: 'UPDATE_STAFF',
            payload: {
              id: staffRecord.id,
              masuk: jamMasuk,
              pulang: jamPulang,
              method: changes.method,
              lateMinutes: hasil.lateMinutes,
            },
          })
        }
      }

      addActivityLog(
        dispatch,
        state,
        'Ubah',
        'Presensi',
        `Edit data presensi ${staff ? staff.name : record.staff_name} pada ${tanggal}: ${jamMasuk || '-'} s/d ${jamPulang || '-'} (${changes.status})`,
        currentUser.name,
        currentRole,
        currentUser.unitId
      )

      toast.success('Data presensi berhasil diperbarui')
      setEditing(null)
      loadAttendance()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const deleteAttendance = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data presensi ini? Tindakan tidak dapat dibatalkan.')) return

    const record = attendance.find((a) => a.id === id || String(a.id) === String(id))
    if (!record) return

    setDeleting((prev) => new Set([...prev, id]))
    try {
      await attendanceApprovalService.deleteAttendance(id)

      dispatch({
        type: 'REMOVE_ATTENDANCE_HISTORY',
        payload: { staffId: record.staff_id || record.staffId, date: record.tanggal },
      })

      addActivityLog(
        dispatch,
        state,
        'Hapus',
        'Presensi',
        `Hapus data presensi ${record.staff_name || '-'} pada ${record.tanggal}`,
        currentUser.name,
        currentRole,
        currentUser.unitId
      )

      toast.success('Data presensi berhasil dihapus')
      loadAttendance()
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data presensi')
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const statusColor = (status) => {
    switch (status) {
      case 'Tepat Waktu':
        return 'bg-emerald-100 text-emerald-700'
      case 'Terlambat':
        return 'bg-amber-100 text-amber-700'
      case 'Alpha':
        return 'bg-rose-100 text-rose-700'
      case 'Izin':
        return 'bg-blue-100 text-blue-700'
      case 'Sakit':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-muted text-foreground'
    }
  }

  return (
    <div className="px-space-xl py-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit &amp; Hapus Presensi</h1>
          <p className="text-muted-foreground">
            Koreksi data presensi yang salah tercatat.{' '}
            {isSuperadmin ? 'Seluruh unit.' : 'Hanya pegawai unit Anda.'} Perubahan langsung tercatat ke Rekap.
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
              {attendance.map((a) => {
                const staff = staffMap.get(a.staff_id || a.staffId)
                const isEditing = editing === a.id
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 text-foreground font-medium">
                      {staff ? staff.name : a.staff_name || 'Tidak diketahui'}
                    </td>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card p-6 rounded-xl border border-border max-w-md w-full">
            <h2 className="text-lg font-bold text-foreground mb-4">Edit Presensi</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveEdit(editing)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Jam Masuk</label>
                <input
                  type="time"
                  value={editData.jam_masuk}
                  onChange={(e) => setEditData({ ...editData, jam_masuk: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Jam Pulang</label>
                <input
                  type="time"
                  value={editData.jam_pulang}
                  onChange={(e) => setEditData({ ...editData, jam_pulang: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
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
                <label className="block text-sm font-medium text-foreground mb-1">Keterlambatan (menit)</label>
                <input
                  type="number"
                  value={editData.late_minutes}
                  onChange={(e) => setEditData({ ...editData, late_minutes: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Catatan</label>
                <textarea
                  value={editData.catatan}
                  onChange={(e) => setEditData({ ...editData, catatan: e.target.value })}
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
