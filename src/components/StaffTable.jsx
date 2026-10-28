import { useState, useMemo, useEffect } from 'react'
import {
  useSimPres, selectUnitName, addActivityLog, selectFilteredStaff, initialsOf,
} from '../store/simPresStore.jsx'
import DetailEmployeeModal from './DetailEmployeeModal.jsx'
import EditEmployeeModal from './EditEmployeeModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import ResetStaffPasswordModal from './ResetStaffPasswordModal.jsx'
import { getEmployeeGreeting } from '../data/sapaanPegawai.js'
import { cardPhotoOf } from '../data/employeeCard.js'

// Label jabatan ringkas untuk tampilan; data asli tetap di store.
const roleDisplayMap = {
  'Guru PAI': 'Pendidik Tetap Yayasan',
  'Guru Kelas 6 & Kurikulum': 'Tim Pengembang Akademik',
  'Guru Kelas 3 • Tahfidz': 'Koordinator Keagamaan',
  'Guru Kelas 1 • Tematik': 'Pendidik Kelas Bawah',
  'Guru Sentra': 'Sentra Kreativitas Anak',
  'Guru Biologi & Laboran': 'Cuti Studi Lanjut',
}

const avatarClasses = [
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-surface-container text-on-surface',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-surface-container-highest text-on-surface-variant',
]

const ROW_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: 'all', label: 'Semua' },
]

function StaffTable({ unitFilter, searchTerm, statusFilter, currentPage, setCurrentPage, focusStaffId }) {
  const { state, dispatch } = useSimPres()
  const [rowsPerPage, setRowsPerPage] = useState('20')
  const [modal, setModal] = useState(null)
  const [modalStaff, setModalStaff] = useState(null)
  const [toast, setToast] = useState(null)
  const [focusedId, setFocusedId] = useState(null)

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
      initials: initialsOf(s.name).charAt(0),
      name: s.name,
      extraRole: roleDisplayMap[s.role] || s.role,
      unit: selectUnitName(state, s.unitId),
      unitIcon: s.unitId === 'tk' ? 'child_care' : 'school',
      assignment: s.role,
      status: s.status,
      statusActive: s.status === 'Aktif',
      rowBg: idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low',
      avatar: avatarClasses[idx % avatarClasses.length],
      isInactive: s.status !== 'Aktif',
    }))

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Pegawai baru berada di urutan terakhir: lompat ke halamannya supaya
  // data langsung terlihat, lalu tandai baris tersebut.
  useEffect(() => {
    if (focusStaffId == null) return
    const index = filteredStaff.findIndex((s) => s.id === focusStaffId)
    if (index >= 0) {
      setCurrentPage(Math.floor(index / perPage) + 1)
      setFocusedId(focusStaffId)
    }
    const t = setTimeout(() => setFocusedId(null), 6000)
    return () => clearTimeout(t)
  }, [focusStaffId])

  const closeAll = () => {
    setModal(null)
    setModalStaff(null)
  }

  const openModal = (kind, staff) => {
    setModalStaff(staff)
    setModal(kind)
  }

  const handleSaveEdit = (updatedStaff) => {
    const previous = state.staff.find((s) => s.id === updatedStaff.id)
    const changes = []
    if (previous && previous.name !== updatedStaff.name) changes.push(`nama ${previous.name} → ${updatedStaff.name}`)
    if (previous && previous.niy !== updatedStaff.niy) changes.push(`NIY ${previous.niy} → ${updatedStaff.niy}`)
    if (previous && previous.unitId !== updatedStaff.unitId) {
      changes.push(`unit ${selectUnitName(state, previous.unitId)} → ${selectUnitName(state, updatedStaff.unitId)}`)
    }
    if (previous && previous.role !== updatedStaff.role) changes.push(`jabatan ${previous.role} → ${updatedStaff.role}`)
    if (previous && previous.status !== updatedStaff.status) changes.push(`status ${previous.status} → ${updatedStaff.status}`)

    dispatch({ type: 'UPDATE_STAFF', payload: updatedStaff })
    addActivityLog(
      dispatch, state, 'Ubah', `Pegawai • ${updatedStaff.name}`,
      changes.length > 0
        ? `Perbarui data pegawai: ${changes.join('; ')}`
        : `Simpan ulang data pegawai NIY ${updatedStaff.niy} tanpa perubahan`,
      null, null, updatedStaff.unitId,
    )
    closeAll()
    setToast(`Data ${getEmployeeGreeting(updatedStaff)} berhasil diperbarui.`)
  }

  const handleConfirmDelete = (staff) => {
    dispatch({ type: 'DELETE_STAFF', payload: staff.id })
    addActivityLog(
      dispatch, state, 'Hapus', `Pegawai • ${staff.name}`,
      `Hapus pegawai NIY ${staff.niy} (${staff.role}) dari unit ${selectUnitName(state, staff.unitId)}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Pegawai ${getEmployeeGreeting(staff)} dihapus.`)
  }

  const handleToggleStatus = (staff) => {
    const nextStatus = staff.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    dispatch({ type: 'UPDATE_STAFF', payload: { ...staff, status: nextStatus } })
    addActivityLog(
      dispatch, state, nextStatus === 'Nonaktif' ? 'Nonaktifkan' : 'Aktifkan',
      `Pegawai • ${staff.name}`,
      `Ubah status pegawai NIY ${staff.niy} dari ${staff.status} menjadi ${nextStatus}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Status ${getEmployeeGreeting(staff)} diubah menjadi ${nextStatus}.`)
  }

  const handleResetStaffPassword = ({ staff, password, resetAttendance }) => {
    dispatch({
      type: 'RESET_STAFF_PASSWORD',
      payload: { staffId: staff.id, niy: staff.niy, password, mustChangePassword: false },
    })
    if (resetAttendance) {
      dispatch({
        type: 'UPDATE_STAFF',
        payload: { ...staff, masuk: null, method: null, lateMinutes: 0, alpha: false, outsideRadius: false },
      })
    }
    addActivityLog(
      dispatch, state, 'Reset Sandi', `Pegawai • ${staff.name}`,
      `Reset kata sandi mobile pegawai NIY ${staff.niy} menjadi ${password}${resetAttendance ? ' & reset presensi hari ini' : ''}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Kata sandi mobile ${getEmployeeGreeting(staff)} berhasil direset ke "${password}". Login NIY: ${staff.niy}.`)
  }

  const firstShown = filteredStaff.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const lastShown = Math.min(safePage * perPage, filteredStaff.length)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs flex flex-col overflow-hidden">
      <div className="w-full sp-table-wrap is-sticky">
        <table className="w-full table-fixed border-collapse text-left text-xs text-foreground">
          <colgroup>
            <col className="w-[4%] xl:w-[4%]" />
            <col className="w-[11%] xl:w-[10%]" />
            <col className="w-[22%] xl:w-[20%]" />
            <col className="w-[15%] xl:w-[16%]" />
            <col className="w-[19%] xl:w-[16%]" />
            <col className="w-[9%] xl:w-[9%]" />
            <col className="w-[20%] xl:w-[25%] 2xl:w-[26%]" />
          </colgroup>
          <thead>
            <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="h-10 px-3.5 text-center align-middle whitespace-nowrap" scope="col">#</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">NIY</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Nama Lengkap &amp; Gelar</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Unit Sekolah</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Jabatan / Penugasan</th>
              <th className="h-10 px-3.5 text-center align-middle whitespace-nowrap" scope="col">Status</th>
              <th className="h-10 px-3.5 text-right align-middle whitespace-nowrap" scope="col">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedStaff.map((row) => (
              <tr
                key={row.key}
                className={`${focusedId === row.key ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/20' : 'hover:bg-muted/40'} transition-colors`}
              >
                <td className="h-14 px-3.5 text-center align-middle text-xs text-muted-foreground font-mono tabular-nums">{row.no}</td>
                <td className="h-14 px-3.5 align-middle">
                  <span className="block truncate font-mono text-xs font-semibold text-foreground" title={`NIY ${row.niy}`}>{row.niy}</span>
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {cardPhotoOf(row.staff) ? (
                        <img
                          src={cardPhotoOf(row.staff)}
                          alt={row.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        row.initials
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`block truncate text-xs font-semibold text-foreground ${row.isInactive ? 'opacity-60' : ''}`}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-primary font-medium mt-0.5" title={row.extraRole}>{row.extraRole}</span>
                    </div>
                  </div>
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0 leading-none">{row.unitIcon}</span>
                    <span className="block truncate text-xs font-medium text-foreground" title={row.unit}>{row.unit}</span>
                  </div>
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <span className="block text-xs text-muted-foreground leading-snug line-clamp-2 break-words" title={row.assignment}>
                    {row.assignment}
                  </span>
                </td>
                <td className="h-14 px-3.5 text-center align-middle">
                  {row.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openModal('detail', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-card border border-border hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Detail Pegawai"
                      aria-label="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">visibility</span>
                      <span className="hidden 2xl:inline">Detail</span>
                    </button>
                    <button
                      onClick={() => openModal('edit', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Pegawai"
                      aria-label="Edit Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">edit</span>
                      <span className="hidden 2xl:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => openModal('reset', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reset Sandi Presensi"
                      aria-label="Reset Sandi Presensi"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">lock_reset</span>
                      <span className="hidden 2xl:inline">Reset</span>
                    </button>
                    <button
                      onClick={() => openModal('delete', row.staff)}
                      className={`h-7 shrink-0 whitespace-nowrap px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer border ${
                        row.statusActive
                          ? 'bg-destructive/10 hover:bg-destructive/20 border-destructive/20 text-destructive'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}
                      title={row.statusActive ? 'Nonaktifkan / Hapus Pegawai' : 'Aktifkan Kembali / Hapus Pegawai'}
                      aria-label={row.statusActive ? 'Nonaktifkan atau Hapus Pegawai' : 'Aktifkan atau Hapus Pegawai'}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">{row.statusActive ? 'block' : 'check_circle'}</span>
                      <span className="hidden 2xl:inline">{row.statusActive ? 'Nonaktif' : 'Aktifkan'}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan="7" className="py-12 text-center text-muted-foreground text-xs">
                  Tidak ada data pegawai yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="px-3.5 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-t border-emerald-500/20 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="px-4 py-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Menampilkan <strong className="font-semibold text-foreground">{firstShown}–{lastShown}</strong> dari{' '}
            <strong className="font-semibold text-foreground">{filteredStaff.length}</strong> pegawai
          </span>
          <span className="text-muted-foreground/40">•</span>
          <div className="flex items-center gap-1.5">
            <span>Baris per halaman:</span>
            <select
              className="h-7 px-2 bg-card border border-input text-foreground rounded font-medium focus:outline-none cursor-pointer"
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
        <div className="flex items-center gap-1">
          <button
            disabled={safePage === 1}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
            type="button"
            onClick={() => setCurrentPage(safePage - 1)}
          >
            <span className="material-symbols-outlined text-[17px]">chevron_left</span>
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                safePage === page
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
            type="button"
            onClick={() => setCurrentPage(safePage + 1)}
          >
            <span className="material-symbols-outlined text-[17px]">chevron_right</span>
          </button>
        </div>
      </div>

      {modal === 'detail' && (
        <DetailEmployeeModal staff={modalStaff} onClose={closeAll} />
      )}
      {modal === 'edit' && (
        <EditEmployeeModal staff={modalStaff} onClose={closeAll} onSave={handleSaveEdit} />
      )}
      {modal === 'delete' && (
        <DeleteConfirmationModal
          staff={modalStaff}
          onCancel={closeAll}
          onDelete={handleConfirmDelete}
          onToggleStatus={handleToggleStatus}
        />
      )}
      {modal === 'reset' && (
        <ResetStaffPasswordModal
          staff={modalStaff}
          onClose={closeAll}
          onConfirm={handleResetStaffPassword}
        />
      )}
    </div>
  )
}

export default StaffTable
