import { useState, useMemo, useEffect } from 'react'
import {
  useSimPres, selectUnitName, addActivityLog, selectFilteredStaff, initialsOf,
  selectUserAccountByStaffId,
} from '../store/simPresStore.jsx'
import DetailEmployeeModal from './DetailEmployeeModal.jsx'
import EditEmployeeModal from './EditEmployeeModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { getEmployeeGreeting } from '../data/sapaanPegawai.js'

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

  const handleResetPresensi = (staff) => {
    dispatch({
      type: 'UPDATE_STAFF',
      payload: { ...staff, masuk: null, method: null, lateMinutes: 0, alpha: false, outsideRadius: false },
    })
    addActivityLog(
      dispatch, state, 'Reset', `Presensi • ${staff.name}`,
      `Reset data presensi hari ini & kata sandi presensi pegawai NIY ${staff.niy}`,
      null, null, staff.unitId,
    )
    closeAll()
    setToast(`Presensi ${getEmployeeGreeting(staff)} berhasil direset.`)
  }

  const firstShown = filteredStaff.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const lastShown = Math.min(safePage * perPage, filteredStaff.length)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
      <div className="w-full sp-table-wrap is-sticky">
        <table className="w-full table-fixed border-collapse text-left text-xs text-slate-800">
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
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="h-10 px-3.5 text-center align-middle whitespace-nowrap" scope="col">#</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">NIY/NIP</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Nama Lengkap &amp; Gelar</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Unit Sekolah</th>
              <th className="h-10 px-3.5 align-middle whitespace-nowrap" scope="col">Jabatan / Penugasan</th>
              <th className="h-10 px-3.5 text-center align-middle whitespace-nowrap" scope="col">Status</th>
              <th className="h-10 px-3.5 text-right align-middle whitespace-nowrap" scope="col">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedStaff.map((row) => (
              <tr
                key={row.key}
                className={`${focusedId === row.key ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'} transition-colors`}
              >
                <td className="h-14 px-3.5 text-center align-middle text-xs text-slate-400 font-mono tabular-nums">{row.no}</td>
                <td className="h-14 px-3.5 align-middle">
                  <span className="block truncate font-mono text-xs font-semibold text-slate-800" title={`NIY ${row.niy}`}>{row.niy}</span>
                  {row.nip ? (
                    <span className="block truncate font-mono text-[10.5px] text-slate-400 mt-0.5" title={`NIP ${row.nip}`}>{row.nip}</span>
                  ) : null}
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50/80 border border-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {row.initials}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`block truncate text-xs font-semibold text-slate-900 ${row.isInactive ? 'opacity-60' : ''}`}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400 mt-0.5" title={row.gelar}>{row.gelar || '-'}</span>
                      <span className="block truncate text-[11px] text-blue-600 font-medium mt-0.5" title={row.extraRole}>{row.extraRole}</span>
                    </div>
                  </div>
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-blue-600 text-[16px] flex-shrink-0 leading-none">{row.unitIcon}</span>
                    <span className="block truncate text-xs font-medium text-slate-800" title={row.unit}>{row.unit}</span>
                  </div>
                  {/* Info akun login */}
                  {row.akun ? (
                    <span
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100/80 border border-slate-200/60 text-[10.5px] font-mono text-slate-600"
                      title={`Akun ${row.akun.username} • role ${row.akun.role}${row.akun.wajibGanti ? ' • wajib ganti sandi' : ''}`}
                    >
                      <span className="material-symbols-outlined text-[12px] leading-none text-slate-400">account_circle</span>
                      {row.akun.username}
                      {row.akun.wajibGanti && <span className="text-amber-600 font-semibold">• ganti sandi</span>}
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[10.5px] text-rose-600">
                      <span className="material-symbols-outlined text-[12px] leading-none">person_off</span>
                      Belum ada akun
                    </span>
                  )}
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <span className="block text-xs text-slate-700 leading-snug line-clamp-2 break-words" title={row.assignment}>
                    {row.assignment}
                  </span>
                </td>
                <td className="h-14 px-3.5 text-center align-middle">
                  {row.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="h-14 px-3.5 align-middle">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openModal('detail', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Detail Pegawai"
                      aria-label="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">visibility</span>
                      <span className="hidden 2xl:inline">Detail</span>
                    </button>
                    <button
                      onClick={() => openModal('edit', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Pegawai"
                      aria-label="Edit Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">edit</span>
                      <span className="hidden 2xl:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => openModal('reset', row.staff)}
                      className="h-7 shrink-0 whitespace-nowrap px-2 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200/80 text-rose-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80 text-emerald-700'
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
                <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada data pegawai yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border-t border-emerald-200 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="px-4 py-3 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Menampilkan <strong className="font-semibold text-slate-800">{firstShown}–{lastShown}</strong> dari{' '}
            <strong className="font-semibold text-slate-800">{filteredStaff.length}</strong> pegawai
          </span>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <span>Baris per halaman:</span>
            <select
              className="h-7 px-2 bg-slate-50 border border-slate-200 text-slate-800 rounded font-medium focus:outline-none cursor-pointer"
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
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
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
