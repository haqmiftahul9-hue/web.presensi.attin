import { useState, useRef } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'

const tabs = [
  { id: 'informasi', label: 'Informasi Aplikasi', icon: 'info' },
  { id: 'keamanan', label: 'Kebijikan Keamanan', icon: 'shield_lock' },
  { id: 'default', label: 'Default Sistem', icon: 'tune' },
]

// Libur nasional kini hidup di satu sumber data (store/seed), bukan di halaman.

function PengaturanGlobalPage() {
  const { state, dispatch } = useSimPres()
  const settings = state.settings
  // Libur nasional dari satu sumber data (store/seed).
  const holidayData = state.holidays || []
  const [activeTab, setActiveTab] = useState('informasi')
  const [formData, setFormData] = useState(settings)
  const [logoPreview, setLogoPreview] = useState(null)
  const [toggles, setToggles] = useState({
    gantiPassword: true,
    verifikasi2fa: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const fileInputRef = useRef(null)

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleToggle = (key) => {
    setToggles({ ...toggles, [key]: !toggles[key] })
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 2000)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      // Simpan ke satu sumber data (store) agar konsisten di semua halaman.
      dispatch({ type: 'UPDATE_SETTINGS', payload: formData })
      setIsSaving(false)
      showNotification('Perubahan telah disimpan', 'success')
    }, 1000)
  }

  const handleReset = () => {
    if (confirm('Yakin ingin mereset semua pengaturan ke nilai default?')) {
      setFormData(settings)
      setLogoPreview(null)
      setToggles({ gantiPassword: true, verifikasi2fa: true })
      showNotification('Pengaturan telah direset', 'info')
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
    return (
      <div className={`fixed top-4 right-4 ${colors[notification.type]} text-on-primary px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-[20px]">check</span>
        <span>{notification.message}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      <NotifToast />
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm font-label-sm">
          <span className="hover:text-on-surface cursor-pointer transition-colors">Home</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="hover:text-on-surface cursor-pointer transition-colors">Superadmin</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-secondary font-body-sm font-body-sm-medium">Pengaturan Global</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </div>
            <h1 className="font-headline-lg font-headline-lg text-on-surface tracking-tight">Pengaturan Global</h1>
          </div>
        </div>
        <p className="font-body-md font-body-md text-on-surface-variant">
          Konfigurasi identitas sistem, parameter keamanan yayasan, dan pengaturan default operasional untuk seluruh unit sekolah.
        </p>

        <div className="border-b border-outline-variant flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 px-2 mr-6 text-sm flex items-center gap-2 focus:outline-none transition ${
                activeTab === tab.id
                  ? 'border-secondary text-secondary font-semibold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]"></span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <form id="pengaturan-form" onSubmit={handleSave} className="space-y-6">
              <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-6 shadow-sm">
                <div className="border-b border-outline-variant pb-4 mb-6">
                  <h2 className="font-headline-sm font-headline-sm text-on-surface font-semibold">Identitas & Profil Yayasan</h2>
                  <p className="font-label-sm font-label-sm text-on-surface-variant mt-0.5">
                    Pengaturan nama aplikasi, logo resmi, dan kontak sekretariat yayasan untuk sinkronisasi multi-unit.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">
                      Nama Aplikasi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.namaAplikasi || ''}
                      onChange={(e) => handleInputChange('namaAplikasi', e.target.value)}
                    />
                    <span className="font-label-xs text-[10px] text-on-surface-variant mt-1 block">
                      Muncul di header, email notifikasi, portal unit, & mobile app.
                    </span>
                  </div>
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">Tagline / Sub-nama</label>
                    <input
                      className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.tagline || ''}
                      onChange={(e) => handleInputChange('tagline', e.target.value)}
                    />
                    <span className="font-label-xs text-[10px] text-on-surface-variant mt-1 block">
                      Deskripsi modul resmi di portal autentikasi.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">Logo Resmi Aplikasi & Yayasan</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-primary-container border border-outline flex flex-col items-center justify-center text-white shrink-0 shadow-inner">
                      {logoPreview ? (
                        <img src={logoPreview} className="w-20 h-20 rounded-xl object-cover" alt="Logo Preview" />
                      ) : (
                        <>
                          <span className="font-headline-sm font-extrabold text-2xl tracking-tight text-secondary">RJ</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-on-primary-container/60">YAYASAN</span>
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
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <div className="flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-[28px] text-secondary">upload</span>
                        <div className="text-left">
                          <p className="font-body-sm font-body-sm-medium text-on-surface">Klik untuk unggah atau seret berkas ke sini</p>
                          <p className="font-label-sm font-label-sm text-on-surface-variant mt-0.5">
                            Format PNG, SVG, atau JPG (Maksimal 2MB, Rasio 1:1 disarankan)
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      className="px-3 py-2 border border-outline-variant text-xs font-semibold rounded-lg text-on-surface hover:bg-surface-container transition shrink-0"
                      type="button"
                      onClick={handleLogoClick}
                    >
                      Ganti Logo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">
                    Nama Yayasan / Sekolah Induk <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">domain</span>
                    </span>
                    <input
                      className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      type="text"
                      value={formData.namaYayasan || ''}
                      onChange={(e) => handleInputChange('namaYayasan', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">Nomor Registrasi / SK Yayasan</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                      </span>
                      <input
                        className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="text"
                        value={formData.skYayasan || ''}
                        onChange={(e) => handleInputChange('skYayasan', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">Email Resmi Sekretariat</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </span>
                      <input
                        className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="email"
                        value={formData.emailSekretariat || ''}
                        onChange={(e) => handleInputChange('emailSekretariat', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">
                    Alamat Yayasan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute top-2 left-0 flex items-start pl-3 pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">place</span>
                    </span>
                    <textarea
                      className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition resize-none"
                      rows={2}
                      value={formData.alamatYayasan || ''}
                      onChange={(e) => handleInputChange('alamatYayasan', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">No. Kontak / WhatsApp Helpdesk</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">phone</span>
                      </span>
                      <input
                        className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant pl-9 pr-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                        type="text"
                        value={formData.noWhatsapp || ''}
                        onChange={(e) => handleInputChange('noWhatsapp', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-sm font-label-sm text-on-surface mb-1.5">Zona Waktu Default</label>
                    <select
                      className="w-full font-body-md font-body-md text-on-surface rounded-lg border border-outline-variant px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-secondary transition"
                      value={formData.zonaWaktu || 'WIB'}
                      onChange={(e) => handleInputChange('zonaWaktu', e.target.value)}
                    >
                      <option value="WIB">WIB (Asia/Jakarta) UTC+7</option>
                      <option value="WITA">WITA (Asia/Makassar) UTC+8</option>
                      <option value="WIT">WIT (Asia/Jayapura) UTC+9</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3.5 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      </div>
                      <div>
                        <p className="font-body-sm font-body-sm-medium text-on-surface">5 Unit Operasional Terkoneksi</p>
                        <p className="font-label-sm font-label-sm text-on-surface-variant">KB-TK, SDIT RJ, SMPIT RJ, SMAIT RJ, & Pesantren Boarding</p>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface text-xs font-semibold rounded-full hover:bg-surface-container shadow-xs transition"
                      type="button"
                      onClick={() => showNotification('Sinkronisasi dimulai...', 'info')}
                    >
                      Sinkron Otomatis
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                  </div>
                  <h3 className="font-headline-sm font-headline-sm text-on-surface">Kebihikan Keamanan</h3>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Status: Aktif
                </span>
              </div>
              <div className="py-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-label-sm font-label-sm text-on-surface">Wajib ganti password saat login pertama</p>
                    <p className="font-label-xs text-[10px] text-on-surface-variant mt-0.5">
                      Untuk semua akun guru & staf baru yang dibuat admin.
                    </p>
                  </div>
                  <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-label-sm font-label-sm text-on-surface">Panjang Minimum Password</p>
                    <p className="font-label-xs text-[10px] text-on-surface-variant mt-0.5">
                      Kombinasi Huruf Besar, Angka, & Simbol.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold bg-surface-container-high text-on-surface rounded-lg border border-outline-variant">
                    8 Karakter
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-label-sm font-label-sm text-on-surface">Verifikasi Dua Langkah (2FA)</p>
                    <p className="font-label-xs text-[10px] text-on-surface-variant mt-0.5">
                      Wajib untuk akun Admin Unit & Superadmin Pusat.
                    </p>
                  </div>
                  <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant">
                <a
                  className="font-label-sm font-label-sm text-secondary hover:text-secondary/80 flex items-center gap-1 cursor-pointer"
                  onClick={() => setActiveTab('keamanan')}
                >
                  Buka Tab Kebihikan Keamanan
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </a>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-[12px] border border-outline-variant p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </div>
                  <h3 className="font-headline-sm font-headline-sm text-on-surface">Default Sistem</h3>
                </div>
                <span className="font-label-sm font-label-sm text-on-surface-variant">Parameter Master</span>
              </div>
              <div className="py-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                    <span className="font-label-xs text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Radius Geofence</span>
                    <span className="font-headline-sm font-headline-sm text-on-surface mt-0.5 block">50 Meter</span>
                    <span className="font-label-xs text-[10px] text-on-surface-variant/60">Default presensi unit baru</span>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                    <span className="font-label-xs text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Toleransi Waktu</span>
                    <span className="font-headline-sm font-headline-sm text-on-surface mt-0.5 block">15 Menit</span>
                    <span className="font-label-xs text-[10px] text-on-surface-variant/60">Sebelum status terlambat</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label-sm font-label-sm text-on-surface">Hari Libur Nasional Terdekat (2026)</span>
                    <button
                      className="text-xs text-secondary hover:underline font-semibold"
                      type="button"
                      onClick={() => showNotification('Fitur tambah libur', 'info')}
                    >
                      + Tambah Libur
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {holidayData.map((holiday, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-surface-container-low text-xs">
                        <span className="font-body-sm font-body-sm-medium text-on-surface">{holiday.date}</span>
                        <span className="font-label-sm font-label-sm text-on-surface-variant truncate max-w-[180px]">{holiday.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant">
                <a
                  className="font-label-sm font-label-sm text-secondary hover:text-secondary/80 flex items-center gap-1 cursor-pointer"
                  onClick={() => setActiveTab('default')}
                >
                  Buka Tab Default Sistem
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-label-sm font-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span>
              Terakhir disimpan oleh <strong className="text-on-surface font-semibold">Superadmin Pusat</strong> pada 15 Sep 2026, 14:20 WIB
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              className="px-4 py-2.5 rounded-[10px] border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container transition shadow-xs"
              type="button"
              onClick={handleReset}
            >
              Batal / Reset
            </button>
            <button
              className="px-6 py-2.5 rounded-[10px] bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition shadow-sm flex items-center justify-center gap-2"
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
