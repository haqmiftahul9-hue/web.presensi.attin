import { useState } from 'react'
import { useSimPres, selectUnitName, initialsOf } from '../store/simPresStore.jsx'

const roleStyles = {
  Superadmin: { roleBg: 'bg-purple-50', roleText: 'text-purple-700', roleDot: 'bg-purple-600', unitIcon: 'account_balance' },
  'Admin Unit': { roleBg: 'bg-blue-50', roleText: 'text-secondary', roleDot: 'bg-secondary', unitIcon: 'school' },
  Guru: { roleBg: 'bg-slate-100', roleText: 'text-slate-700', roleDot: 'bg-slate-500', unitIcon: 'school' },
}

function AdminUserPage() {
  const { state } = useSimPres()
  const [showModal, setShowModal] = useState(false)

  // Data pengguna di-derive dari satu sumber data (store).
  const users = state.adminUsers.map((u, idx) => {
    const r = roleStyles[u.role] || roleStyles.Guru
    return {
      id: u.id,
      initials: initialsOf(u.name),
      name: u.name,
      nik: `3201${u.niy.slice(1, 13)}`,
      email: u.email,
      niy: u.niy,
      role: u.role,
      roleBg: r.roleBg,
      roleText: r.roleText,
      roleDot: r.roleDot,
      unit: selectUnitName(state, u.unitId),
      unitIcon: r.unitIcon,
      status: u.status,
      statusBg: u.status === 'Aktif' ? 'bg-emerald-100' : 'bg-rose-100',
      statusText: u.status === 'Aktif' ? 'text-emerald-800' : 'text-rose-800',
      statusDot: u.status === 'Aktif' ? 'bg-emerald-600' : 'bg-rose-600',
      rowBg: idx % 2 === 0 ? '' : 'bg-surface-container-low/30',
    }
  })

  return (
    <div className="flex flex-col w-full">
      {/* Sub-Header & Breadcrumb */}
      <div className="w-full bg-surface-container-lowest px-space-xl py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="hover:text-secondary cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface font-body-md-medium">Manajemen Admin & User</span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Server Pusat: Normal</span>
          </div>
          <span className="text-outline-variant">|</span>
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">database</span>
            <span>Sinkronisasi Terakhir: 14:02 WIB</span>
          </div>
        </div>
      </div>

      <div className="p-space-xl flex flex-col gap-space-lg">
        {/* Page Title & Key Metrics */}
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Manajemen Admin & User</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-3xl">
                Kelola hak akses akun sistem, penugasan per unit sekolah, otentikasi peran, dan kredensial pengguna terpusat.
              </p>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-space-xs px-space-md py-2.5 bg-emerald-600 hover:bg-emerald-700 text-on-primary font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span>+ Tambah Admin/User Baru</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Total Akun Aktif</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-primary font-bold">218</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Pengguna</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm">+12 bulan ini</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">terverifikasi</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Superadmin Pusat</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-primary font-bold">3</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-purple-700 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  <span>Hak akses penuh sistem</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Admin Unit Sekolah</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-primary font-bold">14</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">apartment</span>
                  <span>5 unit sekolah terdaftar</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant">Guru & Staf Akun</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-on-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
              </div>
              <div className="mt-space-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-primary font-bold">201</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Akun</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-slate-600 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">phonelink_setup</span>
                  <span>Terhubung mobile app SimPres</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar & Actions */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs flex-1">
            <div className="relative min-w-[260px] flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
                placeholder="Cari nama, email, atau NIY..."
                type="text"
              />
            </div>
            <div className="relative">
              <select className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer">
                <option>Semua Role</option>
                <option>Superadmin</option>
                <option>Admin Unit</option>
                <option>Guru / Pegawai</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer">
                <option>Semua Unit</option>
                <option>TK IT RJ</option>
                <option>SD Islam RJ</option>
                <option>SMP Islam RJ</option>
                <option>SMA Islam RJ</option>
                <option>Sekretariat / Yayasan</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select className="h-10 pl-3 pr-8 bg-surface-container-low text-on-surface rounded-lg font-body-md text-body-md focus:outline-none appearance-none cursor-pointer">
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Nonaktif</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs justify-end">
            <button className="flex items-center gap-1.5 h-10 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors font-body-md-medium text-body-md-medium cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span>Reset Filter</span>
            </button>
            <button className="flex items-center gap-1.5 h-10 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Ekspor Data</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <input className="rounded w-4 h-4 text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
                  </th>
                  <th className="py-3 px-4 font-semibold">Nama & Profil Pengguna</th>
                  <th className="py-3 px-4 font-semibold">Email & NIY</th>
                  <th className="py-3 px-4 font-semibold">Role Sistem</th>
                  <th className="py-3 px-4 font-semibold">Unit Penugasan</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi & Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-md text-body-md">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-container-low/70 transition-colors ${user.rowBg}`}>
                    <td className="py-3.5 px-4 text-center">
                      <input className="rounded w-4 h-4 text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-9 h-9 rounded-full font-headline-sm flex items-center justify-center font-bold flex-shrink-0 ${user.roleBg} ${user.roleText}`}>
                          {user.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">{user.name}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">NIK: {user.nik}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface">{user.email}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">NIY {user.niy}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ${user.roleBg} ${user.roleText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.roleDot}`}></span>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-outline">{user.unitIcon}</span>
                        <span className="font-body-sm-medium text-body-sm-medium">{user.unit}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm ${user.statusBg} ${user.statusText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.statusDot}`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-surface-container text-secondary transition-colors cursor-pointer" title="Edit Pengguna">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface-container text-amber-600 transition-colors cursor-pointer" title="Reset Password">
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-surface-container text-rose-600 transition-colors cursor-pointer" title="Nonaktifkan Akun">
                          <span className="material-symbols-outlined text-[18px]">block</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-space-md py-space-sm bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <span className="font-body-sm-medium text-on-surface">1 - 6</span> dari <span className="font-body-sm-medium text-on-surface">218</span> pengguna terdaftar
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40" disabled type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm" type="button">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm transition-colors" type="button">2</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm transition-colors" type="button">3</button>
              <span className="w-8 h-8 flex items-center justify-center text-outline font-label-sm text-label-sm">...</span>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-sm text-label-sm transition-colors" type="button">37</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Role Matrix Banner */}
        <div className="rounded-xl p-space-md bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Panduan Kebijakan Hak Akses Yayasan</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Admin Unit hanya memiliki wewenang approval presensi dan penyesuaian jadwal pada unit bersangkutan. Otoritas penambahan akun guru dan reset kata sandi massal dipegang oleh Superadmin Pusat.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-surface-container-lowest hover:bg-white text-secondary font-body-sm-medium text-body-sm-medium rounded-lg shadow-sm whitespace-nowrap transition-colors cursor-pointer" type="button">
            Lihat Matriks Role & Izin
          </button>
        </div>
      </div>

      {/* Modal: Tambah User Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-space-lg py-space-md bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">person_add</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary leading-tight">Tambah User Baru</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Buat akun pengguna baru dan atur hak akses peran serta unit sekolah.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto flex flex-col gap-space-md">
              {/* Nama Lengkap */}
              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                  Nama Lengkap Beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">badge</span>
                  <input
                    className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                    placeholder="e.g. Wisna Yunita, S.Pd"
                    type="text"
                    value="Wisna Yunita, S.Pd"
                  />
                </div>
              </div>

              {/* Email & NIY Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Alamat Email Resmi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                    <input
                      className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                      placeholder="wisna.y@sd.raudhatuljannah.sch.id"
                      type="email"
                      value="wisna.y@sd.raudhatuljannah.sch.id"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    NIY (Nomor Induk Yayasan) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">numbers</span>
                    <input
                      className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                      placeholder="e.g. 049001054"
                      type="text"
                      value="049001054"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Unit Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Role / Peran Sistem <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="w-full h-10 pl-3 pr-8 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none appearance-none cursor-pointer">
                      <option value="superadmin">Superadmin Pusat</option>
                      <option selected value="admin_unit">Admin Unit</option>
                      <option value="guru">Guru / Pegawai</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Unit Penugasan Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="w-full h-10 pl-3 pr-8 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface focus:outline-none appearance-none cursor-pointer">
                      <option value="pusat">Pusat Yayasan</option>
                      <option value="tk">TK IT RJ</option>
                      <option selected value="sd">SD Islam RJ</option>
                      <option value="smp">SMP Islam RJ</option>
                      <option value="sma">SMA Islam RJ</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant -mt-2">
                Pilihan unit wajib untuk akun dengan peran <span className="font-body-sm-medium text-on-surface">Admin Unit</span> dan <span className="font-body-sm-medium text-on-surface">Guru/Pegawai</span>.
              </p>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Password Sementara</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">key</span>
                    <input
                      className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-lg font-mono text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest"
                      id="tempPasswordInput"
                      type="text"
                      value="SimPres#2026!rj"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const sample = 'SimPres#' + Math.floor(1000 + Math.random() * 9000) + '!rj'
                      const passInput = document.getElementById('tempPasswordInput')
                      if (passInput) passInput.value = sample
                    }}
                    className="h-10 px-3.5 bg-surface-container-low hover:bg-surface-container text-secondary font-body-sm-medium text-body-sm-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">autorenew</span>
                    <span>+ Generate Otomatis</span>
                  </button>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="p-space-md bg-surface-container-low rounded-xl flex items-start justify-between gap-space-sm">
                <div className="flex flex-col">
                  <span className="font-body-md-medium text-body-md-medium text-on-surface">Wajib ganti password saat login pertama</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Pengguna akan diminta membuat password baru segera setelah pertama kali masuk ke portal web atau mobile app SimPres.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                  <input defaultChecked className="sr-only peer" type="checkbox" />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-space-lg py-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">mark_email_read</span>
                <span>Kredensial otomatis terkirim via notifikasi email.</span>
              </div>
              <div className="flex items-center gap-space-xs w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Batal
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserPage