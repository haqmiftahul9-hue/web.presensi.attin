import { useState } from 'react'
import { daftarJamKerja } from '../data/jamKerja.js'

function EditUnitModal({ unit, onClose, onSave }) {
  const [name, setName] = useState(unit?.nama || '')
  const [address, setAddress] = useState(unit?.alamat || '')
  const [radius, setRadius] = useState(unit?.radius || 50)
  const [latitude, setLatitude] = useState(unit?.latitude || -6.28945)
  const [longitude, setLongitude] = useState(unit?.longitude || 106.79234)
  const [geofenceActive, setGeofenceActive] = useState(unit?.geofenceActive ?? true)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const radiusSize = Math.min(Math.max(radius * 1.8, 90), 180)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Nama unit wajib diisi'
        if (value.trim().length < 3) return 'Nama unit minimal 3 karakter'
        return ''
      case 'address':
        if (!value.trim()) return 'Alamat wajib diisi'
        if (value.trim().length < 10) return 'Alamat minimal 10 karakter'
        return ''
      case 'radius':
        const r = parseInt(value)
        if (isNaN(r)) return 'Radius wajib diisi'
        if (r < 10 || r > 500) return 'Radius harus antara 10 - 500 meter'
        return ''
      case 'latitude':
        const lat = parseFloat(value)
        if (isNaN(lat)) return 'Latitude wajib diisi'
        if (lat < -90 || lat > 90) return 'Latitude harus antara -90 hingga 90'
        return ''
      case 'longitude':
        const lng = parseFloat(value)
        if (isNaN(lng)) return 'Longitude wajib diisi'
        if (lng < -180 || lng > 180) return 'Longitude harus antara -180 hingga 180'
        return ''
      default:
        return ''
    }
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const error = validateField(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handleChange = (field, value) => {
    const error = validateField(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
    switch (field) {
      case 'name':
        setName(value)
        break
      case 'address':
        setAddress(value)
        break
      case 'radius':
        setRadius(value === '' ? '' : parseInt(value) || 50)
        break
      case 'latitude':
        setLatitude(value === '' ? '' : parseFloat(value))
        break
      case 'longitude':
        setLongitude(value === '' ? '' : parseFloat(value))
        break
    }
  }

  const validateAll = () => {
    const newErrors = {
      name: validateField('name', name),
      address: validateField('address', address),
      radius: validateField('radius', radius),
      latitude: validateField('latitude', latitude),
      longitude: validateField('longitude', longitude),
    }
    setErrors(newErrors)
    setTouched({ name: true, address: true, radius: true, latitude: true, longitude: true })
    return !Object.values(newErrors).some((e) => e)
  }

  const handleSubmit = () => {
    if (validateAll()) {
      onSave({ name, address, radius, latitude, longitude, geofenceActive })
    }
  }

  const getInputClass = (field) => {
    const base = 'w-full h-9 px-3 rounded-lg bg-white border text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`
  }

  const getTextareaClass = (field) => {
    const base = 'w-full px-3 py-2 rounded-lg bg-white border text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all resize-none leading-relaxed'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug" id="modalTitle">
              Edit Unit: {unit?.nama || 'SDIT Attin Sumbar'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5" id="modalSubtitle">
              Perbarui data informasi unit dan konfigurasi geolokasi presensi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="inputUnitName">
              Nama Unit Sekolah <span className="text-rose-500">*</span>
            </label>
            <input
              className={getInputClass('name')}
              id="inputUnitName"
              placeholder="Contoh: SDIT Attin Sumbar"
              type="text"
              value={name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={(e) => handleBlur('name', e.target.value)}
            />
            {errors.name && touched.name && <span className="text-[11px] text-rose-500">{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="inputUnitAddress">
              Alamat Lengkap Unit <span className="text-rose-500">*</span>
            </label>
            <textarea
              className={getTextareaClass('address')}
              id="inputUnitAddress"
              placeholder="Tuliskan jalan, nomor, kompleks, kecamatan..."
              rows={2}
              value={address}
              onChange={(e) => handleChange('address', e.target.value)}
              onBlur={(e) => handleBlur('address', e.target.value)}
            />
            {errors.address && touched.address && <span className="text-[11px] text-rose-500">{errors.address}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputLatitude">Latitude <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[16px]">navigation</span>
                <input
                  className={getInputClass('latitude') + ' pl-8 font-mono'}
                  id="inputLatitude"
                  type="number"
                  step="0.00001"
                  placeholder="-6.28945"
                  value={latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  onBlur={(e) => handleBlur('latitude', e.target.value)}
                />
              </div>
              {errors.latitude && touched.latitude && <span className="text-[11px] text-rose-500">{errors.latitude}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputLongitude">Longitude <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[16px]">navigation</span>
                <input
                  className={getInputClass('longitude') + ' pl-8 font-mono'}
                  id="inputLongitude"
                  type="number"
                  step="0.00001"
                  placeholder="106.79234"
                  value={longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  onBlur={(e) => handleBlur('longitude', e.target.value)}
                />
              </div>
              {errors.longitude && touched.longitude && <span className="text-[11px] text-rose-500">{errors.longitude}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                Geofence Presensi & Titik Koordinat
                <span className="material-symbols-outlined text-[15px] text-slate-400 cursor-help" title="Area radius valid untuk staf mencatatkan kehadiran">help_outline</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={geofenceActive}
                  onChange={(e) => setGeofenceActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700">Geofence Aktif</span>
              </label>
            </div>

            <div className="relative h-48 w-full rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group flex items-center justify-center select-none shadow-xs">
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#F8FAFC" height="100%" width="100%"></rect>
                <rect fill="#F1F5F9" height="70" opacity="0.6" rx="8" width="130" x="20" y="30"></rect>
                <rect fill="#F1F5F9" height="90" opacity="0.5" rx="8" width="160" x="430" y="80"></rect>
                <rect fill="#DCFCE7" height="60" opacity="0.6" rx="6" width="90" x="500" y="10"></rect>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="#FFFFFF" strokeWidth="12"></path>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="#CBD5E1" strokeWidth="6"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="#FFFFFF" strokeWidth="20"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="#94A3B8" strokeDasharray="8 6" strokeWidth="2"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="#FFFFFF" strokeWidth="14"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="#CBD5E1" strokeWidth="7"></path>
              </svg>

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-slate-200 text-xs font-mono text-slate-700 z-10">
                <span className="material-symbols-outlined text-blue-600 text-[15px]">location_on</span>
                <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              </div>

              <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                <button
                  className="w-7 h-7 bg-white rounded-md shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom in"
                  type="button"
                  onClick={() => setRadius((r) => Math.min(r + 10, 500))}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
                <button
                  className="w-7 h-7 bg-white rounded-md shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom out"
                  type="button"
                  onClick={() => setRadius((r) => Math.max(r - 10, 10))}
                >
                  <span className="material-symbols-outlined text-[15px]">remove</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center z-10">
                <div
                  className="rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center transition-all duration-200"
                  style={{ width: `${radiusSize}px`, height: `${radiusSize}px` }}
                  id="geofenceBubble"
                >
                  <div className="w-1/2 h-1/2 rounded-full bg-blue-500/15 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center -translate-y-0.5">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3.5 bg-slate-900 text-white px-3 py-0.5 rounded-full text-[11px] font-semibold shadow-md whitespace-nowrap">
                  <span id="mapRadiusLabel">Radius Aktif: {radius}m</span>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 z-10">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs border border-slate-200 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-600">my_location</span>
                  <span>Pilih di Peta</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputRadius">Radius Presensi (Meter)</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[16px]">radar</span>
                <input
                  className={getInputClass('radius') + ' pl-8 pr-16 font-semibold'}
                  id="inputRadius"
                  max="500"
                  min="10"
                  type="number"
                  value={radius}
                  onChange={(e) => handleChange('radius', e.target.value)}
                  onBlur={(e) => handleBlur('radius', e.target.value)}
                />
                <span className="absolute right-2 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] border border-slate-200">Meter</span>
              </div>
              {errors.radius && touched.radius && <span className="text-[11px] text-rose-500">{errors.radius}</span>}
              <span className="text-[11px] text-slate-400">Rekomendasi area sekolah: 50 – 100 meter.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Jam Kerja Global</label>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 space-y-0.5">
                {daftarJamKerja().map((h) => (
                  <p key={h.hari} className="text-xs text-slate-700 tabular-nums">
                    <span className="font-semibold text-slate-800">{h.hari}</span>: {h.jamMasuk} - {h.jamPulang ?? 'bebas'}
                  </p>
                ))}
                <p className="text-[11px] text-slate-400">Minggu: bukan hari kerja</p>
              </div>
              <span className="text-[11px] text-slate-400">
                Berlaku seragam untuk seluruh unit. Jumat tidak memiliki batas minimal jam pulang.
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="btnSaveUnit"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditUnitModal
