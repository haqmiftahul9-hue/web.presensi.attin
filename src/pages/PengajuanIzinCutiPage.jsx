import { useState } from 'react'
import { useSimPres, selectLeavesEnriched } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'
import { selectLeavesByStatus, selectPendingLeaves, selectApprovedLeaves, selectRejectedLeaves } from '../store/simPresStore.jsx'

const statusTabs = [
  { id: 'semua', label: 'Semua', count: 0, color: 'bg-surface-container-high text-on-surface-variant' },
  { id: 'menunggu', label: 'Menunggu', count: 0, color: 'bg-amber-100 text-amber-800' },
  { id: 'disetujui', label: 'Disetujui', count: 0, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'ditolak', label: 'Ditolak', count: 0, color: 'bg-red-100 text-red-800' },
]

const jenisOptions = [
  'Semua Jenis Izin/Cuti',
  'Sakit (Surat Dokter)',
  'Cuti Alasan Penting',
  'Cuti Bersalin/Melahirkan',
  'Cuti Besar',
  'Izin Keperluan Pribadi',
]

const statusClassMap = {
  'Menunggu': 'bg-amber-50 text-amber-700',
  'Disetujui': 'bg-emerald-50 text-emerald-700',
  'Ditolak': 'bg-red-50 text-red-700',
}

const statusDotMap = {
  'Menunggu': 'bg-amber-500',
  'Disetujui': 'bg-emerald-500',
  'Ditolak': 'bg-red-500',
}

const jenisClassMap = {
  'Sakit': 'bg-blue-50 text-blue-700',
  'Izin Pribadi': 'bg-orange-50 text-orange-700',
  'Cuti Penting': 'bg-indigo-50 text-indigo-700',
  'Cuti Bersalin': 'bg-purple-50 text-purple-700',
  'Cuti Besar': 'bg-teal-50 text-teal-700',
}

const avatarClassMap = {
  'Sakit': 'bg-emerald-100 text-emerald-900',
  'Izin Pribadi': 'bg-amber-100 text-amber-900',
  'Cuti Penting': 'bg-indigo-100 text-indigo-900',
  'Cuti Bersalin': 'bg-purple-100 text-purple-900',
  'Cuti Besar': 'bg-teal-100 text-teal-900',
}

function PengajuanIzinCutiPage() {
  const { state } = useSimPres()
  const [activeStatusTab, setActiveStatusTab] = useState('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua Status')
  const [filterJenis, setFilterJenis] = useState('Semua Jenis Izin/Cuti')
  const [filterBulan, setFilterBulan] = useState('Sep 2026')
  const [currentPage, setCurrentPage] = useState(1)

  // Izin/cuti + identitas pegawai dari satu sumber data (store).
  const allLeaves = selectLeavesEnriched(state)
  const pendingLeaves = selectPendingLeaves(state)
  const approvedLeaves = selectApprovedLeaves(state)
  const rejectedLeaves = selectRejectedLeaves(state)

  const updatedTabs = [
    { ...statusTabs[0], count: allLeaves.length },
    { ...statusTabs[1], count: pendingLeaves },
    { ...statusTabs[2], count: approvedLeaves },
    { ...statusTabs[3], count: rejectedLeaves },
  ]

  const filtered = allLeaves.filter((l) => {
    if (activeStatusTab !== 'semua') {
      const statusMap = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' }
      if (l.status !== statusMap[activeStatusTab]) return false
    }
    if (searchTerm && !l.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !String(l.staffId).includes(searchTerm)) return false
    return true
  })

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedData = filtered.slice(startIndex, endIndex)

  // Baris tabel memakai hasil join pegawai dari selector store.
  const tableData = paginatedData.map((leave) => ({
    id: leave.id,
    initials: initialsOf(leave.name),
    name: leave.name,
    niy: leave.niy,
    role: leave.role,
    jenis: leave.jenis,
    periode: leave.periode,
    durasi: leave.durasi,
    lampiran: leave.lampiran,
    status: leave.status,
    avatarClass: avatarClassMap[leave.jenis] || 'bg-surface-container text-on-surface',
    jenisClass: jenisClassMap[leave.jenis] || 'bg-surface-container text-on-surface',
    statusClass: statusClassMap[leave.status] || 'bg-surface-container text-on-surface',
    statusDot: statusDotMap[leave.status] || 'bg-outline',
  }))

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="hover:text-secondary cursor-pointer transition-colors">Presensi</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Pengajuan Izin/Cuti</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">Pengajuan Izin/Cuti</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Kelola, tinjau berkas lampiran, dan proses verifikasi persetujuan dispensasi izin sakit dan cuti pegawai unit sekolah.
            </p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button className="h-10 px-space-md rounded-lg bg-surface-container-lowest text-primary-container font-body-md-medium text-body-md-medium shadow-sm hover:bg-surface-container-low transition-colors flex items-center gap-space-xs cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Export Laporan (.XLSX)</span>
            </button>
            <button className="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-md-medium text-body-md-medium shadow-sm hover:bg-primary transition-colors flex items-center gap-space-xs cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Ajukan Izin Staf (Manual TU)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Menunggu Persetujuan</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{pendingLeaves}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pengajuan</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-body-sm text-body-sm text-amber-700">Perlu tindakan verifikasi hari ini</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Disetujui Bulan Ini</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{approvedLeaves}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pegawai</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Unit Terdaftar:</span>
              <span className="font-body-sm-medium text-body-sm-medium text-emerald-700">SD Islam RJ (Tercatat 100%)</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Ditolak / Dibatalkan</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-lg text-headline-lg text-primary tracking-tight">{rejectedLeaves}</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">Pengajuan</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">cancel</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs mt-space-md">
              <span className="font-body-sm text-body-sm text-red-700">Dokumen tidak lengkap / masa kedaluwarsa</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-md">
          <div className="flex items-center justify-between flex-wrap gap-space-sm">
            <div className="flex items-center gap-space-2xs bg-surface-container-low p-1 rounded-lg">
              {updatedTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveStatusTab(tab.id); setCurrentPage(1) }}
                  className={`px-space-md py-1.5 rounded-lg flex items-center gap-space-xs font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer ${
                    activeStatusTab === tab.id ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${tab.color}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Filter Aktif: Unit SD Islam RJ</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
            <div className="md:col-span-5 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input
                className="w-full h-10 pl-9 pr-space-md bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                placeholder="Cari nama pegawai, NIY, atau keterangan..."
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="md:col-span-2">
              <div className="relative">
                <select
                  className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option>Semua Status</option>
                  <option>Menunggu Persetujuan</option>
                  <option>Disetujui</option>
                  <option>Ditolak</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  className="w-full h-10 pl-space-sm pr-8 bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20"
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                >
                  {jenisOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="relative">
                <button
                  className="w-full h-10 px-space-sm bg-surface-container-low rounded-lg font-body-sm-medium text-body-sm-medium text-on-surface flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer"
                  type="button"
                >
                  <div className="flex items-center gap-space-2xs truncate">
                    <span className="material-symbols-outlined text-[16px] text-outline">calendar_month</span>
                    <span className="truncate">{filterBulan}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Pegawai</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Jenis</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Periode</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Durasi</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Lampiran</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="py-3 px-space-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-body-sm-medium text-body-sm-medium flex-shrink-0 ${row.avatarClass}`}>
                          {row.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{row.name}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">NIY: {row.niy} • {row.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-body-sm-medium text-body-sm-medium ${row.jenisClass}`}>
                        {row.jenis}
                      </span>
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap font-body-sm text-body-sm text-on-surface">
                      {row.periode}
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap">
                      <span className="font-body-sm-medium text-body-sm-medium text-primary">{row.durasi}</span>
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap">
                      <button className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-low text-secondary hover:bg-surface-container transition-colors font-body-sm-medium text-body-sm-medium cursor-pointer">
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        <span className="truncate max-w-[130px]">{row.lampiran}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body-sm-medium text-body-sm-medium ${row.statusClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot}`}></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-space-md whitespace-nowrap text-right">
                      {row.status === 'Menunggu' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="h-8 px-2.5 rounded-lg bg-emerald-600 text-on-primary hover:bg-emerald-700 transition-colors font-body-sm-medium text-body-sm-medium flex items-center gap-1 shadow-sm cursor-pointer" type="button">
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Setujui</span>
                          </button>
                          <button className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-body-sm-medium text-body-sm-medium flex items-center gap-1 cursor-pointer" type="button">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            <span>Tolak</span>
                          </button>
                          <button className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer" type="button">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      ) : (
                        <button className="h-7 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary font-body-sm text-body-sm transition-colors flex items-center gap-1 cursor-pointer" type="button">
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Detail</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{startIndex + 1}</span>–{startIndex + paginatedData.length > filtered.length ? filtered.length : startIndex + paginatedData.length} dari <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{filtered.length}</span> pengajuan izin &amp; cuti
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                className="h-8 px-space-sm rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors flex items-center gap-1 font-body-sm text-body-sm cursor-not-allowed"
                disabled={currentPage === 1}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Sebelumnya</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg font-body-sm-medium text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === pageNum ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                  type="button"
                >
                  {pageNum}
                </button>
              ))}
              <button
                className="h-8 px-space-sm rounded-lg bg-surface-container-low text-on-surface hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm cursor-pointer"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                type="button"
              >
                <span>Berikutnya</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-space-xs mb-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
                <h3 className="font-body-md-medium text-body-md-medium text-primary">Aturan &amp; Ketentuan Cuti Pegawai Yayasan</h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Pedoman verifikasi otomatis berdasarkan SK Direktur Yayasan Pendidikan No. 42/SK-DIR/2025.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                  <span className="font-body-sm-medium text-body-sm-medium text-primary">1. Izin Sakit &gt; 2 Hari</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Wajib melampirkan surat keterangan dokter atau klinik dengan cap stempel basah / QR barcode verifikasi digital faskes.
                  </p>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1">
                  <span className="font-body-sm-medium text-body-sm-medium text-primary">2. Cuti Melahirkan &amp; Bersalin</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Maksimal 90 hari kalender, diajukan paling lambat 14 hari sebelum hari perkiraan lahir (HPL) dari dokter spesialis.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span>Batas Waktu Validasi Unit: <strong className="text-on-surface">2 x 24 Jam Kerja</strong></span>
              <a className="text-secondary hover:underline font-body-sm-medium text-body-sm-medium flex items-center gap-1 cursor-pointer">
                <span>Unduh Pedoman Lengkap (PDF)</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <h3 className="font-body-md-medium text-body-md-medium text-primary">Statistik Kuota SD Islam RJ</h3>
                <span className="font-label-sm text-label-sm text-secondary bg-blue-50 px-2 py-0.5 rounded-full">T.A 2026/2027</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                Monitor utilisasi jatah tahunan 38 guru dan pegawai tetap.
              </p>
              <div className="flex flex-col gap-space-sm">
                <div>
                  <div className="flex justify-between font-body-sm text-body-sm mb-1">
                    <span className="text-on-surface-variant">Cuti Tahunan Digunakan</span>
                    <span className="font-body-sm-medium text-body-sm-medium text-primary">64% (292 / 456 Hari)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-body-sm text-body-sm mb-1">
                    <span className="text-on-surface-variant">Tingkat Ketidakhadiran Izin/Sakit</span>
                    <span className="font-body-sm-medium text-body-sm-medium text-emerald-700">1.8% (Sangat Sehat)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-space-md p-space-xs rounded-lg bg-surface-container-low flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-outline text-[18px]">verified_user</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Sinkronisasi Data SimPres Pusat: <strong className="text-on-surface">Realtime</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PengajuanIzinCutiPage
