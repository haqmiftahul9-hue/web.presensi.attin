import { useState } from 'react'

const chartData = [
  { day: '01', hadir: 82, terlambat: 8, izin: 7, alpha: 3 },
  { day: '02', hadir: 86, terlambat: 5, izin: 6, alpha: 3 },
  { day: '03', hadir: 84, terlambat: 7, izin: 7, alpha: 2 },
  { day: '04', hadir: 78, terlambat: 12, izin: 6, alpha: 4 },
  { day: '05', hadir: 88, terlambat: 4, izin: 6, alpha: 2 },
  { day: '06', hadir: 85, terlambat: 15, izin: 0, alpha: 0, weekend: true },
  { day: '07', hadir: 90, terlambat: 10, izin: 0, alpha: 0, weekend: true },
  { day: '08', hadir: 89, terlambat: 4, izin: 5, alpha: 2 },
  { day: '09', hadir: 82, terlambat: 9, izin: 6, alpha: 3 },
  { day: '10', hadir: 80, terlambat: 10, izin: 7, alpha: 3 },
  { day: '11', hadir: 87, terlambat: 5, izin: 5, alpha: 3 },
  { day: '12', hadir: 91, terlambat: 3, izin: 4, alpha: 2 },
  { day: '13', hadir: 85, terlambat: 15, izin: 0, alpha: 0, weekend: true },
  { day: '14', hadir: 88, terlambat: 5, izin: 5, alpha: 2 },
  { day: '15', hadir: 85, terlambat: 6, izin: 6, alpha: 3, current: true },
]

const tableData = [
  { id: 1, initials: 'EA', name: 'Erianto, S.Ag, M.Pd.I', role: 'Guru Tetap', niy: '049005069', unit: 'SMP Islam RJ', masuk: '06:45 WIB', pulang: '15:10 WIB', stMasuk: 'Tepat Waktu', stMasukType: 'good', stPulang: 'Tepat Waktu', stPulangType: 'good', ket: 'Tugas Pengawas Ujian' },
  { id: 2, initials: 'BA', name: 'Bustanul Abidin, S.Pd', role: 'Guru Kelas', niy: '049097021', unit: 'SD Islam RJ', masuk: '07:12 WIB', pulang: '15:05 WIB', stMasuk: 'Terlambat 12 menit', stMasukType: 'late', stPulang: 'Tepat Waktu', stPulangType: 'good', ket: 'Dispensasi Rapat Gugus' },
  { id: 3, initials: 'SU', name: 'Sulasmi, S.Pd', role: 'Guru Mata Pelajaran', niy: '049098034', unit: 'SD Islam RJ', masuk: '06:50 WIB', pulang: '-', stMasuk: 'Tepat Waktu', stMasukType: 'good', stPulang: 'Tidak Presensi Pulang', stPulangType: 'early', ket: 'Lupa tap pulang / verifikasi TU' },
  { id: 4, initials: 'HK', name: 'Hendra Kurniawan, S.Pd.I', role: 'Guru Agama', niy: '049033108', unit: 'SD Islam RJ', masuk: '-', pulang: '-', stMasuk: 'Alpha', stMasukType: 'alpha', stPulang: 'Alpha', stPulangType: 'alpha', ket: 'Tanpa surat pemberitahuan' },
  { id: 5, initials: 'RF', name: 'Risa Fadillah, S.Pd', role: 'Guru BK', niy: '029012056', unit: 'SMA Islam RJ', masuk: '-', pulang: '-', stMasuk: 'Izin', stMasukType: 'leave', stPulang: 'Izin', stPulangType: 'leave', ket: 'Cuti Alasan Penting (Lampiran SK)' },
  { id: 6, initials: 'WY', name: 'Wisna Yunita, S.Pd', role: 'Guru Bahasa', niy: '049001054', unit: 'SD Islam RJ', masuk: '06:48 WIB', pulang: '15:02 WIB', stMasuk: 'Tepat Waktu', stMasukType: 'good', stPulang: 'Tepat Waktu', stPulangType: 'good', ket: 'Guru Kelas Reguler' },
  { id: 7, initials: 'IW', name: 'Irmawati, S.Pd', role: 'Pendidik PAUD', niy: '029011052', unit: 'PAUD IT RJ', masuk: '07:20 WIB', pulang: '14:45 WIB', stMasuk: 'Terlambat 20 menit', stMasukType: 'late', stPulang: 'Pulang Lebih Awal', stPulangType: 'early', ket: 'Izin dinas luar jam 14:30' },
  { id: 8, initials: 'SM', name: 'Silvana Monica', role: 'Staf Administrasi', niy: '049023183', unit: 'Sekretariat', masuk: '-', pulang: '-', stMasuk: 'Izin', stMasukType: 'leave', stPulang: 'Izin', stPulangType: 'leave', ket: 'Surat Sakit Dokter RS Radja' },
]

const statusStyles = {
  good: 'bg-[#DCFCE7] text-[#16A34A]',
  late: 'bg-[#FEF3C7] text-[#B45309]',
  early: 'bg-[#FFEDD5] text-[#C2410C]',
  alpha: 'bg-[#ffdad6] text-[#93000a]',
  leave: 'bg-tertiary-fixed text-on-tertiary-fixed',
}

const avatarStyles = [
  'bg-primary text-on-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-surface-container-high text-on-surface',
  'bg-error-container text-on-error',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-primary text-on-primary',
  'bg-surface-container-highest text-on-surface',
  'bg-tertiary-fixed text-on-tertiary-fixed',
]

function RekapLaporanPage() {
  const [activeTab, setActiveTab] = useState('Bulanan')
  const [search, setSearch] = useState('')

  const tabs = ['Harian', 'Mingguan', 'Bulanan']

  const filteredTable = tableData.filter((row) =>
    row.name.toLowerCase().includes(search.toLowerCase()) ||
    row.niy.includes(search) ||
    row.unit.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        {/* Page Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[26px]">bar_chart</span>
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Rekap & Laporan</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Analisis komprehensif kehadiran, kepatuhan jam kerja, dan ekspor laporan berkala seluruh unit sekolah.</p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-surface-container-low px-space-md py-1.5 rounded-full shadow-sm">
            <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-outline">home</span>
              <span>Home</span>
              <span className="text-outline">/</span>
              <span>Laporan</span>
              <span className="text-outline">/</span>
              <span className="text-secondary font-body-md-medium">Rekap & Laporan Kehadiran</span>
            </div>
          </div>
        </div>

        {/* Filter & Action Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Segmented Tabs */}
            <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-md font-label-md text-label-md transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Date Range */}
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">calendar_today</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">01 Sep 2026 – 15 Sep 2026</span>
              <span className="material-symbols-outlined text-[18px] text-outline ml-2">arrow_drop_down</span>
            </div>
            {/* Unit Selector */}
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">domain</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">Semua Unit (5 Unit)</span>
              <span className="material-symbols-outlined text-[18px] text-outline ml-2">expand_more</span>
            </div>
          </div>
          {/* Export Buttons */}
          <div className="flex items-center gap-space-xs flex-wrap">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-low shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">table_chart</span>
              <span>Export Excel</span>
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-low shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span>
              <span>Export PDF</span>
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-sm text-headline-sm text-primary">Tren Kehadiran & Kepatuhan Jam Kerja</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">94.2% Rata-rata</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Periode 1–15 September 2026 (Seluruh Jenjang Terdaftar)</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir Tepat Waktu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#F59E0B]"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-tertiary-fixed-dim"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Izin/Sakit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-error"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Alpha</span>
              </div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="relative w-full pt-4">
            {/* Grid Guides */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-on-surface-variant/40 font-label-sm text-label-sm">
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">100%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">75%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">50%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">25%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">0%</span>
                <div className="flex-1 h-px bg-surface-container-high"></div>
              </div>
            </div>

            {/* Bars */}
            <div className="relative ml-9 h-56 flex items-end justify-between gap-1.5 sm:gap-3 overflow-x-auto pt-2 pb-8">
                {chartData.map((d) => (
                <div key={d.day} className={`group flex flex-col items-center flex-1 min-w-[28px] h-full justify-end ${d.weekend ? 'opacity-40' : ''} cursor-pointer`}>
                  <div className={`w-full max-w-[24px] rounded-t-sm bg-surface-container-low flex flex-col-reverse overflow-hidden shadow-sm group-hover:opacity-90 transition-opacity ${d.current ? 'shadow-md ring-2 ring-secondary/20' : ''}`} style={{ height: `${d.hadir + d.terlambat + d.izin + d.alpha}%` }}>
                    <div className="w-full bg-secondary-container" style={{ height: `${d.hadir}%` }}></div>
                    <div className="w-full bg-[#F59E0B]" style={{ height: `${d.terlambat}%` }}></div>
                    {d.izin > 0 && <div className="w-full bg-tertiary-fixed-dim" style={{ height: `${d.izin}%` }}></div>}
                    {d.alpha > 0 && <div className="w-full bg-error" style={{ height: `${d.alpha}%` }}></div>}
                  </div>
                  <span className={`absolute -bottom-1 font-label-sm text-label-sm ${d.weekend ? 'text-outline' : d.current ? 'font-body-sm-medium text-secondary' : 'group-hover:text-primary text-on-surface-variant'}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-2">
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Total Jam Kerja</span>
                <span className="font-headline-sm text-headline-sm text-primary">14.820 <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">Jam</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#B45309] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">history_toggle_off</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Rata-rata Keterlambatan</span>
                <span className="font-headline-sm text-headline-sm text-primary">6.4 <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">Menit / staf</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#16A34A] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tingkat Kepatuhan Jadwal</span>
                <span className="font-headline-sm text-headline-sm text-primary">92.8% <span className="font-body-sm text-body-sm text-[#16A34A] font-normal">+1.2%</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm pb-1">
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-primary">Rincian Log Presensi Pegawai</h3>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Menampilkan 1–{filteredTable.length} dari {tableData.length * 52} baris data log terkini</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="w-full h-9 pl-9 pr-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container"
                  placeholder="Filter nama atau NIY..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-lg" scope="col">Nama Pegawai</th>
                  <th className="py-3 px-3" scope="col">NIY</th>
                  <th className="py-3 px-3" scope="col">Unit</th>
                  <th className="py-3 px-3" scope="col">Jam Masuk</th>
                  <th className="py-3 px-3" scope="col">Jam Pulang</th>
                  <th className="py-3 px-3" scope="col">Status Masuk</th>
                  <th className="py-3 px-3" scope="col">Status Pulang</th>
                  <th className="py-3 px-4 rounded-r-lg" scope="col">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {filteredTable.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${avatarStyles[idx] || 'bg-secondary-fixed text-on-secondary-fixed'} font-label-md text-label-md flex items-center justify-center flex-shrink-0`}>
                          {row.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">{row.name}</span>
                          <span className="font-label-sm text-label-sm text-outline">{row.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-body-sm-medium text-body-sm-medium text-on-surface-variant">{row.niy}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">{row.unit}</span>
                    </td>
                    <td className="py-3 px-3 font-body-sm font-body-sm text-on-surface">{row.masuk}</td>
                    <td className="py-3 px-3 font-body-sm font-body-sm text-on-surface">{row.pulang}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm ${statusStyles[row.stMasukType]}`}>{row.stMasuk}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm ${statusStyles[row.stPulangType]}`}>{row.stPulang}</span>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">{row.ket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Halaman <span className="font-body-sm-medium text-on-surface">1</span> dari <span className="font-body-sm-medium text-on-surface">53</span> ({tableData.length * 52} total catatan)
            </span>
            <div className="flex items-center gap-1.5">
              <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-outline cursor-not-allowed font-label-sm text-label-sm flex items-center gap-1" disabled type="button">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Sebelumnya</span>
              </button>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center cursor-pointer" type="button">1</button>
                <button className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer" type="button">2</button>
                <button className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer" type="button">3</button>
                <span className="px-1 text-outline">...</span>
                <button className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer" type="button">53</button>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer" type="button">
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

export default RekapLaporanPage
