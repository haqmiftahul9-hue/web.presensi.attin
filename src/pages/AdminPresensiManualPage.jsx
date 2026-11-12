import { useState, useEffect, useCallback } from 'react'
import { useSimPres, selectScopedStaff, selectCurrentUserRole, selectCurrentUser, selectActiveUnitId, addActivityLog } from '../store/simPresStore.jsx'
import { attendanceApprovalService } from '../services/attendanceApprovalService.js'
import { toast } from 'react-hot-toast'

function AdminPresensiManualPage() {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const currentRole = selectCurrentUserRole(state)
  const activeUnitId = selectActiveUnitId(state)
  const isSuperadmin = currentRole === 'Superadmin'
  const isAdminUnit = currentRole === 'Admin Unit'

  const [staffList, setStaffList] = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [formData, setFormData] = useState({
    tanggal: '',
    jamMasuk: '',
    jamPulang: '',
    catatan: '',
    method: 'Manual'
  })

  const loadStaff = useCallback(async () => {
    try {
      const scoped = selectScopedStaff(state)
      const list = scoped.filter((s) => s.status === 'Aktif').map((s) => ({
        id: s.id,
        name: s.name,
        niy: s.niy,
        unitId: s.unitId,
      }))
      setStaffList(list)
    } catch (err) {
      console.error('Gagal memuat daftar pegawai:', err)
    }
  }, [state])

  const loadApprovals = useCallback(async () => {
    setLoading(true)
    try {
      let data = await attendanceApprovalService.listApprovals({ order: 'created_at.desc' })
      if (!Array.isArray(data)) data = []

      // Scope: Admin Unit lihat hanya unitnya; Superadmin lihat semua
      let filtered = data
      if (isAdminUnit && activeUnitId) {
        filtered = data.filter((a) => (a.unit_id || a.unitId) === activeUnitId)
      }

      // Enrich nama pegawai
      const staffMap = new Map((selectScopedStaff(state) || []).map((s) => [s.id, s]))
      const enriched = filtered.map((a) => {
        const staff = staffMap.get(a.staff_id || a.staffId)
        return {
          ...a,
          staff_id: a.staff_id || a.staffId,
          unit_id: a.unit_id || a.unitId,
          staff_name: staff ? staff.name : (a.staff_name || a.requested_by_name || '-'),
          requested_by_name: a.requested_by_name || (staff ? staff.name : '-'),
        }
      })
      setApprovals(enriched)
      dispatch({ type: 'SYNC_ATTENDANCE_APPROVALS', payload: enriched })
    } catch (err) {
      toast.error('Gagal memuat riwayat presensi manual')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [state, isAdminUnit, activeUnitId, dispatch])

  useEffect(() => {
    loadStaff()
    loadApprovals()
  }, [loadStaff, loadApprovals])

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
      const payload = {
        staff_id: selectedStaff.id,
        unit_id: selectedStaff.unitId || activeUnitId,
        requested_by: currentUser.id,
        requested_by_role: currentRole,
        requested_by_name: currentUser.name,
        tanggal: formData.tanggal,
        jam_masuk: formData.jamMasuk || null,
        jam_pulang: formData.jamPulang || null,
        status: 'pending',
        method: 'Manual',
        catatan: formData.catatan || '',
        created_at: new Date().toISOString(),
      }

      await attendanceApprovalService.createApproval(payload)

      addActivityLog(dispatch, state, 'Tambah', 'Presensi Manual',
        `Presensi manual untuk ${selectedStaff.name} pada ${formData.tanggal} diajukan, menunggu persetujuan Superadmin`,
        currentUser.name, currentRole, currentUser.unitId)

      toast.success('Presensi manual diajukan, menunggu persetujuan Superadmin')
      setFormData({ tanggal: '', jamMasuk: '', jamPulang: '', catatan: '', method: 'Manual' })
      setSelectedStaff(null)
      loadApprovals()
    } catch (err) {
      toast.error(err.message || 'Gagal mengajukan presensi manual')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Batalkan permintaan presensi manual ini?')) return
    try {
      await attendanceApprovalService.deleteApproval(id)
      toast.success('Permintaan presensi manual dibatalkan')
      loadApprovals()
    } catch (err) {
      toast.error('Gagal membatalkan permintaan')
    }
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700'
      case 'rejected': return 'bg-rose-100 text-rose-700'
      default: return 'bg-amber-100 text-amber-700'
    }
  }
  const statusLabel = (status) => {
    if (status === 'pending') return 'Menunggu'
    if (status === 'approved') return 'Disetujui'
    return 'Ditolak'
  }

  return (
    <div className="px-space-xl py-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presensi Manual</h1>
          <p className="text-muted-foreground">
            Ajukan presensi masuk/pulang untuk pegawai. {isAdminUnit ? 'Perlu persetujuan Superadmin untuk mencegah penyalahgunaan.' : 'Kelola data presensi manual seluruh unit.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadStaff(); loadApprovals() }}
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
                    onChange={(e) => setSelectedStaff(staffList.find(s => String(s.id) === e.target.value) || null)}
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
            <h2 className="text-lg font-bold text-foreground mb-4">Riwayat Permintaan Presensi Manual</h2>
            {loading ? (
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
                      <th className="pb-2 font-medium text-muted-foreground">Unit</th>
                      <th className="pb-2 font-medium text-muted-foreground">Tanggal</th>
                      <th className="pb-2 font-medium text-muted-foreground">Jam Masuk</th>
                      <th className="pb-2 font-medium text-muted-foreground">Jam Pulang</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Diajukan</th>
                      {isAdminUnit ? <th className="pb-2 font-medium text-muted-foreground text-center">Aksi</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map(a => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2 text-foreground font-medium">{a.staff_name || 'Tidak diketahui'}</td>
                        <td className="py-2 text-muted-foreground">{a.unit_id || '-'}</td>
                        <td className="py-2 text-muted-foreground">{a.tanggal}</td>
                        <td className="py-2 text-muted-foreground">{a.jam_masuk || '-'}</td>
                        <td className="py-2 text-muted-foreground">{a.jam_pulang || '-'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(a.status)}`}>
                            {statusLabel(a.status)}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString('id-ID')}</td>
                        {isAdminUnit ? (
                          <td className="py-2 text-center">
                            {a.status === 'pending' && (
                              <button
                                onClick={() => handleCancel(a.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700"
                              >
                                Batalkan
                              </button>
                            )}
                          </td>
                        ) : null}
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
              <li>Jika disetujui, data presensi akan tersimpan otomatis dan muncul di Rekap</li>
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

export default AdminPresensiManualPage
