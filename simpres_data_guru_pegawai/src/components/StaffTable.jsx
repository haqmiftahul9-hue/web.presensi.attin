import { useSimPres, selectUnitName, addActivityLog } from '../store/simPresStore.jsx'
import { useState } from 'react'
import DetailEmployeeModal from './DetailEmployeeModal.jsx'
import EditEmployeeModal from './EditEmployeeModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'

// Baris tabel di-derive dari satu sumber data (store) — 6 pegawai teratas.
const roleDisplayMap = {
  'Guru PAI': 'Pendidik Tetap Yayasan',
  'Guru Kelas 6 & Kurikulum': 'Tim Pengembang Akademik',
  'Guru Kelas 3 • Tahfidz': 'Koordinator Keagamaan',
  'Guru Kelas 1 • Tematik': 'Pendidik Kelas Bawah',
  'Guru Sentra': 'Sentra Kreativitas Anak',
  'Guru Biologi & Laboran': 'Cuti Studi Lanjut',
}

function StaffTable({ unitFilter, searchTerm, statusFilter, currentPage, setCurrentPage }) {
  const { state, dispatch } = useSimPres()

  // Filter staff based on unitFilter, searchTerm, and statusFilter
  let filteredStaff = state.staff

  // Filter by unit
  if (unitFilter !== 'all') {
    filteredStaff = filteredStaff.filter(s => s.unitId === unitFilter)
  }

  // Filter by status
  if (statusFilter !== 'all') {
    filteredStaff = filteredStaff.filter(s => s.status === statusFilter)
  }

  // Filter by search term (NIY, name, role)
  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase()
    filteredStaff = filteredStaff.filter(s =>
      s.niy.toLowerCase().includes(lowerSearchTerm) ||
      s.name.toLowerCase().includes(lowerSearchTerm) ||
      s.role.toLowerCase().includes(lowerSearchTerm)
    )
  }

  // Pagination: we'll show 20 rows per page
  const rowsPerPage = 20
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / rowsPerPage))
  const paginatedStaff = filteredStaff
    .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    .map((s, idx) => ({
      id: s.id,
      niy: s.niy,
      initials: s.name.charAt(0),
      name: s.name,
      role: roleDisplayMap[s.role] || s.role,
      unit: selectUnitName(state, s.unitId),
      unitIcon: s.unitId === 'tk' ? 'child_care' : 'school',
      assignment: s.role,
      status: s.status,
      statusActive: s.status === 'Aktif',
      rowBg: idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low',
      isInactive: s.status !== 'Aktif',
    }))

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [modalStaff, setModalStaff] = useState(null) // staff object for detail, edit, and delete

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

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setModalStaff(null)
  }

  const handleCloseEdit = () => {
    setShowEditModal(false)
    setModalStaff(null)
  }

  const handleCloseDelete = () => {
    setShowDeleteModal(false)
    setModalStaff(null)
  }

  const handleSaveEdit = (updatedStaff) => {
    dispatch({ type: 'UPDATE_STAFF', payload: updatedStaff })
    addActivityLog(dispatch, state, 'Ubah', `Pegawai • ${updatedStaff.name}`, `Perbarui data pegawai: NIY ${updatedStaff.niy}, jabatan ${updatedStaff.role}, unit ${selectUnitName(state, updatedStaff.unitId)}, status ${updatedStaff.status}`, null, null, updatedStaff.unitId)
    setShowEditModal(false)
    setModalStaff(null)
  }

  const handleConfirmDelete = (staff) => {
    const staffName = staff.name
    const staffNiy = staff.niy
    dispatch({ type: 'DELETE_STAFF', payload: staff.id })
    addActivityLog(dispatch, state, 'Hapus', `Pegawai • ${staffName}`, `Hapus pegawai ${staffNiy} dari sistem`, null, null, staff.unitId)
    setShowDeleteModal(false)
    setModalStaff(null)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="w-full overflow-hidden">
        <table className="w-full text-left text-sm table-fixed border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider border-b border-outline/20">
              <th className="py-2.5 px-2 w-[5%] text-center" scope="col">#</th>
              <th className="py-2.5 px-2 w-[10%]" scope="col">NIY</th>
              <th className="py-2.5 px-2 w-[25%]" scope="col">Nama Lengkap & Gelar</th>
              <th className="py-2.5 px-2 w-[15%]" scope="col">Unit Sekolah</th>
              <th className="py-2.5 px-2 w-[25%]" scope="col">Jabatan / Penugasan</th>
              <th className="py-2.5 px-2 w-[10%] text-center" scope="col">Status</th>
              <th className="py-2.5 px-2 w-[10%] text-right" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-on-surface divide-y divide-surface-container-low">
            {paginatedStaff.map((staff) => (
              <tr key={staff.id} className={`${staff.rowBg} hover:bg-surface-container-low/50 transition-colors duration-150`}>
                <td className="w-[5%] py-2.5 px-2 text-center text-xs text-on-surface-variant truncate">{staff.id}</td>
                <td className="w-[10%] py-2.5 px-2 font-mono text-xs text-on-surface-variant truncate">{staff.niy}</td>
                <td className="w-[25%] py-2.5 px-2">
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
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium text-on-surface truncate ${staff.isInactive ? 'opacity-70' : ''}`}>
                        {staff.name}
                      </span>
                      <span className="text-xs text-on-surface-variant mt-0.5 truncate">{staff.role}</span>
                    </div>
                  </div>
                </td>
                <td className="w-[15%] py-2.5 px-2">
                  <div className="inline-flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0">{staff.unitIcon}</span>
                    <span className="text-sm font-medium text-on-surface truncate">{staff.unit}</span>
                  </div>
                </td>
                <td className="w-[25%] py-2.5 px-2 text-sm text-on-surface truncate">
                  {staff.assignment}
                </td>
                <td className="w-[10%] py-2.5 px-2 text-center">
                  {staff.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Aktif</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>Nonaktif</span>
                    </span>
                  )}
                </td>
                <td className="w-[10%] py-2.5 px-2 text-right">
                  <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button
                      onClick={() => handleDetail(staff)}
                      className="h-8 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Detail</span>
                    </button>
                    <button
                      onClick={() => handleEdit(staff)}
                      className="h-8 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Edit Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(staff)}
                      className="h-8 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Hapus Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Hapus</span>
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
      <div className="p-3 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-outline/20">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span>Menampilkan <strong className="font-medium text-on-surface">{(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredStaff.length)}</strong> dari <strong className="font-medium text-on-surface">{filteredStaff.length}</strong> data pegawai</span>
          <span className="text-surface-variant">•</span>
          <div className="flex items-center gap-1">
            <span className="text-xs">Baris per halaman:</span>
            <select className="h-6 px-1.5 bg-surface-container-low text-on-surface text-xs rounded focus:outline-none cursor-pointer border border-outline/30" defaultValue="20">
              <option>10</option>
              <option>20</option>
              <option>50</option>
              <option>Semua</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed hover:bg-surface-container-low"
            type="button"
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentPage === page ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface hover:bg-surface-container'} text-sm font-medium`}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container text-sm transition-colors"
            type="button"
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
      {/* Modals */}
      {showDetailModal && (
        <DetailEmployeeModal
          staff={modalStaff}
          onClose={handleCloseDetail}
        />
      )}
      {showEditModal && (
        <EditEmployeeModal
          staff={modalStaff}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
        />
      )}
      {showDeleteModal && (
        <DeleteConfirmationModal
          staff={modalStaff}
          onCancel={handleCloseDelete}
          onDelete={handleConfirmDelete}
        />
      )}
    </div>
  )
}

export default StaffTable
