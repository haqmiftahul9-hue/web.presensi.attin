import { useState } from 'react'
import { daftarJamKerja } from '../data/jamKerja.js'

function EditUnitModal({ unit, onClose, onSave }) {
  const [name, setName] = useState(unit?.nama || '')
  const [address, setAddress] = useState(unit?.alamat || '')
  const [radius, setRadius] = useState(unit?.radius || 50)
  const [latitude, setLatitude] = useState(unit?.latitude != null ? String(unit.latitude) : '-6.28945')
  const [longitude, setLongitude] = useState(unit?.longitude != null ? String(unit.longitude) : '106.79234')
  const [geofenceActive, setGeofenceActive] = useState(unit?.geofenceActive ?? true)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsSuccess, setGpsSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [koordinatPaste, setKoordinatPaste] = useState('')
  const [touched, setTouched] = useState({})

  const radiusSize = Math.min(Math.max((parseInt(radius) || 50) * 1.8, 90), 180)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!String(value || '').trim()) return 'Nama unit wajib diisi'
        if (String(value || '').trim().length < 3) return 'Nama unit minimal 3 karakter'
        return ''
      case 'address':
        if (!String(value || '').trim()) return 'Alamat wajib diisi'
        if (String(value || '').trim().length < 10) return 'Alamat minimal 10 karakter'
        return ''
      case 'radius': {
        const r = parseInt(value)
        if (isNaN(r)) return 'Radius wajib diisi'
        if (r < 10 || r > 500) return 'Radius harus antara 10 - 500 meter'
        return ''
      }
      case 'latitude': {
        const strVal = String(value ?? '').trim()
        if (!strVal) return 'Latitude wajib diisi'
        const lat = parseFloat(strVal)
        if (isNaN(lat)) return 'Latitude wajib berupa angka valid'
        if (lat < -90 || lat > 90) return 'Latitude harus antara -90 hingga 90'
        return ''
      }
      case 'longitude': {
        const strVal = String(value ?? '').trim()
        if (!strVal) return 'Longitude wajib diisi'
        const lng = parseFloat(strVal)
        if (isNaN(lng)) return 'Longitude wajib berupa angka valid'
        if (lng < -180 || lng > 180) return 'Longitude harus antara -180 hingga 180'
        return ''
      }
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
        setLatitude(value)
        break
      case 'longitude':
        setLongitude(value)
        break
    }
  }

  const ambilLokasiSaatIni = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung pembacaan GPS.')
      return
    }
    setGpsLoading(true)
    setGpsSuccess(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latStr = pos.coords.latitude.toFixed(6)
        const lngStr = pos.coords.longitude.toFixed(6)
        setLatitude(latStr)
        setLongitude(lngStr)
        setGpsLoading(false)
        setGpsSuccess(true)
        handleBlur('latitude', latStr)
        handleBlur('longitude', lngStr)
        setTimeout(() => setGpsSuccess(false), 4000)
      },
      (err) => {
        setGpsLoading(false)
        alert(`Gagal membaca GPS: ${err?.message || 'Izin lokasi belum diberikan'}`)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const parseKoordinatPaste = (teks) => {
    const m = String(teks || '').match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/)
    if (!m) return false
    const lat = parseFloat(m[1])
    const lng = parseFloat(m[2])
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
    const latStr = lat.toFixed(6)
    const lngStr = lng.toFixed(6)
    setLatitude(latStr)
    setLongitude(lngStr)
    handleBlur('latitude', latStr)
    handleBlur('longitude', lngStr)
    return true
  }

  const bukaPeta = () => {
    const lat = parseFloat(latitude) || -6.28945
    const lng = parseFloat(longitude) || 106.79234
    window.open(`https://www.google.com/maps/@${lat},${lng},18z`, '_blank', 'noopener')
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
      onSave({
        name: name.trim(),
        address: address.trim(),
        radius: parseInt(radius) || 50,
        latitude: parseFloat(String(latitude).trim()),
        longitude: parseFloat(String(longitude).trim()),
        geofenceActive,
      })
    }
  }

  const getInputClass = (field) => {
    const base = 'w-full h-9 px-3 rounded-lg bg-card border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20' : 'border-input focus:border-ring focus:ring-1 focus:ring-ring/20'}`
  }

  const getTextareaClass = (field) => {
    const base = 'w-full px-3 py-2 rounded-lg bg-card border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-all resize-none leading-relaxed'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20' : 'border-input focus:border-ring focus:ring-1 focus:ring-ring/20'}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-card">
          <div>
            <h2 className="text-base font-bold text-foreground leading-snug" id="modalTitle">
              Edit Unit: {unit?.nama || 'SDIT Attin Sumbar'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5" id="modalSubtitle">
              Perbarui data informasi unit dan konfigurasi geolokasi presensi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="inputUnitName">
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
            <label className="text-xs font-semibold text-foreground" htmlFor="inputUnitAddress">
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

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Titik Koordinat Sekolah (GPS)</span>
            <button
              type="button"
              onClick={ambilLokasiSaatIni}
              disabled={gpsLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[15px] ${gpsLoading ? 'animate-spin' : ''}`}>
                {gpsLoading ? 'sync' : gpsSuccess ? 'check_circle' : 'my_location'}
              </span>
              <span>{gpsLoading ? 'Membaca GPS...' : gpsSuccess ? 'Lokasi GPS Terisi!' : 'Ambil Titik Lokasi Saya (GPS)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="inputLatitude">Latitude <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground text-[16px]">navigation</span>
                <input
                  className={getInputClass('latitude') + ' pl-8 font-mono'}
                  id="inputLatitude"
                  type="text"
                  placeholder="-6.28945"
                  value={latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  onBlur={(e) => handleBlur('latitude', e.target.value)}
                />
              </div>
              {errors.latitude && touched.latitude && <span className="text-[11px] text-rose-500">{errors.latitude}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="inputLongitude">Longitude <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground text-[16px]">navigation</span>
                <input
                  className={getInputClass('longitude') + ' pl-8 font-mono'}
                  id="inputLongitude"
                  type="text"
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
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                Geofence Presensi & Titik Koordinat
                <span className="material-symbols-outlined text-[15px] text-muted-foreground cursor-help" title="Area radius valid untuk staf mencatatkan kehadiran">help_outline</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={geofenceActive}
                  onChange={(e) => setGeofenceActive(e.target.checked)}
                  className="w-4 h-4 text-primary border-input rounded focus:ring-ring cursor-pointer accent-primary"
                />
                <span className="text-xs font-medium text-foreground">Geofence Aktif</span>
              </label>
            </div>

            <div className="relative h-48 w-full rounded-xl bg-muted/30 border border-border overflow-hidden group flex items-center justify-center select-none shadow-xs">
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <rect fill="currentColor" className="text-muted/10" height="100%" width="100%"></rect>
                <rect fill="currentColor" className="text-muted/20" height="70" opacity="0.6" rx="8" width="130" x="20" y="30"></rect>
                <rect fill="currentColor" className="text-muted/20" height="90" opacity="0.5" rx="8" width="160" x="430" y="80"></rect>
                <rect fill="#DCFCE7" height="60" opacity="0.6" rx="6" width="90" x="500" y="10"></rect>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="currentColor" className="text-border" strokeWidth="12"></path>
                <path d="M-20,130 Q180,90 320,120 T660,110" fill="none" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="6"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="currentColor" className="text-border" strokeWidth="20"></path>
                <path d="M260,-20 L300,230" fill="none" stroke="currentColor" className="text-muted-foreground/40" strokeDasharray="8 6" strokeWidth="2"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="currentColor" className="text-border" strokeWidth="14"></path>
                <path d="M70,220 L480,-10" fill="none" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="7"></path>
              </svg>

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-border text-xs font-mono text-foreground z-10">
                <span className="material-symbols-outlined text-primary text-[15px]">location_on</span>
                <span>{Number(latitude || 0).toFixed(5)}, {Number(longitude || 0).toFixed(5)}</span>
              </div>

              <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                <button
                  className="w-7 h-7 bg-card rounded-md shadow-xs border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Zoom in"
                  type="button"
                  onClick={() => setRadius((r) => Math.min(r + 10, 500))}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
                <button
                  className="w-7 h-7 bg-card rounded-md shadow-xs border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Zoom out"
                  type="button"
                  onClick={() => setRadius((r) => Math.max(r - 10, 10))}
                >
                  <span className="material-symbols-outlined text-[15px]">remove</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center z-10">
                <div
                  className="rounded-full bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center transition-all duration-200"
                  style={{ width: `${radiusSize}px`, height: `${radiusSize}px` }}
                  id="geofenceBubble"
                >
                  <div className="w-1/2 h-1/2 rounded-full bg-primary/15 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center -translate-y-0.5">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3.5 bg-foreground text-background px-3 py-0.5 rounded-full text-[11px] font-semibold shadow-md whitespace-nowrap">
                  <span id="mapRadiusLabel">Radius Aktif: {radius}m</span>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-xs border border-border transition-colors cursor-pointer"
                  type="button"
                  onClick={bukaPeta}
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">map</span>
                  <span>Pilih di Peta (Google Maps)</span>
                </button>
                <input
                  type="text"
                  value={koordinatPaste}
                  onChange={(e) => {
                    setKoordinatPaste(e.target.value)
                    if (parseKoordinatPaste(e.target.value)) setKoordinatPaste('')
                  }}
                  placeholder="Tempel koordinat dari peta (lat, lng)"
                  className="px-2 py-1 rounded-md bg-card/95 text-[11px] border border-border w-44"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="inputRadius">Radius Presensi (Meter)</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground text-[16px]">radar</span>
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
                <span className="absolute right-2 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] border border-border">Meter</span>
              </div>
              {errors.radius && touched.radius && <span className="text-[11px] text-destructive">{errors.radius}</span>}
              <span className="text-[11px] text-muted-foreground">Rekomendasi area sekolah: 50 – 100 meter.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Jam Kerja Global</label>
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 space-y-0.5">
                {daftarJamKerja().map((h) => (
                  <p key={h.hari} className="text-xs text-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{h.hari}</span>: {h.jamMasuk} - {h.jamPulang ?? 'bebas'}
                  </p>
                ))}
                <p className="text-[11px] text-muted-foreground">Minggu: bukan hari kerja</p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Berlaku seragam untuk seluruh unit. Jumat tidak memiliki batas minimal jam pulang.
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-input bg-card hover:bg-accent text-foreground text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
