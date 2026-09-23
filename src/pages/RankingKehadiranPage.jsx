import { useState } from 'react'
import { useSimPres, selectRankingData } from '../store/simPresStore.jsx'

function RankingKehadiranPage() {
  const { state } = useSimPres()
  const [activeTab, setActiveTab] = useState('Bulanan')
  const ranking = selectRankingData(state)

  const tabs = ['Harian', 'Mingguan', 'Bulanan']

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Ranking Kehadiran</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Pemantauan reputasi dan analisis kepatuhan ketepatan waktu pegawai antar-unit sekolah secara berkala.
            </p>
          </div>
          <nav className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container-lowest shadow-sm w-fit">
            <span className="material-symbols-outlined text-outline text-[16px]">home</span>
            <span className="font-body-sm text-body-sm text-outline">Home</span>
            <span className="material-symbols-outlined text-outline text-[14px]">chevron_right</span>
            <span className="font-body-sm text-body-sm text-outline">Presensi</span>
            <span className="material-symbols-outlined text-outline text-[14px]">chevron_right</span>
            <span className="font-body-sm-medium text-body-sm-medium text-secondary">Ranking Kehadiran</span>
          </nav>
        </div>

        {/* CONTROL TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Segmented Toggle Periode */}
            <div className="flex items-center p-1 rounded-lg bg-surface-container-low">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-space-md py-1.5 rounded-md font-body-sm text-body-sm transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Unit Selector Dropdown */}
            <div className="relative">
              <button
                className="h-10 px-space-md flex items-center gap-space-xs rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-secondary text-[18px]">apartment</span>
                <span className="font-body-sm-medium text-body-sm-medium">Semua Unit ({state.units.length} Unit)</span>
                <span className="material-symbols-outlined text-outline text-[18px]">expand_more</span>
              </button>
            </div>
            {/* Month Range Badge */}
            <div className="flex items-center gap-space-xs h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">September 2026</span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary ml-1"></span>
            </div>
          </div>
          {/* Action Button */}
          <div className="flex items-center gap-space-sm">
            <button
              className="h-10 px-space-md flex items-center justify-center gap-space-xs rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">file_download</span>
              <span className="font-body-sm-medium text-body-sm-medium">Export Peringkat (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* MAIN LEADERBOARD SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
          {/* LEFT COLUMN: TOP 10 ON-TIME */}
          <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col gap-space-xs bg-surface-container-lowest">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">military_tech</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Top 10 Paling Tepat Waktu</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant">
                  100% On-Time
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Pegawai dengan tingkat kedisiplinan dan kepatuhan jam masuk tertinggi
              </p>
            </div>
            <div className="flex flex-col">
              {ranking.topOnTime.map((item) => (
                <div
                  key={item.rank}
                  className="p-space-md flex items-center justify-between gap-space-sm bg-surface-container-low/40 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      {item.rank === 1 ? (
                        <span className="material-symbols-outlined text-secondary text-[18px]">workspace_premium</span>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{item.rank}</span>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{item.name}</span>
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed">
                          {item.unit}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.role}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 text-right">
                    <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{item.late}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {item.stat}{item.statSub ? ` (${item.statSub})` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: TOP 10 FREQUENTLY LATE */}
          <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col gap-space-xs bg-surface-container-lowest">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Top 10 Paling Sering Terlambat</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container">
                  Perlu Evaluasi
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Daftar pegawai dengan akumulasi keterlambatan tertinggi periode ini
              </p>
            </div>
            <div className="flex flex-col">
              {ranking.topLate.map((item) => (
                <div
                  key={item.rank}
                  className="p-space-md flex items-center justify-between gap-space-sm bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center flex-shrink-0">
                      {item.rank}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium flex items-center justify-center flex-shrink-0">
                      {item.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">{item.name}</span>
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed">
                          {item.unit}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm flex-shrink-0">
                    <div className="flex flex-col items-end text-right">
                      <span className={`font-body-sm-medium text-body-sm-medium ${item.rank === 1 ? 'text-error' : 'text-on-surface'}`}>
                        {item.count}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{item.avg}</span>
                    </div>
                    <button
                      className={`h-8 px-2.5 rounded-lg font-body-sm-medium text-body-sm-medium cursor-pointer transition-colors ${
                        item.rank === 1
                          ? 'bg-surface-container-highest text-error hover:bg-error-container'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                      type="button"
                    >
                      {item.rank === 1 ? 'Teguran' : 'Detail'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM RECOMMENDATION & POLICY WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {/* Card 1: Insentif Disiplin */}
          <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-1">
                <span className="material-symbols-outlined text-[20px]">featured_seasonal_and_gifts</span>
              </div>
              <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Insentif Disiplin</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Apresiasi kehadiran sempurna periode September 2026 dialokasikan untuk 3 besar pegawai terdisiplin pada unit masing-masing.
              </p>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase">Skema Penghargaan Aktif</span>
              <span className="material-symbols-outlined text-secondary text-[16px]">arrow_forward</span>
            </div>
          </div>

          {/* Card 2: Toleransi Keterlambatan */}
          <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface mb-1">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Toleransi Keterlambatan</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Batas dispensasi keterlambatan maksimal 15 menit dari jam kerja resmi (07.00 WIB) sesuai SK Direktur Pendidikan No. 412/2026.
              </p>
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase">Maks. 3x Per Bulan</span>
              <span className="material-symbols-outlined text-outline text-[16px]">info</span>
            </div>
          </div>

          {/* Card 3: Tindakan Pembinaan */}
          <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center text-error mb-1">
                <span className="material-symbols-outlined text-[20px]">notification_important</span>
              </div>
              <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Tindakan Pembinaan</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Kirim surat pembinaan terpadu otomatis kepada 3 pegawai dengan frekuensi keterlambatan lebih dari atau sama dengan 5 kali.
              </p>
            </div>
            <div className="mt-space-md pt-space-sm">
              <button
                className="w-full h-9 flex items-center justify-center gap-space-xs rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-body-sm-medium text-body-sm-medium cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">outgoing_mail</span>
                <span>Kirim Notifikasi Pembinaan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingKehadiranPage
