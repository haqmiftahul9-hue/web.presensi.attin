import { useState, useMemo, useEffect } from 'react'
import {
  useSimPres, selectUnitName, addActivityLog, selectFilteredStaff, initialsOf,
  selectUserAccountByStaffId,
} from '../store/simPresStore.jsx'
import DetailEmployeeModal from './DetailEmployeeModal.jsx'
import EditEmployeeModal from './EditEmployeeModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

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

// Gelar diambil dari field dedicated; bila kosong, dari bagian setelah koma
// terakhir pada nama (mis. "Erianto, S.Ag, M.Pd.I").
function gelarOf(staff) {
  if (staff.gelar) return staff.gelar
  const parts = String(staff.name || '').split(',')
  if (parts.length < 2) return ''
  return parts.slice(1).join(',').trim()
}

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
      // Info akun login: username (NIY), role kanonik, dan status akun. Dibaca
      // dari tabel userAccounts, jadi kolom ini selalu sama dengan yang dipakai
      // saat login — sumber diagnostik ketika ada pegawai yang gagal masuk.
      akun: (() => {
        const a = selectUserAccountByStaffId(state, s.id)
        return a
          ? { username: a.username, role: a.role, status: a.status, wajibGanti: Boolean(a.mustChangePassword) }
          : null
      })(),
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
    setToast(`Data ${updatedStaff.name} berhasil diperbarui.`)
  }

  const handleConfirmDelete = (staff) => {
    dispatch({ type: 'DELETE_STAFF', payload: staff.id })
    addActivityLog(
      dispatch, state, 'Hapus', `Pegawai • ${staff.name}`,
      `Hapus pegawai NIY ${staff.niy} (${staff.role}) dari unit ${selectUnitName(state, staff.unitId)}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Pegawai ${staff.name} dihapus.`)
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
    setToast(`Status ${staff.name} diubah menjadi ${nextStatus}.`)
  }

  const handleResetPresensi = (staff) => {
    dispatch({
      type: 'UPDATE_STAFF',
      payload: { ...staff, masuk: null, method: null, late: 0, alpha: false, outsideRadius: false },
    })
    addActivityLog(
      dispatch, state, 'Reset', `Presensi • ${staff.name}`,
      `Reset data presensi hari ini & kata sandi presensi pegawai NIY ${staff.niy}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Presensi ${staff.name} berhasil direset.`)
  }

  const firstShown = filteredStaff.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const lastShown = Math.min(safePage * perPage, filteredStaff.length)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="w-full overflow-x-auto lg:overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left font-body-md text-body-md text-on-surface">
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
            <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider border-b border-outline/20">
              <th className="h-10 px-3 text-center align-middle whitespace-nowrap" scope="col">#</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">NIY/NIP</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Nama Lengkap &amp; Gelar</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Unit Sekolah</th>
              <th className="h-10 px-3 align-middle whitespace-nowrap" scope="col">Jabatan / Penugasan</th>
              <th className="h-10 px-3 text-center align-middle whitespace-nowrap" scope="col">Status</th>
              <th className="h-10 px-3 text-right align-middle whitespace-nowrap" scope="col">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="text-on-surface divide-y divide-surface-container-low">
            {paginatedStaff.map((row) => (
              <tr
                key={row.key}
                className={`${focusedId === row.key ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : row.rowBg} hover:bg-surface-container-low transition-colors`}
              >
                <td className="h-14 px-3 text-center align-middle text-label-md text-label-md text-on-surface-variant tabular-nums">{row.no}</td>
                <td className="h-14 px-3 align-middle">
                  <span className="block truncate font-mono font-body-sm text-body-sm text-on-surface" title={`NIY ${row.niy}`}>{row.niy}</span>
                  {row.nip ? (
                    <span className="block truncate font-mono text-[11px] text-on-surface-variant" title={`NIP ${row.nip}`}>{row.nip}</span>
                  ) : null}
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-headline-sm text-headline-sm flex-shrink-0 ${row.avatar}`}>
                      {row.initials}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`block truncate font-body-md-medium text-body-md-medium text-on-surface ${row.isInactive ? 'opacity-70' : ''}`}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant mt-0.5" title={row.gelar}>{row.gelar || '-'}</span>
                      <span className="block truncate text-[11px] text-secondary mt-0.5" title={row.extraRole}>{row.extraRole}</span>
                    </div>
                  </div>
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0 leading-none">{row.unitIcon}</span>
                    <span className="block truncate text-[13px] leading-snug text-on-surface" title={row.unit}>{row.unit}</span>
                  </div>
                  {/* Info akun login: dibuat otomatis dari data pegawai ini. */}
                  {row.akun ? (
                    <span
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-container text-[10.5px] leading-tight text-on-surface-variant"
                      title={`Akun ${row.akun.username} • role ${row.akun.role}${row.akun.wajibGanti ? ' • wajib ganti sandi' : ''}`}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none">account_circle</span>
                      {row.akun.username}
                      {row.akun.wajibGanti && <span className="text-amber-700">• ganti sandi</span>}
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-error-container text-[10.5px] text-on-error-container">
                      <span className="material-symbols-outlined text-[12px] leading-none">person_off</span>
                      Belum ada akun
                    </span>
                  )}
                </td>
                <td className="h-14 px-3 align-middle">
                  <span className="block text-body-md text-body-md text-on-surface leading-snug line-clamp-2 break-words" title={row.assignment}>
                    {row.assignment}
                  </span>
                </td>
                <td className="h-14 px-3 text-center align-middle">
                  {row.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-emerald-50 text-emerald-600 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-rose-50 text-rose-700 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="h-14 px-3 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openModal('detail', row.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-secondary font-label-md text-label-md inline-flex items-center gap-1 transition-colors"
                      title="Detail Pegawai"
                      aria-label="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">visibility</span>
                      <span className="hidden 2xl:inline">Detail</span>
                    </button>
                    <button
                      onClick={() => openModal('edit', row.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-label-md text-label-md inline-flex items-center gap-1 transition-colors"
                      title="Edit Pegawai"
                      aria-label="Edit Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">edit</span>
                      <span className="hidden 2xl:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => openModal('reset', row.staff)}
                      className="h-8 shrink-0 whitespace-nowrap px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md inline-flex items-center gap-1 transition-colors"
                      title="Reset Sandi Presensi"
                      aria-label="Reset Sandi Presensi"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">lock_reset</span>
                      <span className="hidden 2xl:inline">Reset</span>
                    </button>
                    <button
                      onClick={() => openModal('delete', row.staff)}
                      className={`h-8 shrink-0 whitespace-nowrap px-2 rounded-lg font-label-md text-label-md inline-flex items-center gap-1 transition-colors ${
                        row.statusActive
                          ? 'bg-red-50 hover:bg-red-100 text-red-600'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                      }`}
                      title={row.statusActive ? 'Nonaktifkan / Hapus Pegawai' : 'Aktifkan Kembali / Hapus Pegawai'}
                      aria-label={row.statusActive ? 'Nonaktifkan atau Hapus Pegawai' : 'Aktifkan atau Hapus Pegawai'}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">{row.statusActive ? 'block' : 'check_circle'}</span>
                      <span className="hidden 2xl:inline">{row.statusActive ? 'Nonaktif' : 'Aktifkan'}</span>
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
          <span>{toast}</span>
        </div>
      )}

      <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-outline/20">
        <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
          <span>
            Menampilkan <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{firstShown}–{lastShown}</strong> dari{' '}
            <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{filteredStaff.length}</strong> data pegawai
          </span>
          <span className="text-surface-variant">•</span>
          <div className="flex items-center gap-1">
            <span>Baris per halaman:</span>
            <select
              className="h-7 px-2 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:outline-none cursor-pointer border border-outline/30"
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed"
            type="button"
            onClick={() => setCurrentPage(safePage - 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-body-sm text-body-sm transition-colors ${
                safePage === page
                  ? 'bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container text-body-sm transition-colors disabled:text-on-surface-variant/40 disabled:cursor-not-allowed"
            type="button"
            onClick={() => setCurrentPage(safePage + 1)}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
        <ConfirmDialog
          title="Reset Presensi & Sandi"
          message={`Reset data presensi hari ini dan kata sandi presensi untuk ${modalStaff?.name} (NIY ${modalStaff?.niy})? Tindakan ini tercatat pada Log Aktivitas.`}
          confirmLabel="Reset"
          variant="warning"
          onClose={closeAll}
          onConfirm={() => handleResetPresensi(modalStaff)}
        />
      )}
    </div>
  )
}

export default StaffTable
