import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSimPres, addActivityLog } from '../store/simPresStore.jsx'
import { daftarJamKerja } from '../data/jamKerja.js'
import { loadAllAnnouncements, addAnnouncement, deleteAnnouncement } from '../services/announcementService.js'

const tabs = [
  { id: 'informasi', label: 'Informasi Aplikasi', icon: 'info' },
  { id: 'penandatangan', label: 'Informasi Penandatangan Dokumen', icon: 'badge' },
  { id: 'operasional', label: 'Parameter Operasional', icon: 'settings' },
  { id: 'keamanan', label: 'Kebijakan Keamanan', icon: 'shield_lock' },
  { id: 'default', label: 'Default Sistem', icon: 'tune' },
  { id: 'backup', label: 'Backup & Restore', icon: 'backup' },
  { id: 'pengumuman', label: 'Pengumuman', icon: 'campaign' },
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
    logoPerUnit: settings.logoPerUnit || { tk: null, sd: null, smp: null, sma: null },
    namaYayasan: settings.namaYayasan || '',
    skYayasan: settings.skYayasan || '',
    emailSekretariat: settings.emailSekretariat || '',
    alamatYayasan: settings.alamatYayasan || '',
    noWhatsapp: settings.noWhatsapp || '',
    zonaWaktu: settings.zonaWaktu || 'WIB',
    presensi: settings.presensi || {
      jamMasukDefault: '07:10',
      jamPulangDefault: '16:00',
      radiusGeofenceDefault: 50,
      lokasiAktif: true,
      radiusGeofencePerUnit: {
        tk: 50,
        sd: 75,
        smp: 50,
        sma: 80,
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
      kepalaYayasan: { nama: '', jabatan: 'Ketua Yayasan' },
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

  const handleUnitLogoUpload = (unitId, e) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateLogoFile(file)
      if (error) {
        showNotification(error, 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target.result
        setFormData((prev) => ({
          ...prev,
          logoPerUnit: {
            ...(prev.logoPerUnit || {}),
            [unitId]: dataUrl,
          },
        }))
        showNotification(`Logo unit ${unitId.toUpperCase()} berhasil diunggah`, 'success')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveUnitLogo = (unitId) => {
    setFormData((prev) => ({
      ...prev,
      logoPerUnit: {
        ...(prev.logoPerUnit || {}),
        [unitId]: null,
      },
    }))
    showNotification(`Logo unit ${unitId.toUpperCase()} dihapus (menggunakan logo yayasan)`, 'info')
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

  const backupInputRef = useRef(null)

  const handleExportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      staff: state.staff,
      units: state.units,
      leaves: state.leaves,
      settings: state.settings,
      holidays: state.holidays,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simpres-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    showNotification('Backup data berhasil diunduh', 'success')
    addActivityLog(dispatch, state, 'Ubah', 'Backup & Restore', 'Ekspor backup data sistem', null, null, state.currentUser?.unitId)
  }

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed || typeof parsed !== 'object') throw new Error('Format backup tidak valid')
        if (parsed.staff) localStorage.setItem('simpres.staff', JSON.stringify(parsed.staff))
        if (parsed.units) localStorage.setItem('simpres.units', JSON.stringify(parsed.units))
        if (parsed.leaves) localStorage.setItem('simpres.leaves', JSON.stringify(parsed.leaves))
        if (parsed.settings) localStorage.setItem('simpres.settings', JSON.stringify(parsed.settings))
        if (parsed.holidays) localStorage.setItem('simpres.holidays', JSON.stringify(parsed.holidays))
        showNotification('Backup berhasil dipulihkan. Halaman akan dimuat ulang.', 'success')
        addActivityLog(dispatch, state, 'Ubah', 'Backup & Restore', 'Impor backup data sistem', null, null, state.currentUser?.unitId)
        setTimeout(() => window.location.reload(), 1200)
      } catch (err) {
        showNotification(`Gagal memulihkan backup: ${err?.message || 'file tidak valid'}`, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementTarget, setAnnouncementTarget] = useState('all')
  const [announcementTargetUnit, setAnnouncementTargetUnit] = useState('')
  const [announcementTargetNiy, setAnnouncementTargetNiy] = useState('')
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    let mounted = true
    loadAllAnnouncements().then((list) => {
      if (mounted) setAnnouncements(list)
    })
    return () => { mounted = false }
  }, [])

  const handleAddAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      showNotification('Judul dan isi pengumuman wajib diisi', 'error')
      return
    }
    const target = announcementTarget === 'niy' ? (announcementTargetNiy.trim() || 'all') : announcementTarget
    const targetUnit = announcementTarget === 'unit' ? announcementTargetUnit : null
    const item = await addAnnouncement({
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
      author: state.currentUser?.name || 'Superadmin',
      target,
      targetUnit,
    })
    setAnnouncements((prev) => [item, ...prev.filter((a) => a.id !== item.id)])
    setAnnouncementTitle('')
    setAnnouncementBody('')
    setAnnouncementTarget('all')
    setAnnouncementTargetUnit('')
    setAnnouncementTargetNiy('')
    showNotification('Pengumuman berhasil dipublikasikan', 'success')
    addActivityLog(dispatch, state, 'Tambah', 'Pengumuman', `Mempublikasikan pengumuman: ${announcementTitle.trim()}`, null, null, state.currentUser?.unitId)
  }

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Hapus pengumuman ini?')) return
    await deleteAnnouncement(id)
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    showNotification('Pengumuman dihapus', 'info')
  }

  const ToggleSwitch = ({ checked, onChange }) => (
    <div
      className={`w-10 h-5 rounded-full relative cursor-pointer shrink-0 transition-colors border ${
        checked ? 'bg-primary border-primary' : 'bg-muted border-border'
      }`}
      onClick={onChange}
    >
      <div
        className={`w-3.5 h-3.5 bg-card rounded-full absolute shadow-xs top-0.5 transition-all ${
          checked ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </div>
  )

  const NotifToast = () => {
    if (!notification) return null
    const colors = {
      success: 'bg-card border-emerald-500/30 text-foreground',
      info: 'bg-card border-border text-foreground',
      error: 'bg-card border-destructive/30 text-foreground',
    }
    const iconColors = {
      success: 'text-emerald-600 dark:text-emerald-400',
      info: 'text-primary',
      error: 'text-destructive',
    }
    const icons = {
      success: 'check_circle',
      info: 'info',
      error: 'error',
    }
    return (
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-slide-in ${colors[notification.type]}`}>
        <span className={`material-symbols-outlined text-[18px] ${iconColors[notification.type]}`}>{icons[notification.type]}</span>
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
            <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Identitas & Profil Yayasan</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Pengaturan nama aplikasi, logo resmi, dan kontak sekretariat yayasan untuk sinkronisasi multi-unit.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Nama Aplikasi <span className="text-destructive">*</span>
                    </label>
                    <input
                      className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      type="text"
                      value={formData.namaAplikasi || ''}
                      onChange={(e) => handleInputChange('namaAplikasi', e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Muncul di header, email notifikasi, portal unit, & mobile app.
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Tagline / Sub-nama</label>
                    <input
                      className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      type="text"
                      value={formData.tagline || ''}
                      onChange={(e) => handleInputChange('tagline', e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Deskripsi modul resmi di portal autentikasi.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Logo Resmi Aplikasi & Yayasan</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-muted/80 border border-border flex flex-col items-center justify-center text-foreground shrink-0 shadow-inner">
                      {logoPreview ? (
                        <img src={logoPreview} className="w-20 h-20 rounded-xl object-cover" alt="Logo Preview" />
                      ) : (
                        <>
                          <span className="text-lg font-bold tracking-tight text-foreground">RJ</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">YAYASAN</span>
                        </>
                      )}
                    </div>
                    <div
                      className="flex-1 w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-muted/30 hover:bg-card"
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
                        <span className="material-symbols-outlined text-[28px] text-primary">upload</span>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground">Klik untuk unggah atau seret berkas ke sini</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Format PNG, SVG, atau JPG (Maksimal 2MB, Rasio 1:1 disarankan)
                          </p>
                        </div>
                      </div>
                    </div>
                    {logoPreview && (
                      <button
                        className="h-9 px-3.5 border border-border text-xs font-semibold rounded-lg text-foreground bg-card hover:bg-muted transition-colors shrink-0 shadow-xs cursor-pointer"
                        type="button"
                        onClick={removeLogo}
                      >
                        Hapus Logo
                      </button>
                    )}
                    {!logoPreview && (
                      <button
                        className="h-9 px-3.5 border border-border text-xs font-semibold rounded-lg text-foreground bg-card hover:bg-muted transition-colors shrink-0 shadow-xs cursor-pointer"
                        type="button"
                        onClick={handleLogoClick}
                      >
                        Ganti Logo
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-foreground">
                        Logo Khusus Per Unit Sekolah (TKIT, SDIT, SMPIT, SMAIT)
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        Logo masing-masing unit sekolah akan tercetak pada kop surat berkas cetak dan unduhan rekap presensi serta cuti/izin (PDF & Excel). Jika belum diunggah, sistem otomatis menggunakan logo resmi yayasan di atas.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {[
                      { id: 'tk', kode: 'UNT-TK-01', kodeSingkat: 'TKIT', nama: 'TKIT Attin Sumbar' },
                      { id: 'sd', kode: 'UNT-SD-02', kodeSingkat: 'SDIT', nama: 'SDIT Attin Sumbar' },
                      { id: 'smp', kode: 'UNT-SMP-03', kodeSingkat: 'SMPIT', nama: 'SMPIT Attin Sumbar' },
                      { id: 'sma', kode: 'UNT-SMA-04', kodeSingkat: 'SMAIT', nama: 'SMAIT Attin Sumbar' },
                    ].map((unit) => {
                      const customLogo = formData.logoPerUnit?.[unit.id]
                      const displayLogo = customLogo || formData.logo
                      return (
                        <div
                          key={unit.id}
                          className="bg-card border border-border hover:border-primary/40 rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className="text-xs font-bold text-foreground truncate">{unit.nama}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  customLogo
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {customLogo ? 'Kustom' : 'Bawaan'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-14 h-14 rounded-lg bg-muted/80 border border-border flex flex-col items-center justify-center shrink-0 overflow-hidden p-1 shadow-inner">
                                {displayLogo ? (
                                  <img
                                    src={displayLogo}
                                    alt={`Logo ${unit.nama}`}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-bold text-primary">{unit.kodeSingkat}</span>
                                    <span className="text-[7px] text-muted-foreground uppercase font-bold">ATTIN</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground truncate">{unit.kode}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {customLogo ? 'Logo unit aktif' : 'Mengikuti logo yayasan'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                            <input
                              type="file"
                              id={`upload-logo-unit-${unit.id}`}
                              accept="image/png,image/jpeg,image/svg+xml"
                              className="hidden"
                              onChange={(e) => handleUnitLogoUpload(unit.id, e)}
                            />
                            <label
                              htmlFor={`upload-logo-unit-${unit.id}`}
                              className="flex-1 text-center py-1.5 px-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs truncate"
                            >
                              {customLogo ? 'Ganti Logo' : 'Unggah Logo'}
                            </label>
                            {customLogo && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUnitLogo(unit.id)}
                                className="py-1.5 px-2 text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                                title="Hapus logo unit (kembali ke bawaan yayasan)"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nama Yayasan / Sekolah Induk <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                    </span>
                    <input
                      className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                      type="text"
                      value={formData.namaYayasan || ''}
                      onChange={(e) => handleInputChange('namaYayasan', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Nomor Registrasi / SK Yayasan</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                        <span className="material-symbols-outlined text-[18px]">description</span>
                      </span>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.skYayasan || ''}
                        onChange={(e) => handleInputChange('skYayasan', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Email Resmi Sekretariat</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="email"
                        value={formData.emailSekretariat || ''}
                        onChange={(e) => handleInputChange('emailSekretariat', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Alamat Yayasan <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute top-2 left-0 flex items-start pl-3 pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined text-[18px]">place</span>
                    </span>
                    <textarea
                      className="w-full text-xs text-foreground bg-card border border-input rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none"
                      rows={2}
                      value={formData.alamatYayasan || ''}
                      onChange={(e) => handleInputChange('alamatYayasan', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">No. Kontak / WhatsApp Helpdesk</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                        <span className="material-symbols-outlined text-[18px]">phone</span>
                      </span>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.noWhatsapp || ''}
                        onChange={(e) => handleInputChange('noWhatsapp', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Zona Waktu Default</label>
                    <select
                      className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer"
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
                  <div className="p-3.5 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">5 Unit Operasional Terkoneksi</p>
                        <p className="text-[11px] text-muted-foreground">KB-TK, SDIT RJ, SMPIT RJ, SMAIT RJ, &amp; Pesantren Boarding</p>
                      </div>
                    </div>
                    <button
                      className="h-8 px-3 bg-card border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted shadow-xs transition-colors cursor-pointer"
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
            <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Informasi Penandatangan Dokumen</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Konfigurasi pejabat penandatangan untuk laporan presensi, izin/cuti, dan dokumen resmi yayasan.
                </p>
              </div>

              {/* 1. Ketua Yayasan */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                    <h3 className="text-xs font-bold text-foreground">Ketua Yayasan</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Nama Ketua Yayasan <span className="text-destructive">*</span></label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.penandatangan?.kepalaYayasan?.nama || ''}
                        onChange={(e) => handleInputChange('penandatangan.kepalaYayasan.nama', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Jabatan</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.penandatangan?.kepalaYayasan?.jabatan || 'Ketua Yayasan'}
                        onChange={(e) => handleInputChange('penandatangan.kepalaYayasan.jabatan', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Kepala Sekolah per Unit */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">school</span>
                    <h3 className="text-xs font-bold text-foreground">Kepala Sekolah per Unit</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {state.units.map((unit) => (
                      <div key={unit.id} className="p-3.5 bg-card rounded-lg border border-border shadow-xs">
                        <p className="text-xs font-bold text-primary mb-2.5">{unit.nama}</p>
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nama Kepala Sekolah</label>
                            <input
                              className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
                              type="text"
                              value={formData.penandatangan?.kepalaSekolah?.[unit.id]?.nama || ''}
                              onChange={(e) => handleInputChange(`penandatangan.kepalaSekolah.${unit.id}.nama`, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Jabatan</label>
                            <input
                              className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
                              type="text"
                              value={formData.penandatangan?.kepalaSekolah?.[unit.id]?.jabatan || `Kepala ${unit.nama}`}
                              onChange={(e) => handleInputChange(`penandatangan.kepalaSekolah.${unit.id}.jabatan`, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Petugas Presensi */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">how_to_reg</span>
                    <h3 className="text-xs font-bold text-foreground">Petugas Presensi</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Yayasan */}
                    <div className="p-3.5 bg-card rounded-lg border border-border shadow-xs">
                      <p className="text-xs font-bold text-primary mb-2.5">Yayasan Pusat</p>
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nama Petugas</label>
                          <input
                            className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
                            type="text"
                            value={formData.penandatangan?.petugasPresensi?.yayasan?.nama || ''}
                            onChange={(e) => handleInputChange('penandatangan.petugasPresensi.yayasan.nama', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Jabatan</label>
                          <input
                            className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
                            type="text"
                            value={formData.penandatangan?.petugasPresensi?.yayasan?.jabatan || 'Petugas Presensi Yayasan'}
                            onChange={(e) => handleInputChange('penandatangan.petugasPresensi.yayasan.jabatan', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Per Unit */}
                    {state.units.map((unit) => (
                      <div key={`petugas-${unit.id}`} className="p-3.5 bg-card rounded-lg border border-border shadow-xs">
                        <p className="text-xs font-bold text-primary mb-2.5">{unit.nama}</p>
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nama Petugas</label>
                            <input
                              className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
                              type="text"
                              value={formData.penandatangan?.petugasPresensi?.[unit.id]?.nama || ''}
                              onChange={(e) => handleInputChange(`penandatangan.petugasPresensi.${unit.id}.nama`, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Jabatan</label>
                            <input
                              className="w-full h-8 text-xs text-foreground bg-muted/40 border border-input rounded-lg px-2.5 focus:outline-none focus:bg-card focus:ring-1 focus:ring-ring transition-all"
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
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">admin_panel_settings</span>
                    <h3 className="text-xs font-bold text-foreground">Admin / Tata Usaha</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Nama Kepala Tata Usaha</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.penandatangan?.adminTU?.kepalaTU?.nama || ''}
                        onChange={(e) => handleInputChange('penandatangan.adminTU.kepalaTU.nama', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Jabatan</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.penandatangan?.adminTU?.kepalaTU?.jabatan || 'Kepala Tata Usaha'}
                        onChange={(e) => handleInputChange('penandatangan.adminTU.kepalaTU.jabatan', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Nama Operator Sistem</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.penandatangan?.adminTU?.operatorSistem?.nama || ''}
                        onChange={(e) => handleInputChange('penandatangan.adminTU.operatorSistem.nama', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Jabatan</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
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
            <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Parameter Operasional</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Aturan jam kerja global SimPres, radius geofence, dan validasi lokasi presensi.
                </p>
              </div>

              {/* 1. Jam kerja global */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                    <h3 className="text-xs font-bold text-foreground">Jam Kerja Global</h3>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                          <th className="py-2.5 px-3.5">Hari</th>
                          <th className="py-2.5 px-3.5">Jam Masuk</th>
                          <th className="py-2.5 px-3.5">Jam Pulang</th>
                          <th className="py-2.5 px-3.5">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {daftarJamKerja().map((h) => (
                          <tr key={h.hari} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2 px-3.5 font-semibold text-foreground">{h.hari}</td>
                            <td className="py-2 px-3.5 text-foreground font-mono">{h.jamMasuk}</td>
                            <td className="py-2 px-3.5 text-foreground font-mono">
                              {h.jamPulang ?? 'Bebas'}
                            </td>
                            <td className="py-2 px-3.5 text-muted-foreground">
                              {h.hari === 'Jumat'
                                ? 'Tidak memiliki batas minimal jam pulang'
                                : 'Masuk tepat pada batas = Tepat Waktu'}
                            </td>
                          </tr>
                        ))}
                        <tr className="hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3.5 font-semibold text-foreground">Minggu</td>
                          <td className="py-2 px-3.5 text-muted-foreground font-mono">-</td>
                          <td className="py-2 px-3.5 text-muted-foreground font-mono">-</td>
                          <td className="py-2 px-3.5 text-muted-foreground">Bukan hari kerja</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                    Aturan ini adalah satu-satunya acuan status presensi. Keterlambatan dihitung otomatis
                    dari selisih menit antara jam masuk dan batas jam masuk hari tersebut.
                  </p>
                </div>

                {/* 2. Geofence & validasi lokasi */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">how_to_reg</span>
                    <h3 className="text-xs font-bold text-foreground">Presensi & Validasi Lokasi</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1.5">Radius Geofence Default (meter)</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="number"
                        min="10"
                        max="500"
                        value={formData.presensi?.radiusGeofenceDefault || 50}
                        onChange={(e) => handleInputChange('presensi.radiusGeofenceDefault', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center gap-4">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.presensi?.lokasiAktif !== false}
                        onChange={(e) => handleInputChange('presensi.lokasiAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring cursor-pointer accent-primary"
                      />
                      <span className="text-xs font-medium text-foreground">Aktifkan Validasi Lokasi Presensi (GPS / Geofence)</span>
                    </label>
                  </div>

                  {/* Daftar Titik Koordinat Unit Terdaftar */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Titik Koordinat & Radius Terkoneksi Per Unit
                      </span>
                      <Link
                        to="/unit-sd-islam-rj"
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_location_alt</span>
                        <span>Edit di Manajemen Unit</span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(state.units || []).map((u) => (
                        <div key={u.id} className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-primary text-[18px] shrink-0">location_on</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-foreground truncate">{u.nama}</span>
                              <span className="text-[11px] font-mono text-muted-foreground truncate">
                                {Number(u.latitude || 0).toFixed(5)}, {Number(u.longitude || 0).toFixed(5)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                            u.geofenceActive !== false ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            {u.radius || 50}m {u.geofenceActive !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      case 'keamanan':
        return (
          <>
            <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Kebijakan Keamanan</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Atur kebijakan keamanan sistem untuk melindungi akses dan data pengguna.
                </p>
              </div>

              <div className="space-y-4">
                {/* Password Policy */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
                    <h3 className="text-xs font-bold text-foreground">Kebijakan Password</h3>
                  </div>
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Wajib ganti password saat login pertama</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Untuk semua akun guru & staf baru yang dibuat admin.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Panjang Minimum Password</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Kombinasi Huruf Besar, Angka, & Simbol.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 h-8 text-xs text-center text-foreground bg-card border border-input rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          type="number"
                          min="6"
                          max="32"
                          value={formData.keamanan?.minimalPassword || 8}
                          onChange={(e) => handleInputChange('keamanan.minimalPassword', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-[11px] text-muted-foreground">karakter</span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-4 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Verifikasi Dua Langkah (2FA)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Wajib untuk akun Admin Unit & Superadmin Pusat.
                        </p>
                      </div>
                      <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
                    </div>
                  </div>
                </div>

                {/* Session Policy */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                    <h3 className="text-xs font-bold text-foreground">Kebijakan Session</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Durasi Session Login</label>
                        <p className="text-[11px] text-muted-foreground">Masa aktif token sesi</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 h-8 text-xs text-center text-foreground bg-card border border-input rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          type="number"
                          min="1"
                          max="24"
                          value={formData.keamanan?.durasiSession || 8}
                          onChange={(e) => handleInputChange('keamanan.durasiSession', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-[11px] text-muted-foreground">jam</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Auto Logout</label>
                        <p className="text-[11px] text-muted-foreground">Waktu tidak aktif sebelum logout otomatis</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 h-8 text-xs text-center text-foreground bg-card border border-input rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          type="number"
                          min="5"
                          max="120"
                          value={formData.keamanan?.autoLogout || 30}
                          onChange={(e) => handleInputChange('keamanan.autoLogout', parseInt(e.target.value) || 0)}
                        />
                        <span className="text-[11px] text-muted-foreground">menit</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Status */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[17px]">shield_lock</span>
                      </div>
                      <h3 className="text-xs font-bold text-foreground">Ringkasan Status Keamanan</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Status: Aktif
                    </span>
                  </div>
                  <div className="py-3 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Ganti Password Pertama</span>
                      <span className="font-semibold text-foreground">{toggles.gantiPassword ? 'Diwajibkan' : 'Opsional'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">Panjang Minimum</span>
                      <span className="font-semibold text-foreground">{formData.keamanan?.minimalPassword || 8} Karakter</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">Verifikasi 2-Langkah</span>
                      <span className="font-semibold text-foreground">{toggles.verifikasi2fa ? 'Diaktifkan' : 'Nonaktif'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      case 'backup':
        return (
          <div className="bg-card rounded-xl border border-border p-6 shadow-xs space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Backup & Restore Data</h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Ekspor seluruh data (pegawai, unit, pengajuan izin/cuti, pengaturan, hari libur) ke file JSON, atau pulihkan dari file backup.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Ekspor Backup (JSON)
              </button>
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-foreground text-xs font-semibold shadow-xs hover:bg-accent transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Pulihkan dari Backup
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportBackup}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Peringatan: pemulihan akan menimpa data lokal (pegawai, unit, pengajuan, pengaturan) dan memuat ulang halaman.
            </p>
          </div>
        )
      case 'pengumuman':
        return (
          <div className="bg-card rounded-xl border border-border p-6 shadow-xs space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Pengumuman ke Unit</h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Buat pengumuman yang akan tampil di beranda mobile guru/pegawai.
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Judul pengumuman"
                className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                placeholder="Isi pengumuman..."
                rows={4}
                className="w-full text-xs text-foreground bg-card border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={announcementTarget}
                  onChange={(e) => setAnnouncementTarget(e.target.value)}
                  className="h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">Massal (semua user)</option>
                  <option value="unit">Unit tertentu</option>
                  <option value="niy">Pegawai tertentu (NIY)</option>
                </select>
                {announcementTarget === 'unit' && (
                  <select
                    value={announcementTargetUnit}
                    onChange={(e) => setAnnouncementTargetUnit(e.target.value)}
                    className="h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Pilih unit</option>
                    <option value="tk">TKIT</option>
                    <option value="sd">SDIT</option>
                    <option value="smp">SMPIT</option>
                    <option value="sma">SMAIT</option>
                  </select>
                )}
                {announcementTarget === 'niy' && (
                  <input
                    type="text"
                    value={announcementTargetNiy}
                    onChange={(e) => setAnnouncementTargetNiy(e.target.value)}
                    placeholder="NIY pegawai"
                    className="h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={handleAddAnnouncement}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">campaign</span>
                Publikasikan
              </button>
            </div>
            <div className="space-y-2">
              {announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada pengumuman.</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString('id-ID')} • {a.author}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      case 'default':
        return (
          <>
            <div className="bg-card rounded-xl border border-border p-6 shadow-xs">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Default Sistem</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Parameter master, konfigurasi default laporan &amp; notifikasi, serta hari libur nasional.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Parameter Master */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                    <h3 className="text-xs font-bold text-foreground">Parameter Master</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1.5">Radius Geofence Default (meter)</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="number"
                        min="10"
                        max="500"
                        value={formData.presensi?.radiusGeofenceDefault || 50}
                        onChange={(e) => handleInputChange('presensi.radiusGeofenceDefault', parseInt(e.target.value) || 0)}
                      />
                      <span className="text-[11px] text-muted-foreground mt-1 block">Digunakan sebagai radius default presensi unit baru.</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1.5">Jam Kerja Global (read-only)</label>
                      <div className="w-full rounded-lg border border-border bg-card px-3 py-2 space-y-1">
                        {daftarJamKerja().map((h) => (
                          <p key={h.hari} className="text-xs text-foreground tabular-nums">
                            <span className="font-semibold text-foreground">{h.hari}</span>: {h.jamMasuk} - {h.jamPulang ?? 'bebas'}
                          </p>
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Diperbaiki di data/jamKerja.js — berlaku seragam untuk seluruh unit.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Konfigurasi Default */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                    <h3 className="text-xs font-bold text-foreground">Konfigurasi Default</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Format Nomor Laporan</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.rekap?.formatNomorLaporan || String('LPR/{UNIT}/{TAHUN}/{BULAN}/{URUT:04d}')}
                        onChange={(e) => handleInputChange('rekap.formatNomorLaporan', e.target.value)}
                      />
                      <span className="text-[11px] text-muted-foreground mt-1 block">{'Placeholder: {UNIT}, {TAHUN}, {BULAN}, {URUT:04d}'}</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Prefix Dokumen</label>
                      <input
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                        type="text"
                        value={formData.rekap?.prefixDokumen || 'SIMPRES'}
                        onChange={(e) => handleInputChange('rekap.prefixDokumen', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Default Periode Laporan</label>
                      <select
                        className="w-full h-9 text-xs text-foreground bg-card border border-input rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer"
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
                  <div className="mt-4 pt-3.5 border-t border-border space-y-2.5">
                    <p className="text-[11px] font-semibold text-foreground">Notifikasi Default</p>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.emailAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.emailAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-foreground">Aktifkan Notifikasi Email</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.whatsappAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.whatsappAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-foreground">Aktifkan Notifikasi WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifikasi?.approvalIzinAktif !== false}
                        onChange={(e) => handleInputChange('notifikasi.approvalIzinAktif', e.target.checked)}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-foreground">Notifikasi Approval Izin/Cuti</span>
                    </label>
                  </div>
                </div>

                {/* 3. Hari Libur */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">event</span>
                      <h3 className="text-xs font-bold text-foreground">Hari Libur Nasional (2026)</h3>
                    </div>
                    <button
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      type="button"
                      onClick={() => showNotification('Fitur tambah libur', 'info')}
                    >
                      + Tambah Libur
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {holidayData.map((holiday, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border text-xs shadow-xs">
                        <span className="font-semibold text-foreground font-mono">{holiday.date}</span>
                        <span className="text-muted-foreground truncate max-w-[240px]">{holiday.name}</span>
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
    <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <span className="material-symbols-outlined text-[17px]">badge</span>
          </div>
          <h3 className="text-xs font-bold text-foreground">Penandatangan Dokumen</h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">Pejabat Resmi</span>
      </div>
      <div className="py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Ketua Yayasan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formData.penandatangan?.kepalaYayasan?.nama ? 'Terisi' : 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            formData.penandatangan?.kepalaYayasan?.nama ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.penandatangan?.kepalaYayasan?.nama ? 'Lengkap' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Kepala Sekolah (4 Unit)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length}/4 terisi
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length === 4 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            {Object.values(formData.penandatangan?.kepalaSekolah || {}).filter(u => u.nama).length === 4 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Petugas Presensi (Yayasan + 4 Unit)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length}/5 terisi
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length === 5 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            {Object.values(formData.penandatangan?.petugasPresensi || {}).filter(u => u.nama).length === 5 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Admin / TU</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {(formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0)}/2 terisi
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            (formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0) === 2 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            {(formData.penandatangan?.adminTU?.kepalaTU?.nama ? 1 : 0) + (formData.penandatangan?.adminTU?.operatorSistem?.nama ? 1 : 0) === 2 ? 'Lengkap' : 'Sebagian'}
          </span>
        </div>
      </div>
    </div>
  )

  const SideCardKeamanan = () => (
    <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <span className="material-symbols-outlined text-[17px]">shield_lock</span>
          </div>
          <h3 className="text-xs font-bold text-foreground">Kebijakan Keamanan</h3>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Status: Aktif
        </span>
      </div>
      <div className="py-3.5 space-y-3.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground">Wajib ganti password login pertama</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Untuk semua akun guru & staf baru.
            </p>
          </div>
          <ToggleSwitch checked={toggles.gantiPassword} onChange={() => handleToggle('gantiPassword')} />
        </div>
        <div className="pt-2.5 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Panjang Minimum Password</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Kombinasi Karakter & Simbol.
            </p>
          </div>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground rounded-md border border-border">
            {formData.keamanan?.minimalPassword || 8} Karakter
          </span>
        </div>
        <div className="pt-2.5 border-t border-border flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground">Verifikasi Dua Langkah (2FA)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Wajib untuk akun Superadmin & Unit.
            </p>
          </div>
          <ToggleSwitch checked={toggles.verifikasi2fa} onChange={() => handleToggle('verifikasi2fa')} />
        </div>
      </div>
    </div>
  )

  const SideCardOperasional = () => (
    <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-[17px]">settings</span>
          </div>
          <h3 className="text-xs font-bold text-foreground">Parameter Operasional</h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">Konfigurasi Sistem</span>
      </div>
      <div className="py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Jam Kerja Global</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {daftarJamKerja().map((h) => `${h.hari} ${h.jamKerja}`).join(' • ')}
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            Fixed
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Jumat</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tidak memiliki batas minimal jam pulang
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Bebas
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Radius Geofence</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formData.presensi?.radiusGeofenceDefault || 50} meter dari titik koordinat sekolah
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            {formData.presensi?.radiusGeofenceDefault || 50} Meter
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-foreground">Aturan Presensi</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Validasi lokasi GPS/Geofence saat absen
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            formData.presensi?.lokasiAktif ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            {formData.presensi?.lokasiAktif ? 'Lokasi Aktif' : 'Lokasi Nonaktif'}
          </span>
        </div>
      </div>
    </div>
  )

  const SideCardDefault = () => (
    <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-[17px]">tune</span>
          </div>
          <h3 className="text-xs font-bold text-foreground">Default Sistem</h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">Parameter Master</span>
      </div>
      <div className="py-3.5 space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Radius Geofence</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">{formData.presensi?.radiusGeofenceDefault || 50} Meter</span>
            <span className="text-[10px] text-muted-foreground">Default unit baru</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Batas Jam Masuk</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block font-mono">
              {daftarJamKerja()[0].jamMasuk} • {daftarJamKerja()[4].jamMasuk}
            </span>
            <span className="text-[10px] text-muted-foreground">Sen-Jum • Sab</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Rekap Laporan</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Prefix: {formData.rekap?.prefixDokumen || 'SIMPRES'} | {formData.rekap?.defaultPeriodeLaporan || 'Bulanan'}
              </p>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              Terkonfigurasi
            </span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-foreground">Notifikasi Default</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Email: {formData.notifikasi?.emailAktif ? 'Aktif' : 'Off'} | WA: {formData.notifikasi?.whatsappAktif ? 'Aktif' : 'Off'}
              </p>
            </div>
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
              (formData.notifikasi?.emailAktif && formData.notifikasi?.whatsappAktif) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              {(formData.notifikasi?.emailAktif && formData.notifikasi?.whatsappAktif) ? 'Semua Aktif' : 'Sebagian'}
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Hari Libur Nasional (2026)</span>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground border border-border">
              {holidayData.length} Hari
            </span>
          </div>
          <div className="space-y-1.5">
            {holidayData.slice(0, 3).map((holiday, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border text-xs">
                <span className="font-semibold text-foreground font-mono">{holiday.date}</span>
                <span className="text-muted-foreground truncate max-w-[180px]">{holiday.name}</span>
              </div>
            ))}
            {holidayData.length > 3 && (
              <p className="text-[11px] text-muted-foreground px-1 pt-0.5">
                +{holidayData.length - 3} hari libur lainnya
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const SideCardAplikasi = () => (
    <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-[17px]">info</span>
          </div>
          <h3 className="text-xs font-bold text-foreground">Informasi Aplikasi</h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">Identitas Sistem</span>
      </div>
      <div className="py-3.5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Nama Aplikasi</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.namaAplikasi || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            formData.namaAplikasi ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.namaAplikasi ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Tagline</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.tagline || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            formData.tagline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.tagline ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Logo Aplikasi</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {logoPreview ? 'Logo telah diunggah' : 'Memakai logo bawaan'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            logoPreview ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {logoPreview ? 'Aktif' : 'Bawaan'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Logo Unit Sekolah</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Object.values(formData.logoPerUnit || {}).filter(Boolean).length} dari 4 unit kustom
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            Object.values(formData.logoPerUnit || {}).some(Boolean)
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {Object.values(formData.logoPerUnit || {}).filter(Boolean).length > 0 ? `${Object.values(formData.logoPerUnit || {}).filter(Boolean).length} Unit` : 'Bawaan'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Nama Yayasan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.namaYayasan || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            formData.namaYayasan ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.namaYayasan ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Nomor Registrasi / SK</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.skYayasan || 'Belum diisi'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            formData.skYayasan ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.skYayasan ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Email &amp; Kontak</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.emailSekretariat || 'Belum diisi'} {formData.noWhatsapp ? `| ${formData.noWhatsapp}` : ''}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${
            formData.emailSekretariat ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {formData.emailSekretariat ? 'Terisi' : 'Kosong'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Alamat &amp; Zona Waktu</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {formData.zonaWaktu || 'WIB'}
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <span className="material-symbols-outlined text-[20px] leading-none">settings</span>
              </span>
              Pengaturan Global
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Konfigurasi identitas sistem, parameter keamanan yayasan, dan pengaturan default operasional untuk seluruh unit sekolah.
            </p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-card border border-border px-3 py-1.5 rounded-lg shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[15px] text-muted-foreground">home</span>
              <span>Home</span>
              <span className="text-muted-foreground/40">/</span>
              <span>Superadmin</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-primary font-semibold">Pengaturan Global</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
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

        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
            <span>
              Terakhir disimpan oleh <strong className="text-foreground font-semibold">{state.currentUser?.name || 'Superadmin Pusat'}</strong> pada {formatLastSaved()}
            </span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              className="h-9 px-4 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs cursor-pointer"
              type="button"
              onClick={handleReset}
            >
              Batal / Reset
            </button>
            <button
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={isSaving}
              form="pengaturan-form"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">hourglass_empty</span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan Perubahan</span>
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