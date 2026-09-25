import { useState } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'

function AddEmployeeModal({ onClose, onSave }) {
  const { state } = useSimPres()
  const [niy, setNiy] = useState('')
  const [name, setName] = useState('')
  const [unitId, setUnitId] = useState(state.units.length > 0 ? state.units[0].id : '')
  const [jabatan, setJabatan] = useState('')
  const [status, setStatus] = useState('Aktif')

  const jabatanOptions = [
    { value: 'Guru PAI', label: 'Guru PAI' },
    { value: 'Guru Kelas 6 & Kurikulum', label: 'Guru Kelas 6 & Kurikulum' },
    { value: 'Guru Kelas 3 • Tahfidz', label: 'Guru Kelas 3 • Tahfidz' },
    { value: 'Guru Kelas 1 • Tematik', label: 'Guru Kelas 1 • Tematik' },
    { value: 'Guru Sentra', label: 'Guru Sentra' },
    { value: 'Guru Biologi & Laboran', label: 'Guru Biologi & Laboran' },
    { value: 'Staf Administrasi', label: 'Staf Administrasi' },
  ]

  const handleSave = () => {
    // Basic validation
    if (!niy || !name || !unitId || !jabatan) {
      alert('Mohon lengkapi semua field')
      return
    }

const newStaff = {
       id: state.staff.length > 0 ? Math.max(...state.staff.map(s => s.id)) + 1 : 1,
       niy,
       name,
       role: jabatan, // Jabatan is stored in role field
       unitId,
       status,
       masuk: null,
       method: null,
       late: 0,
       alpha: false,
       outsideRadius: false,
     }

    onSave(newStaff)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
              Tambah Pegawai Baru
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5" id="modalSubtitle">
              Isi data pegawai baru yang akan ditambahkan ke sistem.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg overflow-y-auto space-y-space-md">
          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputNiy">
              NIY/NIP <span className="text-rose-500">*</span>
            </label>
            <input
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputNiy"
              placeholder="Contoh: 049005069"
              type="text"
              value={niy}
              onChange={(e) => setNiy(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputName">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputName"
              placeholder="Contoh: Erianto, S.Ag, M.Pd.I"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputUnit">
              Unit Sekolah <span className="text-rose-500">*</span>
            </label>
            <select
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputUnit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">Pilih Unit Sekolah</option>
              {state.units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputJabatan">
              Jabatan <span className="text-rose-500">*</span>
            </label>
            <select
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputJabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
            >
              <option value="">Pilih Jabatan</option>
              {jabatanOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputStatus">
              Status <span className="text-rose-500">*</span>
            </label>
            <select
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
          <button
            onClick={onClose}
            className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            id="btnSaveEmployee"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>Simpan Pegawai</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddEmployeeModal