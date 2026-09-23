import { useSimPres } from '../store/simPresStore.jsx'

function StatCards() {
  const { state } = useSimPres()
  // Statistik unit SD di-derive dari satu sumber data (store).
  const sdStaff = state.staff.filter((s) => s.unitId === 'sd')
  const total = sdStaff.length
  const hadir = sdStaff.filter((s) => s.status === 'Aktif' && s.masuk !== null).length
  const belum = total - hadir
  const pendidik = sdStaff.filter((s) => s.role.startsWith('Guru')).length
  const tenaga = total - pendidik
  const tingkat = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="h-1 absolute top-0 left-0 right-0 bg-secondary"></div>
        <div className="flex items-start justify-between mb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-body-md-medium">Total Pegawai</span>
            <h3 className="font-display-lg text-display-lg text-on-surface mt-1">{total}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">groups</span>
          </div>
        </div>
        <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
          <span className="flex items-center gap-1 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
            {pendidik} Pendidik, {tenaga} Tenaga Kependidikan
          </span>
          <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">100% Terdaftar</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="h-1 absolute top-0 left-0 right-0 bg-emerald-600"></div>
        <div className="flex items-start justify-between mb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-body-md-medium">Hadir Hari Ini</span>
            <h3 className="font-display-lg text-display-lg text-emerald-600 mt-1">{hadir}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
          </div>
        </div>
        <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            Tingkat kehadiran {tingkat}%
          </span>
          <span className="font-label-sm text-label-sm text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Kepatuhan Tinggi</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="h-1 absolute top-0 left-0 right-0 bg-amber-500"></div>
        <div className="flex items-start justify-between mb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-body-md-medium">Belum Presensi Pulang</span>
            <h3 className="font-display-lg text-display-lg text-amber-600 mt-1">{belum}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          </div>
        </div>
        <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
          <span className="flex items-center gap-1 text-amber-700">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Menunggu jadwal pulang / piket
          </span>
          <span className="font-label-sm text-label-sm text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Piket Sore</span>
        </div>
      </div>
    </div>
  )
}

export default StatCards