import { useSimPres, selectTotalPegawai, selectJumlahHadir, selectJumlahTerlambat, selectJumlahAlpha, selectRataRataTerlambat } from '../store/simPresStore.jsx'

function StatCards() {
  const { state } = useSimPres()
  // Semua angka dari selector store (satu sumber data).
  const total = selectTotalPegawai(state)
  const hadir = selectJumlahHadir(state)
  const terlambat = selectJumlahTerlambat(state)
  const alpha = selectJumlahAlpha(state)
  const rataRataTerlambat = selectRataRataTerlambat(state)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col gap-space-xs">
          <div className="w-11 h-11 rounded-xl bg-secondary-fixed/50 flex items-center justify-center text-secondary mb-1">
            <span className="material-symbols-outlined text-[22px]">group</span>
          </div>
          <span className="font-headline-lg text-headline-lg text-on-surface leading-tight">{total}</span>
          <span className="font-body-md-medium text-body-md-medium text-on-surface">Total Pegawai</span>
          <span className="font-body-sm text-body-sm text-secondary mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            +4 staf baru bulan ini
          </span>
        </div>
        <div className="w-full h-[3px] bg-secondary absolute bottom-0 left-0"></div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col gap-space-xs">
          <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-surface-tint mb-1">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
          <span className="font-headline-lg text-headline-lg text-on-surface leading-tight">{hadir}</span>
          <span className="font-body-md-medium text-body-md-medium text-on-surface">Hadir Hari Ini</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            {(total > 0 ? ((hadir / total) * 100).toFixed(1) : '0.0')}% tingkat kehadiran
          </span>
        </div>
        <div className="w-full h-[3px] bg-secondary-container absolute bottom-0 left-0"></div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col gap-space-xs">
          <div className="w-11 h-11 rounded-xl bg-surface-variant flex items-center justify-center text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-[22px]">alarm</span>
          </div>
          <span className="font-headline-lg text-headline-lg text-on-surface leading-tight">{terlambat}</span>
          <span className="font-body-md-medium text-body-md-medium text-on-surface">Terlambat Hari Ini</span>
          <span className="font-body-sm text-body-sm text-outline mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">timer</span>
            Rata-rata {rataRataTerlambat} menit
          </span>
        </div>
        <div className="w-full h-[3px] bg-outline absolute bottom-0 left-0"></div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col gap-space-xs">
          <div className="w-11 h-11 rounded-xl bg-error-container flex items-center justify-center text-error mb-1">
            <span className="material-symbols-outlined text-[22px]">person_off</span>
          </div>
          <span className="font-headline-lg text-headline-lg text-error leading-tight">{alpha}</span>
          <span className="font-body-md-medium text-body-md-medium text-on-surface">Alpha Hari Ini</span>
          <span className="font-body-sm text-body-sm text-on-error-container mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">pending</span>
            Menunggu konfirmasi verifikator
          </span>
        </div>
        <div className="w-full h-[3px] bg-error absolute bottom-0 left-0"></div>
      </div>
    </div>
  )
}

export default StatCards
