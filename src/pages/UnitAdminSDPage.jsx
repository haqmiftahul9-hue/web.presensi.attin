import { useState } from 'react'
import EditUnitModal from '../components/EditUnitModal.jsx'
import { useSimPres } from '../store/simPresStore.jsx'

function UnitAdminSDPage() {
  const { state, dispatch } = useSimPres()
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)

  const unitData = state.units.map((u) => ({
    id: u.id,
    kode: u.kode,
    nama: u.nama,
    alamat: u.alamat,
    radius: u.radius,
    masuk: u.masuk,
    pulang: u.pulang,
    pegawai: state.staff.filter((s) => s.unitId === u.id).length,
    aktif: true,
  }))

  const filtered = unitData.filter((u) =>
    u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.kode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openEdit = (unit) => {
    setEditingUnit(unit)
    setShowModal(true)
  }

  const handleSave = (data) => {
    if (editingUnit) {
      // Simpan perubahan unit ke satu sumber data (store) agar semua halaman ikut.
      dispatch({
        type: 'UPDATE_UNIT',
        payload: {
          id: editingUnit.id,
          nama: data.name,
          alamat: data.address,
          radius: data.radius,
          masuk: data.jamMasuk,
          pulang: data.jamPulang,
        },
      })
    }
    setShowModal(false)
    setEditingUnit(null)
  }

  return (
    <div className="flex flex-col w-full">
      <div className="px-space-xl py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <span className="hover:text-secondary cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="hover:text-secondary cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface font-body-md-medium text-body-md-medium">Manajemen Unit</span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Server Pusat: Normal</span>
          </div>
        </div>
      </div>

      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[24px]">apartment</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Manajemen Unit</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Kelola entitas unit sekolah di bawah naungan yayasan, parameter radius geofence, dan jam kerja operasional.</p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs self-start md:self-auto">
            <button className="flex items-center gap-space-xs px-space-md py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Ekspor Data</span>
            </button>
            <button className="flex items-center gap-space-xs px-space-md py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-body-md-medium text-body-md-medium rounded-lg shadow-sm transition-colors cursor-pointer" type="button">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Filter Lanjutan</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-secondary"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Unit Terdaftar</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{state.units.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">domain</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                Semua berstatus aktif
              </span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">Aktif</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-emerald-600"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Pegawai</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{state.staff.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                Tersebar di {state.units.length} unit
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-amber-500"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Rata-rata Radius</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 leading-tight">{Math.round(state.units.reduce((sum, u) => sum + u.radius, 0) / state.units.length)}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">radar</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                Toleransi standar
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="h-1 absolute top-0 left-0 right-0 bg-secondary"></div>
            <div className="flex items-start justify-between mb-space-sm">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Kepatuhan Geofence</span>
                <h3 className="font-headline-lg text-headline-lg text-secondary mt-1 leading-tight">98.4%</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                Zona kehadiran valid
              </span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">Valid</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
          <button
            onClick={() => { setEditingUnit(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-body-md-medium text-body-md-medium shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>+ Tambah Unit Baru</span>
          </button>
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              className="w-full h-9 pl-9 pr-3 font-body-sm text-body-sm bg-surface-container-low rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest"
              placeholder="Cari nama unit, kode, atau alamat..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline/50 text-on-surface-variant font-label-md text-label-md uppercase tracking-wider leading-tight">
                  <th className="py-3 px-4">Nama Unit</th>
                  <th className="py-3 px-4">Alamat Lengkap</th>
                  <th className="py-3 px-4">Radius Presensi</th>
                  <th className="py-3 px-4">Jam Operasional</th>
                  <th className="py-3 px-4 text-right">Pegawai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/30 font-body-md text-body-md">
                {filtered.map((unit) => {
                  const kodePrefix = unit.kode.split('-')[1] || unit.kode.substring(0, 2)
                  const iconKey = kodePrefix.toUpperCase()
                  const icon = { TK: 'child_care', SD: 'school', SMP: 'school', SMA: 'school', PST: 'domain' }[iconKey] || 'domain'
                  return (
                    <tr key={unit.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-label-md text-label-md font-semibold flex-shrink-0">
                            {iconKey}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-body-md-medium text-body-md-medium text-on-surface leading-snug">{unit.nama}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">Kode: {unit.kode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-body-sm text-body-sm text-on-surface truncate" title={unit.alamat}>{unit.alamat}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm border border-secondary/20">
                          <span className="material-symbols-outlined text-[14px]">radar</span>
                          {unit.radius} m
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-on-surface font-body-sm text-body-sm font-body-sm">
                          <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                          <span>{unit.masuk} – {unit.pulang} WIB</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-body-md-medium text-body-md-medium text-on-surface">{unit.pegawai}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant ml-1">Orang</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-label-sm text-label-sm font-label-sm">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(unit)}
                            className="px-2.5 py-1.5 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Edit</span>
                          </button>
                          <button
                            className="px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer"
                            type="button"
                            onClick={() => { if (confirm(`Apakah Anda yakin ingin menonaktifkan presensi operasional untuk ${unit.nama}?`)) alert(`Unit ${unit.nama} berhasil dinonaktifkan.`) }}
                          >
                            <span className="material-symbols-outlined text-[15px]">power_settings_new</span>
                            <span>Nonaktifkan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="py-3 px-4 bg-surface-container-lowest border-t border-outline/30 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">1 - {filtered.length}</strong> dari <strong className="font-body-sm-medium text-body-sm-medium text-on-surface">{unitData.length}</strong> unit sekolah
            </span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-outline/50 cursor-not-allowed" disabled type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-secondary text-on-primary font-label-sm text-label-sm shadow-sm">1</button>
              <button className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low font-body-sm text-body-sm transition-colors cursor-pointer" type="button">2</button>
              <span className="px-1 text-outline font-body-sm text-body-sm">...</span>
              <button className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low font-body-sm text-body-sm transition-colors cursor-pointer" type="button">5</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <EditUnitModal
          unit={editingUnit}
          onClose={() => { setShowModal(false); setEditingUnit(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default UnitAdminSDPage
