const tableData = [
  {
    id: 1,
    niy: '049097021',
    initials: 'BA',
    name: 'Bustanul Abidin, S.Pd',
    position: 'Guru Kelas 6 • Wali Kelas 6A',
    timeIn: '06:42 WIB',
    timeOut: '15:05 WIB',
    status: 'Tepat Waktu',
    statusType: 'ontime',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
  },
  {
    id: 2,
    niy: '04901054',
    initials: 'WY',
    name: 'Wisna Yunita, S.Pd',
    position: 'Guru Kelas 1 • Tematik',
    timeIn: '06:48 WIB',
    timeOut: '15:02 WIB',
    status: 'Tepat Waktu',
    statusType: 'ontime',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
  },
  {
    id: 3,
    niy: '049098034',
    initials: 'SL',
    name: 'Sulasmi, S.Pd',
    position: 'Guru Kelas 3 • Koord. Tahfidz',
    timeIn: '06:55 WIB',
    timeOut: null,
    statusIn: '06:55 WIB',
    status: 'Belum Pulang',
    statusType: 'pending',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  {
    id: 4,
    niy: '029015072',
    initials: 'AC',
    name: 'Aulia Chalida, S.Pd',
    position: 'Kaur TU SD • Administrasi',
    timeIn: '07:12 WIB',
    timeOut: null,
    statusIn: null,
    status: 'Terlambat 12 menit',
    statusType: 'late',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    dotColor: 'bg-amber-500',
    isLate: true,
  },
  {
    id: 5,
    niy: '029019097',
    initials: 'MG',
    name: 'Melsi Gustia, S.Sos',
    position: 'Staf Administrasi & Inventaris',
    timeIn: '06:50 WIB',
    timeOut: '15:00 WIB',
    status: 'Tepat Waktu',
    statusType: 'ontime',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
  },
  {
    id: 6,
    niy: '049033108',
    initials: 'HK',
    name: 'Hendra Kurniawan, S.Pd.I',
    position: 'Guru PAI SD • Pembina Rohis',
    timeIn: null,
    timeOut: null,
    status: 'Alpha',
    statusType: 'alpha',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-800',
    dotColor: 'bg-rose-600',
    isAlpha: true,
    rowBg: 'bg-rose-50/20',
  },
]

const totalPages = 8

function AttendanceTable() {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="p-space-lg border-b border-surface-variant/50 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Presensi Hari Ini</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              Selasa, 15 September 2026
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Daftar kehadiran seluruh pendidik dan tenaga kependidikan unit SD Islam RJ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-xs">
          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-3 text-body-sm font-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
              placeholder="Cari nama atau NIY..."
              type="text"
            />
          </div>
          <div className="relative">
            <select className="h-9 px-3 pr-8 bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface appearance-none focus:outline-none cursor-pointer">
              <option value="all">Semua Status</option>
              <option value="ontime">Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="alpha">Alpha / Tidak Hadir</option>
              <option value="permit">Izin / Cuti</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[16px]">expand_more</span>
          </div>
          <button className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center gap-1.5 hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
            <span>15/09/2026</span>
          </button>
          <button className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1.5 hover:bg-primary-container/90 transition-colors shadow-sm ml-auto lg:ml-0">
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Download Rekap (.XLSX)</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/70 border-b border-surface-variant/70 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">
                <input className="rounded text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
              </th>
              <th className="py-3 px-4 w-32 font-label-sm">NIY</th>
              <th className="py-3 px-4 font-label-sm">Nama Pegawai & Jabatan</th>
              <th className="py-3 px-4 font-label-sm">Jam Masuk</th>
              <th className="py-3 px-4 font-label-sm">Jam Pulang</th>
              <th className="py-3 px-4 font-label-sm">Status Presensi</th>
              <th className="py-3 px-4 text-right font-label-sm">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant/40 font-body-md text-body-md">
            {tableData.map((row) => (
              <tr key={row.id} className={`hover:bg-surface-container-low/50 transition-colors ${row.rowBg || ''}`}>
                <td className="py-3.5 px-4 text-center">
                  <input className="rounded text-secondary focus:ring-0 cursor-pointer" type="checkbox" />
                </td>
                <td className="py-3.5 px-4 font-body-sm-medium text-body-sm-medium text-on-surface-variant tabular-nums">{row.niy}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-label-md text-label-md font-bold flex-shrink-0 ${
                      row.isAlpha ? 'bg-rose-100 text-rose-800' : row.isLate ? 'bg-amber-100 text-amber-800' : row.initials === 'SL' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}>
                      {row.initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">{row.name}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{row.position}</span>
                    </div>
                  </div>
                </td>
                <td className={`py-3.5 px-4 font-body-sm-medium text-body-sm-medium tabular-nums ${
                  row.isLate ? 'text-amber-700' : row.isAlpha ? 'text-on-surface-variant' : 'text-on-surface'
                }`}>
                  {row.timeIn || '-'}
                </td>
                <td className={`py-3.5 px-4 font-body-sm-medium text-body-sm-medium tabular-nums ${
                  row.isAlpha ? 'text-on-surface-variant' : 'text-on-surface'
                }`}>
                  {row.timeOut || '-'}
                </td>
                <td className="py-3.5 px-4">
                  {row.isAlpha ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      Alpha
                    </span>
                  ) : row.timeOut === null && !row.isLate ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[12px]">
                      <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                      Belum Pulang
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${row.bgColor} ${row.textColor} font-label-sm text-label-sm`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.dotColor}`}></span>
                      {row.status}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="px-2.5 py-1 text-secondary hover:bg-secondary/10 rounded font-label-md text-label-md transition-colors">
                    Detail / Koreksi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-space-md border-t border-surface-variant/50 flex flex-col sm:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Menampilkan <strong className="text-on-surface font-body-sm-medium">1 - 6</strong> dari <strong className="text-on-surface font-body-sm-medium">45</strong> pegawai unit SD Islam RJ
        </span>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40" disabled="">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center">1</button>
          <button className="w-8 h-8 rounded text-on-surface-variant hover:bg-surface-container-low font-label-md text-label-md flex items-center justify-center transition-colors">2</button>
          <button className="w-8 h-8 rounded text-on-surface-variant hover:bg-surface-container-low font-label-md text-label-md flex items-center justify-center transition-colors">3</button>
          <span className="px-1 text-outline">...</span>
          <button className="w-8 h-8 rounded text-on-surface-variant hover:bg-surface-container-low font-label-md text-label-md flex items-center justify-center transition-colors">8</button>
          <button className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttendanceTable