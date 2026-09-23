import { useSimPres, selectUnitName } from '../store/simPresStore.jsx'

// Baris tabel di-derive dari satu sumber data (store) — 6 pegawai teratas.
const roleDisplayMap = {
  'Guru PAI': 'Pendidik Tetap Yayasan',
  'Guru Kelas 6 & Kurikulum': 'Tim Pengembang Akademik',
  'Guru Kelas 3 • Tahfidz': 'Koordinator Keagamaan',
  'Guru Kelas 1 • Tematik': 'Pendidik Kelas Bawah',
  'Guru Sentra': 'Sentra Kreativitas Anak',
  'Guru Biologi & Laboran': 'Cuti Studi Lanjut',
}

function StaffTable() {
  const { state } = useSimPres()
  const staffData = state.staff.slice(0, 6).map((s, idx) => ({
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

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left font-body-md text-body-md">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center" scope="col">#</th>
              <th className="py-3 px-4 w-36" scope="col">NIY</th>
              <th className="py-3 px-4 min-w-[220px]" scope="col">Nama Lengkap & Gelar</th>
              <th className="py-3 px-4 min-w-[160px]" scope="col">Unit Sekolah</th>
              <th className="py-3 px-4 min-w-[230px]" scope="col">Jabatan / Penugasan</th>
              <th className="py-3 px-4 w-28 text-center" scope="col">Status</th>
              <th className="py-3 px-4 w-60 text-right pr-6" scope="col">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="text-on-surface">
            {staffData.map((staff) => (
              <tr key={staff.id} className={`${staff.rowBg} hover:bg-surface-container-low transition-colors`}>
                <td className="py-3.5 px-4 text-center font-label-md text-label-md text-on-surface-variant">{staff.id}</td>
                <td className="py-3.5 px-4 font-mono text-body-sm text-on-surface">{staff.niy}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-space-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-headline-sm flex-shrink-0 ${
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
                      <span className={`font-body-md-medium text-body-md-medium text-on-surface truncate ${staff.isInactive ? 'opacity-85' : ''}`}>
                        {staff.name}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{staff.role}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <a className="inline-flex items-center gap-1 font-body-sm-medium text-body-sm-medium text-secondary hover:underline" href="#">
                    <span className="material-symbols-outlined text-[16px]">{staff.unitIcon}</span>
                    <span>{staff.unit}</span>
                  </a>
                </td>
                <td className="py-3.5 px-4 text-body-md text-body-md text-on-surface">
                  {staff.assignment}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {staff.statusActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body-sm-medium text-body-sm-medium bg-emerald-50 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body-sm-medium text-body-sm-medium bg-rose-50 text-rose-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right pr-6">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      className="h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-secondary font-label-md text-label-md flex items-center gap-1 transition-colors"
                      title="Detail Pegawai"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Detail</span>
                    </button>
                    <button
                      className="h-8 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-label-md text-label-md flex items-center gap-1 transition-colors"
                      title="Reset Sandi Presensi"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                      <span>Reset</span>
                    </button>
                    {staff.statusActive ? (
                      <button
                        className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                        title="Nonaktifkan Pegawai"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">block</span>
                      </button>
                    ) : (
                      <button
                        className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-label-md text-label-md flex items-center gap-1 transition-colors"
                        title="Aktifkan Kembali"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Aktifkan</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
          <span>Menampilkan <strong className="font-body-sm-medium text-on-surface">1–{staffData.length}</strong> dari <strong className="font-body-sm-medium text-on-surface">{state.staff.length}</strong> data pegawai</span>
          <span className="text-surface-variant">•</span>
          <div className="flex items-center gap-1">
            <span>Baris per halaman:</span>
            <select className="h-7 px-2 bg-surface-container-low text-on-surface font-body-sm rounded focus:outline-none cursor-pointer">
              <option>10</option>
              <option selected>20</option>
              <option>50</option>
              <option>Semua</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed" disabled type="button">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-container text-on-primary font-body-sm-medium" type="button">1</button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container font-body-sm transition-colors" type="button">2</button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container font-body-sm transition-colors" type="button">3</button>
          <span className="px-1 text-on-surface-variant font-body-sm">...</span>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container font-body-sm transition-colors" type="button">{Math.ceil(state.staff.length / 20)}</button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors" type="button">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default StaffTable