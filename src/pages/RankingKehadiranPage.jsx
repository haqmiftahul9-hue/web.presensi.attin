import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { initialsOf } from '../store/simPresStore.jsx'
import { selectRankingData } from '../store/simPresStore.jsx'

function RankingKehadiranPage() {
  const { state } = useSimPres()
  const [activeTab, setActiveTab] = useState('Bulanan')
  const ranking = selectRankingData(state)

  const tabs = ['Harian', 'Mingguan', 'Bulanan']

  const toleransiData = ranking.toleransi
  const pembinaanData = ranking.pembinaan

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[26px]">leaderboard</span>
              <h1 className="font-headline-lg font-headline-lg text-primary tracking-tight">Ranking Kehadiran</h1>
            </div>
            <p className="font-body-md font-body-md text-on-surface-variant">Evaluasi kinerja kehadiran pegawai berdasarkan ketepatan waktu dan frekuensi keterlambatan per periode.</p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-surface-container-low px-space-md py-1.5 rounded-full shadow-sm">
            <div className="flex items-center gap-1.5 font-label-md font-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-outline">home</span>
              <span>Home</span>
              <span className="text-outline">/</span>
              <span>Presensi</span>
              <span className="text-outline">/</span>
              <span className="text-secondary font-body-md-medium">Ranking Kehadiran</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-md font-label-md font-label-md transition-colors cursor-pointer ${
                    activeTab === tab ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">domain</span>
              <span className="font-body-md font-body-md-medium text-on-surface">Semua Unit ({state.units.length} Unit)</span>
              <span className="material-symbols-outlined text-[18px] text-outline ml-2">expand_more</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container rounded-lg font-body-md font-body-md-medium text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-outline">calendar_today</span>
              <span>September 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md font-label-md hover:bg-surface-container-low shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px] text-secondary">table_chart</span>
              <span>Export Peringkat (.XLSX)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-space-xs pb-4 border-b border-surface-container">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">award</span>
              </div>
              <div>
                <h2 className="font-headline-sm font-headline-sm text-primary">Top 10 Paling Tepat Waktu</h2>
                <span className="font-body-sm font-body-sm text-on-surface-variant">Periode September 2026</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {ranking.topOnTime.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0">
                    {item.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-secondary">workspace_premium</span>
                      </div>
                    ) : item.rank <= 3 ? (
                      <span className="font-headline-sm font-headline-sm text-on-surface-variant font-bold">{item.rank}</span>
                    ) : (
                      <span className="font-label-md font-label-md text-on-surface-variant font-medium">{item.rank}</span>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-full ${item.badgeColor} ${item.badgeText} font-headline-sm font-headline-sm flex items-center justify-center font-bold flex-shrink-0`}>
                    {item.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md font-body-md-medium text-on-surface block truncate">{item.name}</span>
                    <span className="font-label-sm font-label-sm text-on-surface-variant">{item.unit} • {item.role}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-body-sm font-body-sm text-emerald-600 block">{item.late}</span>
                    <span className="font-body-sm font-body-sm text-on-surface-variant block">{item.stat}</span>
                    {item.statSub && <span className="font-label-sm font-label-sm text-on-surface-variant">{item.statSub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-space-xs pb-4 border-b border-surface-container">
              <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h2 className="font-headline-sm font-headline-sm text-primary">Top 10 Paling Sering Terlambat</h2>
                <span className="font-body-sm font-body-sm text-on-surface-variant">Periode September 2026</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {ranking.topLate.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0">
                    {item.rank === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-error">warning</span>
                      </div>
                    ) : item.rank <= 3 ? (
                      <span className="font-headline-sm font-headline-sm text-on-surface-variant font-bold">{item.rank}</span>
                    ) : (
                      <span className="font-label-md font-label-md text-on-surface-variant font-medium">{item.rank}</span>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-full ${item.badgeBg} ${item.badgeText} font-headline-sm font-headline-sm flex items-center justify-center font-bold flex-shrink-0`}>
                    {item.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md font-body-md-medium text-on-surface block truncate">{item.name}</span>
                    <span className="font-label-sm font-label-sm text-on-surface-variant">{item.unit} • {item.role}</span>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <span className="font-body-sm font-body-sm text-error">{item.count}</span>
                    <span className="font-body-sm font-body-sm text-on-surface-variant">{item.avg}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm font-label-sm ${item.badgeBg} ${item.badgeText}`}>{item.badge}</span>
                      <button className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-body-sm font-body-sm hover:bg-secondary transition-colors cursor-pointer" type="button">
                        {item.rank === 1 ? 'Teguran' : 'Detail'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm font-headline-sm text-primary">Insentif Disiplin</h2>
              <span className="material-symbols-outlined text-[22px] text-secondary">payments</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg font-display-lg text-secondary font-bold">{ranking.insentif.length}</span>
                <span className="font-body-sm font-body-sm text-on-surface-variant">Pegawai Memenuhi Syarat</span>
              </div>
              <div className="flex flex-col gap-2">
                {ranking.insentif.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-surface-container rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary font-label-md font-label-md font-bold flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-body-sm font-body-sm text-on-surface block truncate">{item.name}</span>
                      <span className="font-label-sm font-label-sm text-on-surface-variant">{item.unit}</span>
                    </div>
                    <span className="font-body-sm font-body-sm text-emerald-600 flex-shrink-0">{item.desc}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md font-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                Detail Pegawai
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm font-headline-sm text-primary">Toleransi Keterlambatan</h2>
              <span className="material-symbols-outlined text-[22px] text-error">schedule</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg font-display-lg text-error font-bold">7.2 Mnt</span>
                <span className="font-body-sm font-body-sm text-on-surface-variant">Rata-rata Absensi Terlambat</span>
              </div>
              <div className="flex flex-col gap-3">
                {toleransiData.map((item) => (
                  <div key={item.unit} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm font-body-sm text-on-surface">{item.unit}</span>
                      <span className={`font-body-sm font-body-sm ${parseFloat(item.avg) > 8 ? 'text-error' : 'text-emerald-600'}`}>{item.avg}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div className={`h-full rounded-full ${parseFloat(item.avg) > 8 ? 'bg-error' : 'bg-emerald-600'}`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md font-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                Lihat Detail Unit
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <h2 className="font-headline-sm font-headline-sm text-primary">Tindakan Pembinaan</h2>
              <span className="material-symbols-outlined text-[22px] text-secondary">coaching</span>
            </div>
            <div className="flex flex-col gap-space-md pt-4">
              <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="font-display-lg font-display-lg text-secondary font-bold">{ranking.pembinaan.length}</span>
                <span className="font-body-sm font-body-sm text-on-surface-variant">Pegawai Masih dalam Pembinaan</span>
              </div>
              <div className="flex flex-col gap-2">
                {pembinaanData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-surface-container rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary font-label-md font-label-md font-bold flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-body-sm font-body-sm text-on-surface block truncate">{item.name}</span>
                      <span className="font-label-sm font-label-sm text-on-surface-variant">{item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-primary-container rounded-lg px-2.5 py-1">
                      <span className="material-symbols-outlined text-[14px] text-on-primary-container">{item.icon}</span>
                      <span className="font-body-sm font-body-sm text-on-primary-container">{item.action}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-space-xs">
                <button className="flex-1 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-body-md font-body-md-medium hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" type="button">
                  Apa Selanjutnya?
                </button>
                <button className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-body-md font-body-md-medium hover:bg-secondary transition-colors cursor-pointer" type="button">
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
