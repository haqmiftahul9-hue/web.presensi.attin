import { useState } from 'react'

function EditUnitModal({ unit, onClose, onSave }) {
  const [name, setName] = useState(unit?.name || '')
  const [address, setAddress] = useState(unit?.address || '')
  const [radius, setRadius] = useState(unit?.radius || 50)
  const [jamMasuk, setJamMasuk] = useState(unit?.jamMasuk || '07:00')
  const [jamPulang, setJamPulang] = useState(unit?.jamPulang || '15:00')

  const radiusSize = Math.min(Math.max(radius * 1.8, 90), 180)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
              Edit Unit: {unit?.name || 'SD Islam RJ'}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5" id="modalSubtitle">
              Perbarui data informasi unit dan konfigurasi geolokasi presensi.
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
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputUnitName">
              Nama Unit Sekolah <span className="text-rose-500">*</span>
            </label>
            <input
              className="h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all"
              id="inputUnitName"
              placeholder="Contoh: SD Islam Raudhatul Jannah"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputUnitAddress">
              Alamat Lengkap Unit <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all resize-none leading-relaxed"
              id="inputUnitAddress"
              placeholder="Tuliskan jalan, nomor, kompleks, kecamatan..."
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface flex items-center gap-1.5">
                Geofence Presensi & Titik Koordinat
                <span className="material-symbols-outlined text-[15px] text-outline cursor-help" title="Area radius valid untuk staf mencatatkan kehadiran">help_outline</span>
              </label>
              <span className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline/30">-6.28945, 106.79234</span>
            </div>

            <div className="relative h-48 w-full rounded-xl bg-surface-container-low border border-outline/30 overflow-hidden group flex items-center justify-center select-none">
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#F1F5F9" height="100%" width="100%"></rect>
                <rect fill="#E2E8F0" height="70" opacity="0.5" rx="8" width="130" x="20" y="30"></rect>
                <rect fill="#E2E8F0" height="90" opacity="0.4" rx="8" width="160" x="430" y="80"></rect>
                <rect fill="#DCFCE7" height="60" opacity="0.6" rx="6" width="90" x="500" y="10"></rect>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="#FFFFFF" strokeWidth="12"></path>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="#CBD5E1" strokeWidth="6"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="#FFFFFF" strokeWidth="20"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="#94A3B8" strokeDasharray="8 6" strokeWidth="2"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="#FFFFFF" strokeWidth="14"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="#CBD5E1" strokeWidth="7"></path>
              </svg>

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-surface-container-lowest/95 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm border border-outline/30 text-body-sm font-body-md-medium text-on-surface z-10">
                <span className="material-symbols-outlined text-secondary text-[16px]">location_on</span>
                <span>Gedung SD Islam RJ</span>
              </div>

              <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                <button
                  className="w-7 h-7 bg-surface-container-lowest rounded-md shadow-sm border border-outline/30 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Zoom in"
                  type="button"
                  onClick={() => setRadius((r) => Math.min(r + 10, 500))}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
                <button
                  className="w-7 h-7 bg-surface-container-lowest rounded-md shadow-sm border border-outline/30 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Zoom out"
                  type="button"
                  onClick={() => setRadius((r) => Math.max(r - 10, 10))}
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center z-10">
                <div
                  className="rounded-full bg-secondary/15 border-2 border-dashed border-secondary flex items-center justify-center transition-all duration-200"
                  style={{ width: `${radiusSize}px`, height: `${radiusSize}px` }}
                  id="geofenceBubble"
                >
                  <div className="w-1/2 h-1/2 rounded-full bg-secondary/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-secondary text-on-primary shadow-lg flex items-center justify-center -translate-y-1">
                      <span className="material-symbols-outlined text-[20px]">school</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3.5 bg-primary-container text-on-primary px-3 py-0.5 rounded-full text-body-sm font-body-sm font-medium shadow-md whitespace-nowrap">
                  <span id="mapRadiusLabel">Radius Aktif: {radius}m</span>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 z-10">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-white text-primary text-body-sm font-body-md-medium shadow-sm border border-outline/30 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">my_location</span>
                  <span>Pilih di Peta</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputRadius">Radius Presensi (Meter)</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">radar</span>
                <input
                  className="w-full h-10 pl-9 pr-16 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface font-semibold transition-all"
                  id="inputRadius"
                  max="500"
                  min="10"
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value) || 50)}
                />
                <span className="absolute right-3 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-body-sm font-body-sm border border-outline/30">Meter</span>
              </div>
              <span className="text-body-sm text-on-surface-variant">Rekomendasi area sekolah: 50 – 100 meter.</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputJamMasuk">Jam Masuk</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-outline text-[16px]">schedule</span>
                  <input
                    className="w-full h-10 pl-8 pr-9 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface font-medium text-center transition-all"
                    id="inputJamMasuk"
                    type="text"
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(e.target.value)}
                  />
                  <span className="absolute right-2 text-label-sm font-label-sm text-on-surface-variant">WIB</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputJamPulang">Jam Pulang</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-outline text-[16px]">schedule</span>
                  <input
                    className="w-full h-10 pl-8 pr-9 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface font-medium text-center transition-all"
                    id="inputJamPulang"
                    type="text"
                    value={jamPulang}
                    onChange={(e) => setJamPulang(e.target.value)}
                  />
                  <span className="absolute right-2 text-label-sm font-label-sm text-on-surface-variant">WIB</span>
                </div>
              </div>
            </div>
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
            onClick={() => onSave({ name, address, radius, jamMasuk, jamPulang })}
            className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            id="btnSaveUnit"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditUnitModal
