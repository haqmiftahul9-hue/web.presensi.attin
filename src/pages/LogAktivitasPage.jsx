import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'

const actionStyles = {
  ubah: 'bg-amber-50 text-amber-800',
  tambah: 'bg-blue-50 text-blue-700',
  hapus: 'bg-red-50 text-red-700',
  reset: 'bg-red-50 text-red-700',
  login: 'bg-surface-container text-on-surface-variant',
}

const actionIcons = {
  ubah: 'edit',
  tambah: 'add',
  hapus: 'delete',
  reset: 'lock_reset',
  login: 'login',
}

function LogAktivitasPage() {
  const { state } = useSimPres()
  const [search, setSearch] = useState('')

  const logs = state.logs.map((log, idx) => ({
    id: log.id,
    time: log.time,
    initials: initialsOf(log.actor),
    name: log.actor,
    role: log.role,
    roleColor: log.role === 'Superadmin' ? 'text-secondary' : 'text-on-surface-variant',
    action: log.action,
    actionType: log.action.toLowerCase().includes('tambah') ? 'tambah' : log.action.toLowerCase().includes('hapus') ? 'hapus' : log.action.toLowerCase().includes('reset') ? 'reset' : log.action.toLowerCase().includes('login') ? 'login' : 'ubah',
    target: log.target.includes('Unit') ? 'Pengaturan Unit' : log.target.includes('Pegawai') ? 'Data Pegawai' : log.target.includes('Cuti') ? 'Pengajuan Cuti' : log.target.includes('Akun') || log.target.includes('Sesi') ? 'Akun Pengguna' : 'Jadwal Shift',
    targetSub: log.target.includes('•') ? log.target.split('•')[1].trim() : log.target,
    desc: log.desc,
  }))

  // Statistik kartu di-derive dari data log di store (satu sumber data).
  const totalLogHariIni = state.logs.length
  const targetCounts = logs.reduce((acc, row) => {
    acc[row.target] = (acc[row.target] || 0) + 1
    return acc
  }, {})
  const topActivity = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0]

  const filteredData = logs.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.target.toLowerCase().includes(search.toLowerCase()) ||
      row.action.toLowerCase().includes(search.toLowerCase()) ||
      row.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-lg py-space-md flex flex-col gap-space-md">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-space-sm">
          <div className="flex flex-col gap-space-2xs">
            <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm font-label-sm tracking-normal">
              <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="hover:text-on-surface cursor-pointer transition-colors">Pengaturan & Sistem</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-secondary font-body-sm font-body-sm-medium">Log Aktivitas</span>
            </nav>
            <div className="flex items-center gap-space-xs mt-1">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">history</span>
              </div>
              <h1 className="font-headline-lg font-headline-lg text-on-surface tracking-tight leading-none">Log Aktivitas</h1>
            </div>
            <p className="font-body-md font-body-md text-on-surface-variant max-w-3xl">
              Rekam jejak seluruh aktivitas sistem, perubahan data master, konfigurasi unit, dan autentikasi pengguna secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-space-xs flex-shrink-0 self-start md:self-auto">
            <button
              onClick={() => setSearch('')}
              className="h-10 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5 shadow-sm text-body-sm font-body-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">filter_alt_off</span>
              <span>Bersihkan Filter</span>
            </button>
            <button className="h-10 px-space-md rounded-lg bg-primary-container hover:bg-primary text-on-primary transition-colors flex items-center gap-2 shadow-sm text-body-sm font-body-sm cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Log (.CSV)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">Total Log Hari Ini</span>
                <span className="font-headline-sm font-headline-sm text-on-surface font-semibold">{totalLogHariIni} Catatan Masuk</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm font-label-sm">Hari ini</span>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">Aktivitas Terbanyak</span>
                <span className="font-headline-sm font-headline-sm text-on-surface font-semibold">{topActivity ? `${topActivity[0]} (${topActivity[1]}x)` : '-'}</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm font-label-sm">Terbanyak</span>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">security_update_good</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">Kebijakan Retensi</span>
                <span className="font-headline-sm font-headline-sm text-on-surface font-semibold">365 Hari Penyimpanan</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm font-label-sm">Auto-purge</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-space-xs">
          <div className="flex items-center gap-2 px-space-sm h-10 bg-surface-container-low rounded-lg text-on-surface cursor-pointer hover:bg-surface-container transition-colors min-w-[220px]">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">calendar_today</span>
            <div className="flex flex-col text-left">
              <span className="font-label-sm font-label-sm text-[10px] text-on-surface-variant uppercase leading-none">Rentang Tanggal</span>
              <span className="font-body-sm font-body-sm-medium text-on-surface leading-tight mt-0.5">01 Sep 2026 - 15 Sep 2026</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] ml-auto">arrow_drop_down</span>
          </div>
          <div className="relative min-w-[180px]">
            <select className="w-full h-10 appearance-none pl-space-sm pr-8 bg-surface-container-low text-on-surface font-body-sm font-body-sm-medium rounded-lg focus:outline-none focus:bg-surface-container cursor-pointer transition-colors">
              <option value="">Semua User</option>
              {state.adminUsers.map((u) => (
                <option key={u.id} value={u.role.toLowerCase().replace(' ', '-')}>{u.role} — {u.name.split(',')[0]}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <div className="relative min-w-[150px]">
            <select className="w-full h-10 appearance-none pl-space-sm pr-8 bg-surface-container-low text-on-surface font-body-sm font-body-sm-medium rounded-lg focus:outline-none focus:bg-surface-container cursor-pointer transition-colors">
              <option value="">Semua Aksi</option>
              <option value="create">Tambah</option>
              <option value="update">Ubah</option>
              <option value="delete">Hapus</option>
              <option value="reset">Reset Password</option>
              <option value="login">Login</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="w-full h-10 pl-9 pr-space-md bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm font-body-sm rounded-lg focus:outline-none focus:bg-surface-container transition-colors"
              placeholder="Cari target objek, user, atau keterangan..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-body-md text-body-md border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm font-label-sm uppercase tracking-wider h-11">
                  <th className="py-2.5 px-space-md w-[180px]" scope="col">Waktu & Tanggal</th>
                  <th className="py-2.5 px-space-sm w-[240px]" scope="col">User Pelaksana</th>
                  <th className="py-2.5 px-space-sm w-[150px]" scope="col">Jenis Aksi</th>
                  <th className="py-2.5 px-space-sm w-[230px]" scope="col">Target / Objek</th>
                  <th className="py-2.5 px-space-md" scope="col">Keterangan Aktivitas</th>
                </tr>
              </thead>
              <tbody className="font-body-md font-body-md text-on-surface divide-y divide-surface-container">
                {filteredData.map((row) => (
                  <tr key={row.id} className={`${(filteredData.indexOf(row) % 2 === 1) ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest'} hover:bg-surface-container-low transition-colors`}>
                    <td className="py-3 px-space-md whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">schedule</span>
                        <span className="font-body-sm font-body-sm-medium">{row.time}</span>
                        <span className="text-[11px] text-on-surface-variant">WIB</span>
                      </div>
                    </td>
                    <td className="py-3 px-space-sm">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-body-sm font-body-sm-medium flex items-center justify-center flex-shrink-0 text-xs">
                          {row.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body-sm font-body-sm-medium text-on-surface truncate">{row.name}</span>
                          <span className={`font-label-sm font-label-sm text-[11px] ${row.roleColor} leading-none`}>{row.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-space-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight ${actionStyles[row.actionType]}`}>
                        <span className="material-symbols-outlined text-[13px]">{actionIcons[row.actionType]}</span>
                        <span>{row.action}</span>
                      </span>
                    </td>
                    <td className="py-3 px-space-sm">
                      <div className="flex flex-col">
                        <span className="font-body-sm font-body-sm-medium text-on-surface">{row.target}</span>
                        <span className="text-[11px] text-on-surface-variant">{row.targetSub}</span>
                      </div>
                    </td>
                    <td className="py-3 px-space-md">
                      <p className="font-body-sm font-body-sm text-on-surface leading-relaxed">{row.desc}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-space-md py-space-sm bg-surface-container-lowest border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm font-body-sm text-on-surface-variant">
              Menampilkan <span className="font-body-sm font-body-sm-medium text-on-surface font-semibold">1</span> - <span className="font-body-sm font-body-sm-medium text-on-surface font-semibold">{filteredData.length}</span> dari <span className="font-body-sm font-body-sm-medium text-on-surface font-semibold">{state.logs.length}</span> catatan log
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 text-xs font-medium cursor-not-allowed opacity-60" disabled type="button">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Sebelumnya</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-body-sm font-body-sm-medium text-xs flex items-center justify-center cursor-pointer" type="button">1</button>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-body-sm font-body-sm-medium text-xs flex items-center justify-center transition-colors cursor-pointer" type="button">2</button>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-body-sm font-body-sm-medium text-xs flex items-center justify-center transition-colors cursor-pointer" type="button">3</button>
              <span className="w-6 text-center text-xs text-on-surface-variant tracking-widest">...</span>
              <button className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface font-body-sm font-body-sm-medium text-xs flex items-center justify-center transition-colors cursor-pointer" type="button">27</button>
              <button className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer" type="button">
                <span>Berikutnya</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogAktivitasPage
