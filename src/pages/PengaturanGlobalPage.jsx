import { useState, useRef } from 'react'
import { useSimPres, addActivityLog } from '../store/simPresStore.jsx'

const tabs = [
  { id: 'informasi', label: 'Informasi Aplikasi', icon: 'info' },
  { id: 'penandatangan', label: 'Informasi Penandatangan Dokumen', icon: 'badge' },
  { id: 'operasional', label: 'Parameter Operasional', icon: 'settings' },
  { id: 'keamanan', label: 'Kebijakan Keamanan', icon: 'shield_lock' },
  { id: 'default', label: 'Default Sistem', icon: 'tune' },
]

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
const MAX_LOGO_SIZE = 2 * 1024 * 1024

function PengaturanGlobalPage() {
  const { state, dispatch } = useSimPres()
  const settings = state.settings
  const holidayData = state.holidays || []
  const [activeTab, setActiveTab] = useState('informasi')
  const [formData, setFormData] = useState({
    namaAplikasi: settings.namaAplikasi || '',
    tagline: settings.tagline || '',
    logo: settings.logo || null,
    namaYayasan: settings.namaYayasan || '',
    skYayasan: settings.skYayasan || '',
    emailSekretariat: settings.emailSekretariat || '',
    alamatYayasan: settings.alamatYayasan || '',
    noWhatsapp: settings.noWhatsapp || '',
    zonaWaktu: settings.zonaWaktu || 'WIB',
    presensi: settings.presensi || {
      jamMasukDefault: '07:00',
      jamPulangDefault: '15:00',
      toleransiTerlambat: 15,
      radiusGeofenceDefault: 50,
      lokasiAktif: true,
      radiusGeofencePerUnit: {
        tk: 50,
        sd: 75,
        smp: 50,
        sma: 80,
      },
      toleransiKeterlambatanPerUnit: {
        tk: 15,
        sd: 15,
        smp: 15,
        sma: 15,
      },
    },
    rekap: settings.rekap || {
      formatNomorLaporan: 'LPR/{UNIT}/{TAHUN}/{BULAN}/{URUT:04d}',
      prefixDokumen: 'SIMPRES',
      defaultPeriodeLaporan: 'Bulanan',
    },
    notifikasi: settings.notifikasi || {
      emailAktif: true,
      whatsappAktif: true,
      approvalIzinAktif: true,
    },
    keamanan: settings.keamanan || {
      minimalPassword: 8,
      wajibGantiPasswordPertama: true,
      durasiSession: 8,
      autoLogout: 30,
    },
    penandatangan: settings.penandatangan || {
      kepalaYayasan: { nama: '', jabatan: 'Ketua Yayasan', nip: '' },
      kepalaSekolah: {
        tk: { nama: '', jabatan: 'Kepala TKIT Attin Sumbar' },
        sd: { nama: '', jabatan: 'Kepala SDIT Attin Sumbar' },
        smp: { nama: '', jabatan: 'Kepala SMPIT Attin Sumbar' },
        sma: { nama: '', jabatan: 'Kepala SMAIT Attin Sumbar' },
      },
      petugasPresensi: {
        yayasan: { nama: '', jabatan: 'Petugas Presensi Yayasan' },
        tk: { nama: '', jabatan: 'Petugas Presensi TKIT' },
        sd: { nama: '', jabatan: 'Petugas Presensi SDIT' },
        smp: { nama: '', jabatan: 'Petugas Presensi SMPIT' },
        sma: { nama: '', jabatan: 'Petugas Presensi SMAIT' },
      },
      adminTU: {
        kepalaTU: { nama: '', jabatan: 'Kepala Tata Usaha' },
        operatorSistem: { nama: '', jabatan: 'Operator Sistem' },
      },
    },
  })
  const [originalFormData, setOriginalFormData] = useState(formData)
  const [logoPreview, setLogoPreview] = useState(settings.logo || null)
  const [logoFile, setLogoFile] = useState(null)
  const [toggles, setToggles] = useState({
    gantiPassword: true,
    verifikasi2fa: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const fileInputRef = useRef(null)

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested fields like "presensi.jamMasukDefault" or "penandatangan.kepalaYayasan.nama"
      const keys = field.split('.')
      const newFormData = { ...formData }
      let current = newFormData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      setFormData(newFormData)
    } else {
      setFormData({ ...formData, [field]: value })
    }
  }

  const handleToggle = (key) => {
    setToggles({ ...toggles, [key]: !toggles[key] })
  }

  const validateLogoFile = (file) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      return 'Format file tidak didukung. Gunakan PNG, JPG, atau SVG.'
    }
    if (file.size > MAX_LOGO_SIZE) {
      return 'Ukuran file terlalu besar. Maksimal 2MB.'
    }
    return null
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateLogoFile(file)
      if (error) {
        showNotification(error, 'error')
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target.result)
        setFormData({ ...formData, logo: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const removeLogo = () => {
    setLogoPreview(null)
    setLogoFile(null)
    setFormData({ ...formData, logo: null })
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      const oldSettings = state.settings
      const payload = { ...formData, lastSaved: new Date().toISOString() }
      dispatch({ type: 'UPDATE_SETTINGS', payload })
      setIsSaving(false)
      setOriginalFormData({ ...formData })
      showNotification('Perubahan telah disimpan', 'success')
      
      const changes = Object.keys(payload).filter(key => payload[key] !== oldSettings[key])
      if (changes.length > 0) {
        addActivityLog(dispatch, state, 'Ubah', 'Pengaturan Global', 
          `Mengubah pengaturan: ${changes.join(', ')}`, null, null, state.currentUser?.unitId)
      }
    }, 500)
  }

  const handleReset = () => {
    if (confirm('Yakin ingin membatalkan perubahan dan kembali ke nilai yang terakhir disimpan?')) {
      setFormData({ ...originalFormData })
      setLogoPreview(originalFormData.logo || null)
      setLogoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showNotification('Perubahan dibatalkan, data dikembalikan ke nilai terakhir disimpan', 'info')
    }
  }

  const ToggleSwitch = ({ checked, onChange }) => (
    <div
      className={`w-10 h-5 rounded-full relative cursor-pointer shrink-0 transition ${
        checked ? 'bg-primary-container' : 'bg-surface-container-high'
      }`}
      onClick={onChange}
    >
      <div
        className={`w-4 h-4 bg-surface-container-lowest rounded-full absolute shadow-sm top-0.5 transition ${
          checked ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </div>
  )

  const NotifToast = () => {
    if (!notification) return null
    const colors = {
      success: 'bg-emerald-500',
      info: 'bg-secondary',
      error: 'bg-rose-500',
    }
    const icons = {
      success: 'check_circle',
      info: 'info',
      error: 'error',
    }
    return (
      <div className={`fixed top-4 right-4 ${colors[notification.type]} text-on-primary px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[20px]">{icons[notification.type]}</span>
        <span>{notification.message}</span>
      </div>
    )
  }

  const formatLastSaved = () => {
    if (!state.settings.lastSaved) return 'Belum pernah disimpan'
    const date = new Date(state.settings.lastSaved)
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'informasi':
        return (
          <>
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
              <div className="border-b border-outline-variant pb-4 mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Identitas & Profil Yayasan</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Pengaturan nama aplikasi, logo resmi, dan kontak sekretariat yayasan untuk sinkronisasi multi-unit.
                </p>
              </div>

              <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">
                    Nama Aplikasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                    type="text"
                    value={formData.namaAplikasi || ''}
                    onChange={(e) => handleInputChange('namaAplikasi', e.target.value)}
                  />
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">
                    Muncul di header, email notifikasi, portal unit, & mobile app.
                  </span>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Tagline / Sub-nama</label>
                  <input
                    className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                    type="text"
                    value={formData.tagline || ''}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                  />
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">
                    Deskripsi modul resmi di portal autentikasi.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Logo Resmi Aplikasi & Yayasan</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-primary-container border border-outline flex flex-col items-center justify-center text-white shrink-0 shadow-inner">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-20 h-20 rounded-xl object-cover" alt="Logo Preview" />
                    ) : (
                      <>
                        <span className="font-headline-md text-headline-md font-bold tracking-tight leading-tight text-secondary">RJ</span>
                        <span className="font-label-sm text-label-sm uppercase font-semibold tracking-widest leading-tight text-on-primary-container/60">YAYASAN</span>
                      </>
                    )}
                  </div>
                  <div
                    className="flex-1 w-full border-2 border-dashed border-outline-variant hover:border-secondary rounded-xl p-4 text-center cursor-pointer transition bg-surface-container-low"
                    onClick={handleLogoClick}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <div className="flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-[28px] text-secondary">upload</span>
                      <div className="text-left">
                        <p className="font-body-sm-medium text-body-sm-medium text-on-surface">Klik untuk unggah atau seret berkas ke sini</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Format PNG, SVG, atau JPG (Maksimal 2MB, Rasio 1:1 disarankan)
                        </p>
                      </div>
                    </div>
                  </div>
                  {logoPreview && (
                    <button
                      className="px-3 py-2 border border-outline-variant font-label-sm text-label-sm font-semibold rounded-lg text-on-surface hover:bg-surface-container transition shrink-0"
                      type="button"
                      onClick={removeLogo}
                    >
                      Hapus Logo
                    </button>
                  )}
                  {!logoPreview && (
                    <button
                      className="px-3 py-2 border border-outline-variant font-label-sm text-label-sm font-semibold rounded-lg text-on-surface hover:bg-surface-container transition shrink-0"
                      type="button"
                      onClick={handleLogoClick}
                    >
                      Ganti Logo
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">
                  Nama Yayasan / Sekolah Induk <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">domain</span>
                  </span>
                  <input
                    className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                    type="text"
                    value={formData.namaYayasan || ''}
                    onChange={(e) => handleInputChange('namaYayasan', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nomor Registrasi / SK Yayasan</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </span>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.skYayasan || ''}
                      onChange={(e) => handleInputChange('skYayasan', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Email Resmi Sekretariat</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </span>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="email"
                      value={formData.emailSekretariat || ''}
                      onChange={(e) => handleInputChange('emailSekretariat', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">
                  Alamat Yayasan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute top-2 left-0 flex items-start pl-3 pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">place</span>
                  </span>
                  <textarea
                    className="w-full font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition resize-none"
                    rows={2}
                    value={formData.alamatYayasan || ''}
                    onChange={(e) => handleInputChange('alamatYayasan', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">No. Kontak / WhatsApp Helpdesk</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">phone</span>
                    </span>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.noWhatsapp || ''}
                      onChange={(e) => handleInputChange('noWhatsapp', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Zona Waktu Default</label>
                  <select
                    className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                    value={formData.zonaWaktu || 'WIB'}
                    onChange={(e) => handleInputChange('zonaWaktu', e.target.value)}
                  >
                    <option value="WIB">WIB (Asia/Jakarta) UTC+7</option>
                    <option value="WITA">WITA (Asia/Makassar) UTC+8</option>
                    <option value="WIT">WIT (Asia/Jayapura) UTC+9</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="p-3.5 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <p className="font-body-sm-medium text-body-sm-medium text-on-surface">5 Unit Operasional Terkoneksi</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">KB-TK, SDIT RJ, SMPIT RJ, SMAIT RJ, & Pesantren Boarding</p>
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface font-label-sm text-label-sm font-semibold rounded-full hover:bg-surface-container shadow-xs transition"
                    type="button"
                    onClick={() => showNotification('Sinkronisasi dimulai...', 'info')}
                  >
                    Sinkron Otomatis
                  </button>
                </div>
              </div>
              </div>
            </div>
          </>
        )
      case 'penandatangan':
        return (
          <>
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
              <div className="border-b border-outline-variant pb-4 mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Informasi Penandatangan Dokumen</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Konfigurasi pejabat penandatangan untuk laporan presensi, izin/cuti, dan dokumen resmi yayasan.
                </p>
              </div>

              {/* 1. Ketua Yayasan */}
              <div className="space-y-4">
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">badge</span>
                  <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Ketua Yayasan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Ketua Yayasan <span className="text-rose-500">*</span></label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.kepalaYayasan?.nama || ''}
                      onChange={(e) => handleInputChange('penandatangan.kepalaYayasan.nama', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.kepalaYayasan?.jabatan || 'Ketua Yayasan'}
                      onChange={(e) => handleInputChange('penandatangan.kepalaYayasan.jabatan', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nomor Identitas (opsional)</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.kepalaYayasan?.nip || ''}
                      onChange={(e) => handleInputChange('penandatangan.kepalaYayasan.nip', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Kepala Sekolah per Unit */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">school</span>
                  <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Kepala Sekolah per Unit</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {state.units.map((unit) => (
                    <div key={unit.id} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant">
                      <p className="font-label-sm text-label-sm font-semibold text-secondary mb-3">{unit.nama}</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Kepala Sekolah</label>
                          <input
                            className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                            type="text"
                            value={formData.penandatangan?.kepalaSekolah?.[unit.id]?.nama || ''}
                            onChange={(e) => handleInputChange(`penandatangan.kepalaSekolah.${unit.id}.nama`, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                          <input
                            className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                            type="text"
                            value={formData.penandatangan?.kepalaSekolah?.[unit.id]?.jabatan || `Kepala ${unit.nama}`}
                            onChange={(e) => handleInputChange(`penandatangan.kepalaSekolah.${unit.id}.jabatan`, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nomor Identitas (opsional)</label>
                          <input
                            className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                            type="text"
                            value={formData.penandatangan?.kepalaSekolah?.[unit.id]?.nip || ''}
                            onChange={(e) => handleInputChange(`penandatangan.kepalaSekolah.${unit.id}.nip`, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Petugas Presensi */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">how_to_reg</span>
                  <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Petugas Presensi</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Yayasan */}
                  <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant lg:col-span-1">
                    <p className="font-label-sm text-label-sm font-semibold text-secondary mb-3">Yayasan Pusat</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Petugas</label>
                        <input
                          className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                          type="text"
                          value={formData.penandatangan?.petugasPresensi?.yayasan?.nama || ''}
                          onChange={(e) => handleInputChange('penandatangan.petugasPresensi.yayasan.nama', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                        <input
                          className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                          type="text"
                          value={formData.penandatangan?.petugasPresensi?.yayasan?.jabatan || 'Petugas Presensi Yayasan'}
                          onChange={(e) => handleInputChange('penandatangan.petugasPresensi.yayasan.jabatan', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Per Unit */}
                  {state.units.map((unit) => (
                    <div key={`petugas-${unit.id}`} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant">
                      <p className="font-label-sm text-label-sm font-semibold text-secondary mb-3">{unit.nama}</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Petugas</label>
                          <input
                            className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                            type="text"
                            value={formData.penandatangan?.petugasPresensi?.[unit.id]?.nama || ''}
                            onChange={(e) => handleInputChange(`penandatangan.petugasPresensi.${unit.id}.nama`, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                          <input
                            className="w-full h-10 font-body-sm text-body-sm text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                            type="text"
                            value={formData.penandatangan?.petugasPresensi?.[unit.id]?.jabatan || `Petugas Presensi ${unit.nama}`}
                            onChange={(e) => handleInputChange(`penandatangan.petugasPresensi.${unit.id}.jabatan`, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Admin / TU */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">admin_panel_settings</span>
                  <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Admin / Tata Usaha</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Kepala Tata Usaha</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.adminTU?.kepalaTU?.nama || ''}
                      onChange={(e) => handleInputChange('penandatangan.adminTU.kepalaTU.nama', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.adminTU?.kepalaTU?.jabatan || 'Kepala Tata Usaha'}
                      onChange={(e) => handleInputChange('penandatangan.adminTU.kepalaTU.jabatan', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Nama Operator Sistem</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.adminTU?.operatorSistem?.nama || ''}
                      onChange={(e) => handleInputChange('penandatangan.adminTU.operatorSistem.nama', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jabatan</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.penandatangan?.adminTU?.operatorSistem?.jabatan || 'Operator Sistem'}
                      onChange={(e) => handleInputChange('penandatangan.adminTU.operatorSistem.jabatan', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </>
        )
      case 'operasional':
        return (
          <>
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
              <div className="border-b border-outline-variant pb-4 mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Parameter Operasional</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Konfigurasi jam masuk &amp; jam pulang, aturan presensi, toleransi keterlambatan, dan radius geofence.
                </p>
              </div>

              {/* 1. Presensi */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">how_to_reg</span>
                  <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Presensi</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jam Masuk Default</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="time"
                      value={formData.presensi?.jamMasukDefault || '07:00'}
                      onChange={(e) => handleInputChange('presensi.jamMasukDefault', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Jam Pulang Default</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="time"
                      value={formData.presensi?.jamPulangDefault || '15:00'}
                      onChange={(e) => handleInputChange('presensi.jamPulangDefault', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Batas Toleransi Terlambat (menit)</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="number"
                      min="0"
                      max="120"
                      value={formData.presensi?.toleransiTerlambat || 15}
                      onChange={(e) => handleInputChange('presensi.toleransiTerlambat', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Radius Geofence Default (meter)</label>
                    <input
                      className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="number"
                      min="10"
                      max="500"
                      value={formData.presensi?.radiusGeofenceDefault || 50}
                      onChange={(e) => handleInputChange('presensi.radiusGeofenceDefault', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.presensi?.lokasiAktif !== false}
                      onChange={(e) => handleInputChange('presensi.lokasiAktif', e.target.checked)}
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface">Aktifkan Validasi Lokasi Presensi (GPS/Geofence)</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )
      case 'keamanan':
        return (
          <>
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
              <div className="border-b border-outline-variant pb-4 mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Kebijakan Keamanan</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Atur kebijakan keamanan sistem untuk melindungi akses dan data pengguna.
                </p>
              </div>

              <div className="space-y-4">
                {/* Password Policy */}
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">lock</span>
                    <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Kebijakan Password</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Wajib ganti password saat login pertama</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Untuk semua akun guru & staf baru yang dibuat admin.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Panjang Minimum Password</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Kombinasi Huruf Besar, Angka, & Simbol.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-24 h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                          type="number"
                          min="6"
                          max="32"
                          value={formData.keamanan?.minimalPassword || 8}
                          onChange={(e) => handleInputChange('keamanan.minimalPassword', parseInt(e.target.value) || 0)}
                        />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">karakter</span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Verifikasi Dua Langkah (2FA)</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Wajib untuk akun Admin Unit & Superadmin Pusat.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
                    </div>
                  </div>
                </div>

                {/* Session Policy */}
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">schedule</span>
                    <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Kebijakan Session</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Durasi Session Login (jam)</label>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-24 h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                          type="number"
                          min="1"
                          max="24"
                          value={formData.keamanan?.durasiSession || 8}
                          onChange={(e) => handleInputChange('keamanan.durasiSession', parseInt(e.target.value) || 0)}
                        />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">jam</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Auto Logout (menit tidak aktif)</label>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-24 h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                          type="number"
                          min="5"
                          max="120"
                          value={formData.keamanan?.autoLogout || 30}
                          onChange={(e) => handleInputChange('keamanan.autoLogout', parseInt(e.target.value) || 0)}
                        />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">menit</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Status */}
                <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                      </div>
                      <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Status Keamanan</h3>
                    </div>
                    <span className="font-label-sm text-label-sm uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Status: Aktif
                    </span>
                  </div>
                  <div className="py-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Wajib ganti password saat login pertama</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Untuk semua akun guru & staf baru yang dibuat admin.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Panjang Minimum Password</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Kombinasi Huruf Besar, Angka, & Simbol.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 font-label-md text-label-md font-semibold bg-surface-container-high text-on-surface rounded-lg border border-outline-variant">
                        8 Karakter
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface">Verifikasi Dua Langkah (2FA)</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          Wajib untuk akun Admin Unit & Superadmin Pusat.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      case 'default':
        return (
          <>
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
              <div className="border-b border-outline-variant pb-4 mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Default Sistem</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                  Parameter master, konfigurasi default laporan &amp; notifikasi, serta hari libur nasional.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Parameter Master */}
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">tune</span>
                    <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Parameter Master</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Radius Geofence Default (meter)</label>
                      <input
                        className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="number"
                        min="10"
                        max="500"
                        value={formData.presensi?.radiusGeofenceDefault || 50}
                        onChange={(e) => handleInputChange('presensi.radiusGeofenceDefault', parseInt(e.target.value) || 0)}
                      />
                      <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">Digunakan sebagai radius default presensi unit baru.</span>
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Toleransi Keterlambatan Default (menit)</label>
                      <input
                        className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.presensi?.toleransiTerlambat || 15}
                        onChange={(e) => handleInputChange('presensi.toleransiTerlambat', parseInt(e.target.value) || 0)}
                      />
                      <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">Batas waktu sebelum status terlambat.</span>
                    </div>
                  </div>
                </div>

                {/* 2. Konfigurasi Default */}
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">settings</span>
                    <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Konfigurasi Default</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Format Nomor Laporan</label>
                      <input
                        className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="text"
                        value={formData.rekap?.formatNomorLaporan || String('LPR/{UNIT}/{TAHUN}/{BULAN}/{URUT:04d}')}
                        onChange={(e) => handleInputChange('rekap.formatNomorLaporan', e.target.value)}
                      />
                      <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">{'Placeholder: {UNIT}, {TAHUN}, {BULAN}, {URUT:04d}'}</span>
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Prefix Dokumen</label>
                      <input
                        className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="text"
                        value={formData.rekap?.prefixDokumen || 'SIMPRES'}
                        onChange={(e) => handleInputChange('rekap.prefixDokumen', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface mb-1.5">Default Periode Laporan</label>
                      <select
                        className="w-full h-10 font-body-md text-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        value={formData.rekap?.defaultPeriodeLaporan || 'Bulanan'}
                        onChange={(e) => handleInputChange('rekap.defaultPeriodeLaporan', e.target.value)}
                      >
                        <option value="Harian">Harian</option>
                        <option value="Mingguan">Mingguan</option>
                        <option value="Bulanan">Bulanan</option>
                        <option value="Tahunan">Tahunan</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant space-y-3">
                    <p className="font-label-sm text-label-sm text-on-surface">Notifikasi Default</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.emailAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.emailAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface">Aktifkan Notifikasi Email</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.whatsappAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.whatsappAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface">Aktifkan Notifikasi WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.approvalIzinAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.approvalIzinAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface">Notifikasi Approval Izin/Cuti</span>
                    </label>
                  </div>
                </div>

                {/* 3. Hari Libur */}
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">event</span>
                      <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Hari Libur Nasional (2026)</h3>
                    </div>
                    <button
                      className="font-label-sm text-label-sm text-secondary hover:underline font-semibold"
                      type="button"
                      onClick={() => showNotification('Fitur tambah libur', 'info')}
                    >
                      + Tambah Libur
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {holidayData.map((holiday, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-surface-container-low font-body-sm text-body-sm">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{holiday.date}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[180px]">{holiday.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      default:
        return null
    }
  }

  const SideCardPenandatangan = () => (
    <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">badge</span>
          </div>
          <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Penandatangan Dokumen</h3>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Pejabat Resmi</span>
      </div>
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Ketua Yayasan</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {formData.penandatangan?.kepalaYayasan?.nama ? 'Terisi' : 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
            formData.penandatangan?.kepalaYayasan?.nama ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.penandatangan?.kepalaYayasan?.nama ? 'Lengkap' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Kepala Sekolah (4 Unit)</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length}/4 terisi
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
            Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length === 4 ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length === 4 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Petugas Presensi (Yayasan + 4 Unit)</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length}/5 terisi
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
            Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length === 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length === 5 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Admin / TU</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {(formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0)}/2 terisi
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
            (formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0) === 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {(formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0) === 2 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
      </div>
    </div>
  )

  const SideCardKeamanan = () => (
    <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[18px]">shield_lock</span>
          </div>
          <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Kebijakan Keamanan</h3>
        </div>
        <span className="font-label-sm text-label-sm uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          Status: Aktif
        </span>
      </div>
      <div className="py-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Wajib ganti password saat login pertama</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Untuk semua akun guru & staf baru yang dibuat admin.
            </p>
          </div>
          <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Panjang Minimum Password</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Kombinasi Huruf Besar, Angka, & Simbol.
            </p>
          </div>
          <span className="px-2.5 py-1 font-label-md text-label-md font-semibold bg-surface-container-high text-on-surface rounded-lg border border-outline-variant">
            {formData.keamanan?.minimalPassword || 8} Karakter
          </span>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Verifikasi Dua Langkah (2FA)</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Wajib untuk akun Admin Unit & Superadmin Pusat.
            </p>
          </div>
          <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
        </div>
      </div>
    </div>
  )

  const SideCardOperasional = () => (
    <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </div>
          <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Parameter Operasional</h3>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Konfigurasi Sistem</span>
      </div>
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Jam Masuk &amp; Jam Pulang</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {formData.presensi?.jamMasukDefault || '07:00'} - {formData.presensi?.jamPulangDefault || '15:00'}
            </p>
          </div>
          <span className="px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full bg-blue-50 text-blue-700">
            Terkonfigurasi
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Toleransi Keterlambatan</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {formData.presensi?.toleransiTerlambat || 15} menit sebelum status terlambat
            </p>
          </div>
          <span className="px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full bg-blue-50 text-blue-700">
            {formData.presensi?.toleransiTerlambat || 15} Menit
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Radius Geofence</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {formData.presensi?.radiusGeofenceDefault || 50} meter dari titik lokasi sekolah
            </p>
          </div>
          <span className="px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full bg-blue-50 text-blue-700">
            {formData.presensi?.radiusGeofenceDefault || 50} Meter
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface">Aturan Presensi</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Validasi lokasi GPS/Geofence saat absen
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
            formData.presensi?.lokasiAktif ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {formData.presensi?.lokasiAktif ? 'Lokasi Aktif' : 'Lokasi Nonaktif'}
          </span>
        </div>
      </div>
    </div>
  )

  const SideCardDefault = () => (
    <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </div>
          <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Default Sistem</h3>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Parameter Master</span>
      </div>
      <div className="py-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold tracking-wider leading-tight block">Radius Geofence</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface mt-0.5 block leading-snug">{formData.presensi?.radiusGeofenceDefault || 50} Meter</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant/60">Default presensi unit baru</span>
          </div>
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold tracking-wider leading-tight block">Toleransi Waktu</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface mt-0.5 block leading-snug">{formData.presensi?.toleransiTerlambat || 15} Menit</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant/60">Sebelum status terlambat</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface">Rekap Laporan</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Prefix: {formData.rekap?.prefixDokumen || 'SIMPRES'} | Periode: {formData.rekap?.defaultPeriodeLaporan || 'Bulanan'}
              </p>
            </div>
            <span className="px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full bg-indigo-50 text-indigo-600">
              Terkonfigurasi
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface">Notifikasi Default</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Email: {formData.notifikasi?.emailAktif ? 'Aktif' : 'Nonaktif'} | WA: {formData.notifikasi?.whatsappAktif ? 'Aktif' : 'Nonaktif'} | Approval: {formData.notifikasi?.approvalIzinAktif ? 'Aktif' : 'Nonaktif'}
              </p>
            </div>
            <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full ${
              (formData.notifikasi?.emailAktif && formData.notifikasi?.whatsappAktif) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {(formData.notifikasi?.emailAktif && formData.notifikasi?.whatsappAktif) ? 'Semua Aktif' : 'Sebagian'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface">Hari Libur Nasional (2026)</span>
            <span className="px-2 py-0.5 font-label-sm text-label-sm font-semibold rounded-full bg-surface-container-high text-on-surface-variant">
              {holidayData.length} Hari
            </span>
          </div>
          <div className="space-y-1.5">
            {holidayData.slice(0, 3).map((holiday, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-surface-container-low font-body-sm text-body-sm">
                <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{holiday.date}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[180px]">{holiday.name}</span>
              </div>
            ))}
            {holidayData.length > 3 && (
              <p className="font-label-sm text-label-sm text-on-surface-variant/60 px-2">
                +{holidayData.length - 3} hari libur lainnya
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const SideCardAplikasi = () => (
    <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">info</span>
          </div>
          <h3 className="font-body-md-medium text-body-md-medium text-on-surface">Informasi Aplikasi</h3>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Identitas Sistem</span>
      </div>
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Nama Aplikasi</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.namaAplikasi || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            formData.namaAplikasi ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.namaAplikasi ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Tagline</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.tagline || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            formData.tagline ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.tagline ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Logo Aplikasi</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {logoPreview ? 'Logo telah diunggah' : 'Memakai logo bawaan'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            logoPreview ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {logoPreview ? 'Aktif' : 'Bawaan'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Nama Yayasan</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.namaYayasan || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            formData.namaYayasan ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.namaYayasan ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Nomor Registrasi / SK</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.skYayasan || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            formData.skYayasan ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.skYayasan ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Email &amp; Kontak</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.emailSekretariat || 'Belum diisi'} {formData.noWhatsapp ? `| ${formData.noWhatsapp}` : ''}
            </p>
          </div>
          <span className={`px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full shrink-0 ${
            formData.emailSekretariat ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            {formData.emailSekretariat ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm text-on-surface">Alamat &amp; Zona Waktu</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
              {formData.zonaWaktu || 'WIB'}
            </p>
          </div>
          <span className="px-2 py-1 font-label-sm text-label-sm font-semibold rounded-full bg-blue-50 text-blue-700 shrink-0">
            {formData.zonaWaktu || 'WIB'}
          </span>
        </div>
      </div>
    </div>
  )

  const renderSidePanels = () => {
    switch (activeTab) {
      case 'informasi':
        return <SideCardAplikasi />
      case 'penandatangan':
        return <SideCardPenandatangan />
      case 'operasional':
        return <SideCardOperasional />
      case 'keamanan':
        return <SideCardKeamanan />
      case 'default':
        return <SideCardDefault />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col w-full">
      <NotifToast />
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm">
          <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="hover:text-on-surface cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-secondary font-body-sm-medium text-body-sm-medium">Pengaturan Global</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Pengaturan Global</h1>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          Konfigurasi identitas sistem, parameter keamanan yayasan, dan pengaturan default operasional untuk seluruh unit sekolah.
        </p>

        <div className="border-b border-outline-variant flex items-center gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-11 shrink-0 whitespace-nowrap border-b-2 px-1 font-body-sm-medium text-body-sm-medium flex items-center gap-2 focus:outline-none transition ${
                activeTab === tab.id
                  ? 'border-secondary text-secondary font-semibold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              <span className={tab.icon ? "material-symbols-outlined text-[18px]" : "hidden"}>{tab.icon || ''}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <form id="pengaturan-form" onSubmit={handleSave} className="space-y-6">
              {renderTabContent()}
            </form>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {renderSidePanels()}
          </div>
        </div>

        <div className="pt-5 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span>
              Terakhir disimpan oleh <strong className="text-on-surface font-semibold">{state.currentUser?.name || 'Superadmin Pusat'}</strong> pada {formatLastSaved()}
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              className="h-10 px-5 rounded-lg border border-outline-variant font-body-sm-medium text-body-sm-medium font-semibold text-on-surface hover:bg-surface-container transition shadow-xs"
              type="button"
              onClick={handleReset}
            >
              Batal / Reset
            </button>
            <button
              className="h-10 px-5 rounded-lg bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium font-semibold hover:bg-primary transition shadow-sm flex items-center justify-center gap-2"
              type="submit"
              disabled={isSaving}
              form="pengaturan-form"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">hourglass_empty</span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PengaturanGlobalPage