import { useSimPres, selectTotalPegawai, selectJumlahHadir, selectJumlahTerlambat, selectJumlahAlpha, selectRataRataTerlambat } from '../store/simPresStore.jsx'

function StatCards() {
  const { state } = useSimPres()
  // Semua angka dari selector store (satu sumber data).
  const total = selectTotalPegawai(state)
  const hadir = selectJumlahHadir(state)
  const terlambat = selectJumlahTerlambat(state)
  const alpha = selectJumlahAlpha(state)
  const rataRataTerlambat = selectRataRataTerlambat(state)

  const rate = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {/* 1. Total Pegawai */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pegawai</span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-headline-lg">{total}</span>
          <div className="mt-2.5 flex items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
              +4 staf baru bulan ini
            </span>
          </div>
        </div>
      </div>

      {/* 2. Hadir Hari Ini */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hadir Hari Ini</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-headline-lg">{hadir}</span>
          <div className="mt-2.5 flex items-center">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {rate}% tingkat kehadiran
            </span>
          </div>
        </div>
      </div>

      {/* 3. Terlambat Hari Ini */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terlambat</span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-headline-lg">{terlambat}</span>
          <div className="mt-2.5 flex items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <span className="material-symbols-outlined text-[13px]">timer</span>
              Rata-rata {rataRataTerlambat} menit
            </span>
          </div>
        </div>
      </div>

      {/* 4. Alpha Hari Ini */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alpha / Belum</span>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">person_off</span>
          </div>
        </div>
        <div className="mt-3">
          <span className={`text-3xl font-bold tracking-tight font-headline-lg ${alpha > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{alpha}</span>
          <div className="mt-2.5 flex items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
              <span className="material-symbols-outlined text-[13px]">info</span>
              Menunggu konfirmasi
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatCards
