import { useState } from 'react'

const tabs = ['Harian', 'Mingguan', 'Bulanan']

const topOnTime = [
  { rank: 1, initials: 'EA', name: 'Erianto, S.Ag, M.Pd.I', unit: 'SMP Islam RJ', role: 'Guru PAI', late: '0x Terlambat', stat: '100% Kehadiran', statSub: '22 Hari', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 2, initials: 'WY', name: 'Wisna Yunita, S.Pd', unit: 'SD Islam RJ', role: 'Guru Tematik SD', late: '0x Terlambat', stat: 'Rata-rata tiba 06:45 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 3, initials: 'MG', name: 'Melsi Gustia, S.Sos', unit: 'SD Islam RJ', role: 'Staf Tata Usaha', late: '0x Terlambat', stat: 'Rata-rata tiba 06:48 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 4, initials: 'FH', name: 'Fathur Rachman, M.Si', unit: 'SMA Islam RJ', role: 'Guru Fisika', late: '0x Terlambat', stat: 'Rata-rata tiba 06:50 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 5, initials: 'NA', name: 'Nurul Aisyah, S.Pd', unit: 'TK IT RJ', role: 'Guru Sentra Kreativitas', late: '0x Terlambat', stat: 'Rata-rata tiba 06:51 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 6, initials: 'BH', name: 'Bambang Hidayat, S.Kom', unit: 'Pusat Yayasan', role: 'Kepala IT & Jaringan', late: '0x Terlambat', stat: 'Rata-rata tiba 06:52 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 7, initials: 'DI', name: 'Dewi Indriyani, S.Pd', unit: 'SMP Islam RJ', role: 'Guru Bahasa Inggris', late: '0x Terlambat', stat: 'Rata-rata tiba 06:54 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 8, initials: 'AP', name: 'Ahmad Priyono, S.Pd', unit: 'SMA Islam RJ', role: 'Guru Olahraga', late: '0x Terlambat', stat: 'Rata-rata tiba 06:55 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 9, initials: 'KM', name: 'Khairunnisa Mahardika', unit: 'TK IT RJ', role: 'Staf Administrasi', late: '0x Terlambat', stat: 'Rata-rata tiba 06:55 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
  { rank: 10, initials: 'RS', name: 'Ridwan Syaifuddin, S.Pd', unit: 'SMP Islam RJ', role: 'Guru Matematika', late: '0x Terlambat', stat: 'Rata-rata tiba 06:57 WIB', statSub: '', badgeColor: 'bg-secondary-fixed', badgeText: 'text-on-secondary-fixed' },
]

const topLate = [
  { rank: 1, initials: 'AC', name: 'Aulia Chalida, S.Pd', unit: 'SD Islam RJ', role: 'Kaur TU SD', count: '8 kali terlambat', avg: 'Rata-rata 18 mnt', totalMin: '144 mnt', badge: 'Teguran', badgeBg: 'bg-secondary-fixed', badgeText: 'text-secondary' },
  { rank: 2, initials: 'HK', name: 'Hendra Kurniawan, S.Pd.I', unit: 'SD Islam RJ', role: 'Guru Agama', count: '6 kali terlambat', avg: 'Rata-rata 15 menit', totalMin: '', badge: '6x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 3, initials: 'RF', name: 'Risa Fadillah, S.Pd', unit: 'SMA Islam RJ', role: 'Guru BK', count: '5 kali terlambat', avg: 'Rata-rata 14 menit', totalMin: '', badge: '5x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 4, initials: 'TA', name: 'Taufiq Alamsyah, S.Pd', unit: 'SMP Islam RJ', role: 'Guru IPS', count: '4 kali terlambat', avg: 'Rata-rata 12 menit', totalMin: '', badge: '4x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 5, initials: 'WW', name: 'Wahyu Wibowo', unit: 'TK IT RJ', role: 'Staf Keamanan Sekolah', count: '4 kali terlambat', avg: 'Rata-rata 10 menit', totalMin: '', badge: '4x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 6, initials: 'MS', name: 'Miftahul Surya, S.Kom', unit: 'SMA Islam RJ', role: 'Laboran Komputer', count: '3 kali terlambat', avg: 'Rata-rata 16 menit', totalMin: '', badge: '3x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 7, initials: 'GS', name: 'Gita Safitri, S.Si', unit: 'SMA Islam RJ', role: 'Guru Kimia', count: '3 kali terlambat', avg: 'Rata-rata 11 menit', totalMin: '', badge: '3x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 8, initials: 'FN', name: 'Fajar Nugroho, S.Pd', unit: 'SD Islam RJ', role: 'Guru Penjas SD', count: '3 kali terlambat', avg: 'Rata-rata 9 menit', totalMin: '', badge: '3x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 9, initials: 'IR', name: 'Indra Rahmadhani, A.Md', unit: 'Pusat Yayasan', role: 'Staf Logistik', count: '2 kali terlambat', avg: 'Rata-rata 20 menit', totalMin: '', badge: '2x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
  { rank: 10, initials: 'DP', name: 'Dina Permata, S.Pd', unit: 'SMP Islam RJ', role: 'Guru Seni Budaya', count: '2 kali terlambat', avg: 'Rata-rata 15 menit', totalMin: '', badge: '2x', badgeBg: 'bg-surface-container-high', badgeText: 'text-error' },
]

const insentifData = [
  { initials: 'EA', name: 'Erianto, S.Ag, M.Pd.I', unit: 'SMP Islam RJ', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'WY', name: 'Wisna Yunita, S.Pd', unit: 'SD Islam RJ', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'MG', name: 'Melsi Gustia, S.Sos', unit: 'SD Islam RJ', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'FH', name: 'Fathur Rachman, M.Si', unit: 'SMA Islam RJ', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'NA', name: 'Nurul Aisyah, S.Pd', unit: 'TK IT RJ', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'BH', name: 'Bambang Hidayat, S.Kom', unit: 'Pusat Yayasan', desc: '0x Terlambat • 100% Kehadiran' },
  { initials: 'DI', name: 'Dewi Indriyani, S.Pd', unit: 'SMP Islam RJ', desc: '0x Terlambat • 100% Kehadiran' },
]

const toleransiData = [
  { unit: 'SD Islam RJ', avg: '7.2 Mnt', pct: 72 },
  { unit: 'SMP Islam RJ', avg: '9.8 Mnt', pct: 98 },
  { unit: 'SMA Islam RJ', avg: '8.1 Mnt', pct: 81 },
]

const pembinaanData = [
  { initials: 'AC', name: 'Aulia Chalida, S.Pd', unit: 'SD Islam RJ', action: 'Disiplin 5 Hari', icon: 'assignment' },
  { initials: 'HK', name: 'Hendra Kurniawan, S.Pd.I', unit: 'SD Islam RJ', action: 'Rapat Terbuka', icon: 'groups' },
]

function RankingKehadiranPage() {
  const [activeTab, setActiveTab] = useState('Bulanan')

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        {/* Page Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[26px]">leaderboard</span>
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Ranking Kehadiran</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Evaluasi kinerja kehadiran pegawai berdasarkan ketepatan waktu dan frekuensi keterlambatan per periode.</p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-surface-container-low px-space-md py-1.5 rounded-full shadow-sm">
            <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-outline">home</span>
              <span>Home</span>
              <span className="text-outline">/</span>
              <span>Presensi</span>
              <span className="text-outline">/</span>
              <span className="text-secondary font-body-md-medium">Ranking Kehadiran</span>
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm">
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
            {/* Unit Selector */}
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">domain</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">Semua Unit (5 Unit)</span>
              <span className="material-symbols-outlined text-[18px] text-outline ml-2">expand_more</span>
            </div>
            {/* Month Range */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container rounded-lg font-body-md-medium text-body-md-medium text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-outline">calendar_today</span>
              <span>September 2026</span>
            </div>
          </div>
          {/* Export Button */}
          <div className="flex items-center gap-space-xs">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-low shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px] text-secondary">table_chart</span>
              <span>Export Peringkat (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
          {/* Top 10 Paling Tepat Waktu */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-space-xs pb-4 border-b border-surface-container">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">award</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-primary">Top 10 Paling Tepat Waktu</h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Periode September 2026</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {topOnTime.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl hover:bg-surface-container-low transition-colors">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0">
                    {item.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-secondary">workspace_premium</span>
                      </div>
                    ) : item.rank <= 3 ? (
                      <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">{item.rank}</span>
                    ) : (
                      <span className="font-label-md text-label-md text-on-surface-variant font-medium">{item.rank}</span>
                    )}
                  </div>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${item.badgeColor} ${item.badgeText} font-headline-sm flex items-center justify-center font-bold flex-shrink-0`}>
                    {item.initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface block truncate">{item.name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{item.unit} • {item.role}</span>
                  </div>
                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <span className="font-body-sm text-body-sm text-emerald-600 block">{item.late}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">{item.stat}</span>
                    {item.statSub && <span className="font-label-sm text-label-sm text-on-surface-variant">{item.statSub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 10 Paling Sering Terlambat */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-space-xs pb-4 border-b border-surface-container">
              <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-primary">Top 10 Paling Sering Terlambat</h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Periode September 2026</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {topLate.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl hover:bg-surface-container-low transition-colors">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0">
                    {item.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-error">warning</span>
                      </div>
                    ) : item.rank <= 3 ? (
                      <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">{item.rank}</span>
                    ) : (
                      <span className="font-label-md text-label-md text-on-surface-variant font-medium">{item.rank}</span>
                    )}
                  </div>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${item.badgeBg} ${item.badgeText} font-headline-sm flex items-center justify-center font-bold flex-shrink-0`}>
                    {item.initials}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface block truncate">{item.name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{item.unit} • {item.role}</span>
                  </div>
                  {/* Stats */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <span className="font-body-sm text-body-sm text-error">{item.count}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{item.avg}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm ${item.badgeBg} ${item.badgeText}`}>{item.badge}</span>
                      <button className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-body-sm text-body-sm hover:bg-secondary transition-colors cursor-pointer" type="button">
                        {item.rank === 1 ? 'Teguran' : 'Detail'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Insentif Disiplin */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm text-headline-sm text-primary">Insentif Disiplin</h2>
              <span className="material-symbols-outlined text-[22px] text-secondary">payments</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg text-display-lg text-secondary font-bold">7</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Pegawai Memenuhi Syarat</span>
              </div>
              <div className="flex flex-col gap-2">
                {insentifData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-surface-container rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary font-label-md font-bold flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-body-sm text-body-sm text-on-surface block truncate">{item.name}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{item.unit}</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-emerald-600 flex-shrink-0">{item.desc}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md-medium text-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                Detail Pegawai
              </button>
            </div>
          </div>

          {/* Toleransi Keterlambatan */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm text-headline-sm text-primary">Toleransi Keterlambatan</h2>
              <span className="material-symbols-outlined text-[22px] text-error">schedule</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg text-display-lg text-error font-bold">7.2 Mnt</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata Absensi Terlambat</span>
              </div>
              <div className="flex flex-col gap-3">
                {toleransiData.map((item) => (
                  <div key={item.unit} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-on-surface">{item.unit}</span>
                      <span className={`font-body-sm text-body-sm ${parseFloat(item.avg) > 8 ? 'text-error' : 'text-emerald-600'}`}>{item.avg}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div className={`h-full rounded-full ${parseFloat(item.avg) > 8 ? 'bg-error' : 'bg-emerald-600'}`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md-medium text-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                Lihat Detail Unit
              </button>
            </div>
          </div>

          {/* Tindakan Pembinaan */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm text-headline-sm text-primary">Tindakan Pembinaan</h2>
              <span className="material-symbols-outlined text-[22px] text-secondary">coaching</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg text-display-lg text-secondary font-bold">2</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Pegawai Masih dalam Pembinaan</span>
              </div>
              <div className="flex flex-col gap-2">
                {pembinaanData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-surface-container rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary font-label-md font-bold flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-body-sm text-body-sm text-on-surface block truncate">{item.name}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-primary-container rounded-lg px-2.5 py-1">
                      <span className="material-symbols-outlined text-[14px] text-on-primary-container">{item.icon}</span>
                      <span className="font-body-sm text-body-sm text-on-primary-container">{item.action}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-space-xs">
                <button className="flex-1 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md-medium text-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                  Apa Selanjutnya?
                </button>
                <button className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-body-md-medium text-body-md-medium hover:bg-secondary transition-colors cursor-pointer" type="button">
                  Mulai Pembinaan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingKehadiranPage
