import { useState, useMemo, useEffect } from 'react'
import {
  useSimPres, selectUnitName, addActivityLog, selectFilteredStaff, initialsOf,
} from '../store/simPresStore.jsx'
import DetailEmployeeModal from './DetailEmployeeModal.jsx'
import EditEmployeeModal from './EditEmployeeModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'

// Label jabatan ringkas untuk tampilan; data asli tetap di store.
const roleDisplayMap = {
  'Guru PAI': 'Pendidik Tetap Yayasan',
  'Guru Kelas 6 & Kurikulum': 'Tim Pengembang Akademik',
  'Guru Kelas 3 Ã¢â‚¬Â¢ Tahfidz': 'Koordinator Keagamaan',
  'Guru Kelas 1 Ã¢â‚¬Â¢ Tematik': 'Pendidik Kelas Bawah',
  'Guru Sentra': 'Sentra Kreativitas Anak',
  'Guru Biologi & Laboran': 'Cuti Studi Lanjut',
}

const ROW_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: 'all', label: 'Semua' },
]

// Gelar diambil dari field dedicated; bila kosong, diambil dari bagian
// setelah koma terakhir pada nama (mis. "Erianto, S.Ag, M.Pd.I").
function gelarOf(staff) {
  if (staff.gelar) return staff.gelar
  const parts = String(staff.name || '').split(',')
  if (parts.length < 2) return ''
  return parts.slice(1).join(',').trim()
}

function StaffTable({ unitFilter, searchTerm, statusFilter, currentPage, setCurrentPage }) {
  const { state, dispatch } = useSimPres()
  const [rowsPerPage, setRowsPerPage] = useState('20')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [modalStaff, setModalStaff] = useState(null)
  const [toast, setToast] = useState(null)

  const filteredStaff = useMemo(
    () => selectFilteredStaff(state, { unitId: unitFilter, searchTerm, status: statusFilter }),
    [state.staff, state.units, unitFilter, searchTerm, statusFilter],
  )

  const perPage = rowsPerPage === 'all' ? Math.max(filteredStaff.length, 1) : Number(rowsPerPage)
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / perPage))
  const safePage = Math.min(currentPage, totalPages)

  // Baris tabel di-derive dari satu sumber data (store), bukan salinan.
  const paginatedStaff = filteredStaff
    .slice((safePage - 1) * perPage, safePage * perPage)
    .map((s, idx) => ({
      key: s.id,
      staff: s,
      no: (safePage - 1) * perPage + idx + 1,
      niy: s.niy,
      nip: s.nip,
      initials: initialsOf(s.name).charAt(0),
      name: s.name,
      gelar: gelarOf(s),
      extraRole: roleDisplayMap[s.role] || s.role,
      unit: selectUnitName(state, s.unitId),
      unitIcon: s.unitId === 'tk' ? 'child_care' : 'school',
      assignment: s.role,
      status: s.status,
      statusActive: s.status === 'Aktif',
      rowBg: idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low',
      isInactive: s.status !== 'Aktif',
    }))

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [toast])

  const closeAll = () => {
    setShowDetailModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setModalStaff(null)
  }

  const handleDetail = (staff) => {
    setModalStaff(staff)
    setShowDetailModal(true)
  }

  const handleEdit = (staff) => {
    setModalStaff(staff)
    setShowEditModal(true)
  }

  const handleDelete = (staff) => {
    setModalStaff(staff)
    setShowDeleteModal(true)
  }

  const handleSaveEdit = (updatedStaff) => {
    const previous = state.staff.find((s) => s.id === updatedStaff.id)
    const changes = []
    if (previous && previous.name !== updatedStaff.name) changes.push(`nama ${previous.name} Ã¢â€ â€™ ${updatedStaff.name}`)
    if (previous && previous.niy !== updatedStaff.niy) changes.push(`NIY ${previous.niy} Ã¢â€ â€™ ${updatedStaff.niy}`)
    if (previous && previous.unitId !== updatedStaff.unitId) {
      changes.push(`unit ${selectUnitName(state, previous.unitId)} Ã¢â€ â€™ ${selectUnitName(state, updatedStaff.unitId)}`)
    }
    if (previous && previous.role !== updatedStaff.role) changes.push(`jabatan ${previous.role} Ã¢â€ â€™ ${updatedStaff.role}`)
    if (previous && previous.status !== updatedStaff.status) changes.push(`status ${previous.status} Ã¢â€ â€™ ${updatedStaff.status}`)

    dispatch({ type: 'UPDATE_STAFF', payload: updatedStaff })
    addActivityLog(
      dispatch, state, 'Ubah', `Pegawai Ã¢â‚¬Â¢ ${updatedStaff.name}`,
      changes.length > 0
        ? `Perbarui data pegawai: ${changes.join('; ')}`
        : `Simpan ulang data pegawai NIY ${updatedStaff.niy} tanpa perubahan`,
      null, null, updatedStaff.unitId,
    )
    closeAll()
    setToast({ kind: 'ok', text: `Data ${updatedStaff.name} berhasil diperbarui.` })
  }

  const handleConfirmDelete = (staff) => {
    dispatch({ type: 'DELETE_STAFF', payload: staff.id })
    addActivityLog(
      dispatch, state, 'Hapus', `Pegawai Ã¢â‚¬Â¢ ${staff.name}`,
      `Hapus pegawai NIY ${staff.niy} (${staff.role}) dari unit ${selectUnitName(state, staff.unitId)}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast({ kind: 'ok', text: `Pegawai ${staff.name} dihapus.` })
  }

  const handleToggleStatus = (staff) => {
    const nextStatus = staff.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    dispatch({ type: 'UPDATE_STAFF', payload: { ...staff, status: nextStatus } })
    addActivityLog(
      dispatch, state, nextStatus === 'Nonaktif' ? 'Nonaktifkan' : 'Aktifkan',
      `Pegawai Ã¢â‚¬Â¢ ${staff.name}`,
      `Ubah status pegawai NIY ${staff.niy} dari ${staff.status} menjadi ${nextStatus}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast({ kind: 'ok', text: `Status ${staff.name} diubah menjadi ${nextStatus}.` })
  }

  const firstShown = filteredStaff.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const lastShown = Math.min(safePage * perPage, filteredStaff.length)

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="w-full overflow-x-auto lg:overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[4%] xl:w-[4%]" />
            <col className="w-[11%] xl:w-[10%]" />
            <col className="w-[24%] xl:w-[20%]" />
            <col className="w-[16%] xl:w-[18%]" />
            <col className="w-[20%] xl:w-[17%]" />
            <col className="w-[8%] xl:w-[10%]" />
            <col className="w-[17%] xl:w-[21%]" />
          </colgroup>
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider border-b border-outline/20">
              <th className="h-10 px-3 text-center align-middle whitespace-nowrap" scope="col">#</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">NIY/NIP</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Nama Lengkap &amp; Gelar</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Unit Sekolah</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Jabatan / Penugasan</th>
              <th className="h-10 px-3 text-center align-middle whitespace-nowrap" scope="col">Status</th>
              <th className="h-10 px-3 text-right align-middle whitespace-nowrap" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-on-surface divide-y divide-surface-container-low">
            {paginatedStaff.map((staff) => (
              <tr key={staff.key} className={`${staff.rowBg} hover:bg-surface-container-low/50 transition-colors duration-150`}>
                <td className="h-14 px-3 text-center align-middle text-xs text-on-surface-variant tabular-nums">{staff.no}</td>
                <td className="h-14 px-3 align-middle">
                  <span className="block truncate font-mono text-xs text-on-surface-variant" title={`NIY ${staff.niy} / NIP ${staff.nip || '-'}`}>
                    {staff.niy}
                  </span>
                  {staff.nip ? (
                    <span className="block truncate font-mono text-[11px] text-on-surface-variant/70" title={`NIP ${staff.nip}`}>
                      {staff.nip}
                    </span>
                  ) : null}
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ring-2 ring-white ${
                      staff.isInactive
                        ? 'bg-surface-container-highest text-on-surface-variant'
                        : staff.initials === 'E' || staff.initials === 'W'
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : staff.initials === 'B'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                            : staff.initials === 'S'
                              ? 'bg-surface-container text-on-surface'
                              : 'bg-primary-fixed text-on-primary-fixed'
                    }`}>
                      {staff.initials}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`block truncate text-sm font-medium text-on-surface ${staff.isInactive ? 'opacity-70' : ''}`}
                        title={staff.name}
                      >
                        {staff.name}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant mt-0.5" title={staff.gelar}>
                        {staff.gelar || '-'}
                      </span>
                      <span className="block truncate text-[11px] text-secondary mt-0.5" title={staff.extraRole}>
                        {staff.extraRole}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0 leading-none">{staff.unitIcon}</span>
                    <span className="block truncate text-[13px] leading-snug text-on-surface" title={staff.unit}>{staff.unit}</span>
                  </div>
                </td>
                <td className="h-14 px-3 align-middle">
                  <span className="block text-sm text-on-surface leading-snug line-clamp-2 break-words" title={staff.assignment}>
                    {staff.assignment}
                  </span>
                </td>
                <td className="h-14 px-3 text-center align-middle">
                  {staff.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Aktif</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>Nonaktif</span>
                    </span>
                  )}
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleDetail(staff.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      title="Detail Pegawai"
                      aria-label="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">visibility</span>
                      <span className="hidden xl:inline">Detail</span>
                    </button>
                    <button
                      onClick={() => handleEdit(staff.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      title="Edit Pegawai"
                      aria-label="Edit Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">edit</span>
                      <span className="hidden xl:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(staff.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      title="Nonaktifkan / Hapus Pegawai"
                      aria-label="Nonaktifkan atau Hapus Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
                      <span className="hidden xl:inline">Hapus</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan="7" className="py-10 text-center text-on-surface-variant">
                  Tidak ada data pegawai yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {toast && (
        <div className="px-3 py-2 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border-t border-outline/20">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{toast.text}</span>
        </div>
      )}
      <div className="p-3 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-outline/20">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span>Menampilkan <strong className="font-medium text-on-surface">{firstShown}Ã¢â‚¬â€œ{lastShown}</strong> dari <strong className="font-medium text-on-surface">{filteredStaff.length}</strong> data pegawai</span>
          <span className="text-surface-variant">Ã¢â‚¬Â¢</span>
          <div className="flex items-center gap-1">
            <span className="text-xs">Baris per halaman:</span>
            <select
              className="h-6 px-1.5 bg-surface-container-low text-on-surface text-xs rounded focus:outline-none cursor-pointer border border-outline/30"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(e.target.value)
                setCurrentPage(1)
              }}
            >
              {ROW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            disabled={safePage === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed hover:bg-surface-container-low"
            type="button"
            onClick={() => setCurrentPage(safePage - 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${safePage === page ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface hover:bg-surface-container'} text-sm font-medium`}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container text-sm transition-colors"
            type="button"
            onClick={() => setCurrentPage(safePage + 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
      {showDetailModal && (
        <DetailEmployeeModal
          staff={modalStaff}
          onClose={closeAll}
        />
      )}
      {showEditModal && (
        <EditEmployeeModal
          staff={modalStaff}
          onClose={closeAll}
          onSave={handleSaveEdit}
        />
      )}
      {showDeleteModal && (
        <DeleteConfirmationModal
          staff={modalStaff}
          onCancel={closeAll}
          onDelete={handleConfirmDelete}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  )
}

export default StaffTable
